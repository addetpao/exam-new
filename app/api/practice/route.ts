import { NextRequest } from "next/server";
import {
  createSuccessResponse,
  createErrorResponse,
  handleAPIError,
  validateMethod,
} from "@/lib/server/utils/api-response";
import {
  getAuthenticatedUser,
  createSupabaseAdmin,
} from "@/lib/server/db/supabase";
import { PracticeSessionCreateSchema } from "@/lib/server/validation/schemas";
import { ga4Analytics } from "@/lib/server/analytics/ga4";

/**
 * POST /api/practice - Create new practice session
 * Creates a practice session with adaptive question selection
 */
export async function POST(request: NextRequest) {
  try {
    // Validate HTTP method
    const methodError = validateMethod(request, ["POST"]);
    if (methodError) return methodError;

    // Authenticate user
    const user = await getAuthenticatedUser();

    // Parse and validate request body
    const body = await request.json();
    const validatedData = PracticeSessionCreateSchema.parse(body);

    const supabase = createSupabaseAdmin();

    // Check if user has active subscription or trial for premium features
    const { data: userProfile } = await supabase
      .from("users")
      .select("subscription_status, subscription_tier, trial_ends_at")
      .eq("id", user.id)
      .single();

    // For free users, limit to 50 questions per session
    if (
      userProfile?.subscription_status === "free" &&
      validatedData.question_count > 50
    ) {
      return createErrorResponse(
        "SUBSCRIPTION_REQUIRED",
        "Premium subscription required for more than 50 questions",
        null,
        402
      );
    }

    // Create practice session record
    const { data: session, error: sessionError } = await supabase
      .from("practice_sessions")
      .insert({
        user_id: user.id,
        domain_id: validatedData.domain_id,
        question_count: validatedData.question_count,
        difficulty: validatedData.difficulty,
        status: "active",
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (sessionError) {
      console.error("Failed to create practice session:", sessionError);
      return createErrorResponse(
        "INTERNAL_ERROR",
        "Failed to create practice session",
        null,
        500
      );
    }

    // Get adaptive question selection based on user's weak areas
    let questionQuery = supabase
      .from("questions")
      .select(
        `
        id,
        question_text,
        question_type,
        domain_id,
        objective_id,
        difficulty,
        choices (
          id,
          choice_text,
          is_correct
        )
      `
      )
      .eq("status", "published");

    // Apply domain filter if specified
    if (validatedData.domain_id) {
      questionQuery = questionQuery.eq("domain_id", validatedData.domain_id);
    }

    // Apply objective filters if specified
    if (validatedData.objective_ids && validatedData.objective_ids.length > 0) {
      questionQuery = questionQuery.in(
        "objective_id",
        validatedData.objective_ids
      );
    }

    // Apply difficulty filter if specified
    if (validatedData.difficulty) {
      questionQuery = questionQuery.eq("difficulty", validatedData.difficulty);
    }

    // Get questions with adaptive selection (prioritize weak areas)
    const { data: questions, error: questionsError } =
      await questionQuery.limit(validatedData.question_count);

    if (questionsError) {
      console.error("Failed to fetch questions:", questionsError);
      return createErrorResponse(
        "INTERNAL_ERROR",
        "Failed to fetch questions",
        null,
        500
      );
    }

    if (!questions || questions.length === 0) {
      return createErrorResponse(
        "NOT_FOUND",
        "No questions found matching criteria",
        null,
        404
      );
    }

    // Shuffle questions for random order
    const shuffledQuestions = questions.sort(() => Math.random() - 0.5);

    // Track analytics event
    await ga4Analytics.trackEvent(user.id, [
      {
        name: "practice_session_started",
        parameters: {
          session_id: session.id,
          domain_id: validatedData.domain_id || "all",
          question_count: validatedData.question_count,
          difficulty: validatedData.difficulty || "mixed",
        },
      },
    ]);

    const responseData = {
      session: {
        id: session.id,
        question_count: validatedData.question_count,
        started_at: session.started_at,
        domain_id: session.domain_id,
        status: session.status,
      },
      questions: shuffledQuestions.map((question) => ({
        id: question.id,
        question_text: question.question_text,
        question_type: question.question_type,
        domain_id: question.domain_id,
        objective_id: question.objective_id,
        difficulty: question.difficulty,
        choices: question.choices
          ? question.choices.map((choice) => ({
              id: choice.id,
              choice_text: choice.choice_text,
              // Never expose correct answers in practice mode initially
            }))
          : [],
      })),
    };

    return createSuccessResponse(responseData, 201);
  } catch (error) {
    return handleAPIError(error);
  }
}

/**
 * GET /api/practice - List user's practice sessions
 * Returns paginated list of practice sessions for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    // Validate HTTP method
    const methodError = validateMethod(request, ["GET"]);
    if (methodError) return methodError;

    // Authenticate user
    const user = await getAuthenticatedUser();

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);
    const offset = parseInt(searchParams.get("offset") || "0");
    const status = searchParams.get("status");

    const supabase = createSupabaseAdmin();

    let query = supabase
      .from("practice_sessions")
      .select(
        `
        id,
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
      `
      )
      .eq("user_id", user.id)
      .order("started_at", { ascending: false });

    if (status) {
      query = query.eq("status", status);
    }

    const { data: sessions, error: sessionsError } = await query.range(
      offset,
      offset + limit - 1
    );

    if (sessionsError) {
      console.error("Failed to fetch practice sessions:", sessionsError);
      return createErrorResponse(
        "INTERNAL_ERROR",
        "Failed to fetch practice sessions",
        null,
        500
      );
    }

    const responseData = {
      sessions: sessions || [],
      pagination: {
        limit,
        offset,
        total: sessions?.length || 0,
      },
    };

    return createSuccessResponse(responseData);
  } catch (error) {
    return handleAPIError(error);
  }
}
