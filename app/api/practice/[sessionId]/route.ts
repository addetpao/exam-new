import { NextRequest } from "next/server";
import { createSuccessResponse, createErrorResponse, handleAPIError, validateMethod } from "@/lib/server/utils/api-response";
import { getAuthenticatedUser, createSupabaseAdmin } from "@/lib/server/db/supabase";
import { PracticeQuestionResponseSchema } from "@/lib/server/validation/schemas";
import { ga4Analytics } from "@/lib/server/analytics/ga4";

/**
 * GET /api/practice/[sessionId] - Get practice session details
 */
export async function GET(request: NextRequest, { params }: { params: { sessionId: string } }) {
  try {
    const methodError = validateMethod(request, ["GET"]);
    if (methodError) return methodError;

    const user = await getAuthenticatedUser();
    const { sessionId } = params;

    const supabase = createSupabaseAdmin();

    // Get session details
    const { data: session, error: sessionError } = await supabase
      .from("practice_sessions")
      .select(`
        id,
        user_id,
        domain_id,
        question_count,
        correct_answers,
        total_time,
        status,
        started_at,
        completed_at,
        domains (
          name,
          code
        )
      `)
      .eq("id", sessionId)
      .eq("user_id", user.id)
      .single();

    if (sessionError || !session) {
      return createErrorResponse("NOT_FOUND", "Practice session not found", null, 404);
    }

    // If session is completed, include question details with correct answers
    let questions = null;
    if (session.status === "completed") {
      const { data: sessionQuestions } = await supabase
        .from("practice_session_questions")
        .select(`
          question_id,
          selected_choice_id,
          is_correct,
          time_spent,
          questions (
            id,
            question_text,
            explanation,
            choices (
              id,
              choice_text,
              is_correct,
              explanation
            )
          )
        `)
        .eq("session_id", sessionId)
        .order("created_at");

      questions = sessionQuestions;
    }

    const responseData = {
      session: {
        id: session.id,
        domain_id: session.domain_id,
        domain: session.domains,
        question_count: session.question_count,
        correct_answers: session.correct_answers,
        total_time: session.total_time,
        status: session.status,
        started_at: session.started_at,
        completed_at: session.completed_at,
        accuracy: session.correct_answers && session.question_count 
          ? (session.correct_answers / session.question_count) * 100 
          : null,
      },
      questions,
    };

    return createSuccessResponse(responseData);

  } catch (error) {
    return handleAPIError(error);
  }
}

/**
 * PUT /api/practice/[sessionId] - Submit practice session response
 */
export async function PUT(request: NextRequest, { params }: { params: { sessionId: string } }) {
  try {
    const methodError = validateMethod(request, ["PUT"]);
    if (methodError) return methodError;

    const user = await getAuthenticatedUser();
    const { sessionId } = params;

    // Parse and validate request body
    const body = await request.json();
    const { action } = body;

    const supabase = createSupabaseAdmin();

    // Get session details
    const { data: session, error: sessionError } = await supabase
      .from("practice_sessions")
      .select("*")
      .eq("id", sessionId)
      .eq("user_id", user.id)
      .single();

    if (sessionError || !session) {
      return createErrorResponse("NOT_FOUND", "Practice session not found", null, 404);
    }

    if (session.status === "completed") {
      return createErrorResponse("BAD_REQUEST", "Session already completed", null, 400);
    }

    if (action === "submit_answer") {
      // Submit individual question response
      const responseData = PracticeQuestionResponseSchema.parse(body);
      
      // Record the response
      const { error: responseError } = await supabase
        .from("practice_session_questions")
        .insert({
          session_id: sessionId,
          question_id: body.question_id,
          selected_choice_id: responseData.selected_choice_id,
          time_spent: responseData.time_spent,
          created_at: new Date().toISOString(),
        });

      if (responseError) {
        console.error("Failed to record question response:", responseError);
        return createErrorResponse("INTERNAL_ERROR", "Failed to record response", null, 500);
      }

      return createSuccessResponse({ success: true, message: "Response recorded" });

    } else if (action === "complete_session") {
      // Complete the practice session
      const completedAt = new Date().toISOString();
      const totalTime = Math.floor((new Date(completedAt).getTime() - new Date(session.started_at).getTime()) / 1000);

      // Calculate score
      const { data: responses, error: responsesError } = await supabase
        .from("practice_session_questions")
        .select(`
          selected_choice_id,
          choices!inner (
            is_correct
          )
        `)
        .eq("session_id", sessionId);

      if (responsesError) {
        console.error("Failed to calculate session score:", responsesError);
        return createErrorResponse("INTERNAL_ERROR", "Failed to calculate score", null, 500);
      }

      const correctAnswers = responses?.filter(r => 
        r.choices.some((c: any) => c.is_correct)
      ).length || 0;

      // Update session as completed
      const { error: updateError } = await supabase
        .from("practice_sessions")
        .update({
          status: "completed",
          completed_at: completedAt,
          total_time: totalTime,
          correct_answers: correctAnswers,
        })
        .eq("id", sessionId);

      if (updateError) {
        console.error("Failed to update session:", updateError);
        return createErrorResponse("INTERNAL_ERROR", "Failed to complete session", null, 500);
      }

      // Track analytics
      await ga4Analytics.trackPracticeSession(user.id, {
        session_id: sessionId,
        domain: session.domain_id || "mixed",
        questions_count: session.question_count,
        correct_answers: correctAnswers,
        session_duration: totalTime,
      });

      return createSuccessResponse({
        session_id: sessionId,
        correct_answers: correctAnswers,
        total_questions: session.question_count,
        accuracy: (correctAnswers / session.question_count) * 100,
        total_time: totalTime,
        completed_at: completedAt,
      });
    }

    return createErrorResponse("BAD_REQUEST", "Invalid action", null, 400);

  } catch (error) {
    return handleAPIError(error);
  }
}

/**
 * DELETE /api/practice/[sessionId] - Cancel/delete practice session
 */
export async function DELETE(request: NextRequest, { params }: { params: { sessionId: string } }) {
  try {
    const methodError = validateMethod(request, ["DELETE"]);
    if (methodError) return methodError;

    const user = await getAuthenticatedUser();
    const { sessionId } = params;

    const supabase = createSupabaseAdmin();

    // Verify session ownership
    const { data: session, error: sessionError } = await supabase
      .from("practice_sessions")
      .select("id, user_id, status")
      .eq("id", sessionId)
      .eq("user_id", user.id)
      .single();

    if (sessionError || !session) {
      return createErrorResponse("NOT_FOUND", "Practice session not found", null, 404);
    }

    if (session.status === "completed") {
      return createErrorResponse("BAD_REQUEST", "Cannot delete completed session", null, 400);
    }

    // Delete session and related data
    const { error: deleteError } = await supabase
      .from("practice_sessions")
      .delete()
      .eq("id", sessionId);

    if (deleteError) {
      console.error("Failed to delete session:", deleteError);
      return createErrorResponse("INTERNAL_ERROR", "Failed to delete session", null, 500);
    }

    return createSuccessResponse({ success: true, message: "Session deleted" });

  } catch (error) {
    return handleAPIError(error);
  }
}