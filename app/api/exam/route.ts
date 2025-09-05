import { NextRequest } from "next/server";
import { createSuccessResponse, createErrorResponse, handleAPIError, validateMethod } from "@/lib/server/utils/api-response";
import { getAuthenticatedUser, createSupabaseAdmin } from "@/lib/server/db/supabase";
import { ExamSessionCreateSchema } from "@/lib/server/validation/schemas";
import { ga4Analytics } from "@/lib/server/analytics/ga4";

/**
 * CompTIA A+ exam domain weights and question distribution
 */
const EXAM_CONFIG = {
  "1101": {
    name: "CompTIA A+ Core 1 (220-1101)",
    domains: {
      "mobile_devices": { weight: 0.15, min_questions: 13, max_questions: 18 },
      "networking": { weight: 0.20, min_questions: 18, max_questions: 22 },
      "hardware": { weight: 0.25, min_questions: 23, max_questions: 27 },
      "virtualization_cloud": { weight: 0.11, min_questions: 10, max_questions: 12 },
      "hardware_network_troubleshooting": { weight: 0.29, min_questions: 26, max_questions: 30 }
    },
    total_questions: 90,
    passing_score: 675,
    time_limit: 90 * 60, // 90 minutes in seconds
  },
  "1102": {
    name: "CompTIA A+ Core 2 (220-1102)",
    domains: {
      "operating_systems": { weight: 0.31, min_questions: 28, max_questions: 34 },
      "security": { weight: 0.25, min_questions: 23, max_questions: 27 },
      "software_troubleshooting": { weight: 0.22, min_questions: 20, max_questions: 24 },
      "operational_procedures": { weight: 0.22, min_questions: 20, max_questions: 24 }
    },
    total_questions: 90,
    passing_score: 700,
    time_limit: 90 * 60, // 90 minutes in seconds
  }
};

/**
 * POST /api/exam - Create new exam session
 * Creates an exam session with domain-weighted question selection
 */
export async function POST(request: NextRequest) {
  try {
    const methodError = validateMethod(request, ["POST"]);
    if (methodError) return methodError;

    const user = await getAuthenticatedUser();
    
    const body = await request.json();
    const validatedData = ExamSessionCreateSchema.parse(body);

    const supabase = createSupabaseAdmin();

    // Check user subscription - exam mode requires premium
    const { data: userProfile } = await supabase
      .from("users")
      .select("subscription_status, subscription_tier, trial_ends_at")
      .eq("id", user.id)
      .single();

    // Check if user has access to exam mode
    const hasExamAccess = userProfile?.subscription_status === "premium" || 
      userProfile?.subscription_status === "trial" || 
      userProfile?.role === "admin";

    if (!hasExamAccess) {
      return createErrorResponse(
        "SUBSCRIPTION_REQUIRED", 
        "Premium subscription required for exam mode",
        null,
        402
      );
    }

    // Check exam attempt limits per subscription tier
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

    const { data: recentAttempts } = await supabase
      .from("exam_sessions")
      .select("id")
      .eq("user_id", user.id)
      .eq("exam_type", validatedData.exam_type)
      .gte("started_at", currentMonth.toISOString());

    const attemptCount = recentAttempts?.length || 0;
    const maxAttempts = userProfile?.subscription_tier === "premium" ? 30 : 5;

    if (attemptCount >= maxAttempts) {
      return createErrorResponse(
        "ATTEMPT_LIMIT_REACHED",
        `Monthly exam attempt limit reached (${maxAttempts} attempts per month)`,
        null,
        429
      );
    }

    const examConfig = EXAM_CONFIG[validatedData.exam_type as keyof typeof EXAM_CONFIG];
    if (!examConfig) {
      return createErrorResponse("BAD_REQUEST", "Invalid exam type", null, 400);
    }

    // Create exam session
    const { data: session, error: sessionError } = await supabase
      .from("exam_sessions")
      .insert({
        user_id: user.id,
        exam_type: validatedData.exam_type,
        status: "active",
        started_at: new Date().toISOString(),
        time_limit: examConfig.time_limit,
        total_questions: examConfig.total_questions,
        passing_score: examConfig.passing_score,
      })
      .select()
      .single();

    if (sessionError) {
      console.error("Failed to create exam session:", sessionError);
      return createErrorResponse("INTERNAL_ERROR", "Failed to create exam session", null, 500);
    }

    // Get domain-weighted question distribution
    const selectedQuestions: any[] = [];
    
    for (const [domainCode, config] of Object.entries(examConfig.domains)) {
      // Get domain ID
      const { data: domain } = await supabase
        .from("domains")
        .select("id")
        .eq("code", domainCode)
        .eq("exam_type", validatedData.exam_type)
        .single();

      if (!domain) continue;

      // Calculate question count for this domain
      const questionCount = Math.floor(
        examConfig.total_questions * config.weight
      );

      // Get questions for this domain
      const { data: domainQuestions } = await supabase
        .from("questions")
        .select(`
          id,
          question_text,
          question_type,
          domain_id,
          objective_id,
          difficulty,
          pbq_config,
          choices (
            id,
            choice_text
          )
        `)
        .eq("domain_id", domain.id)
        .eq("status", "published")
        .limit(questionCount * 2); // Get extra for randomization

      if (domainQuestions && domainQuestions.length > 0) {
        // Shuffle and select required number of questions
        const shuffled = domainQuestions.sort(() => Math.random() - 0.5);
        selectedQuestions.push(...shuffled.slice(0, questionCount));
      }
    }

    // Fill remaining slots if needed
    const remainingSlots = examConfig.total_questions - selectedQuestions.length;
    if (remainingSlots > 0) {
      const { data: additionalQuestions } = await supabase
        .from("questions")
        .select(`
          id,
          question_text,
          question_type,
          domain_id,
          objective_id,
          difficulty,
          pbq_config,
          choices (
            id,
            choice_text
          )
        `)
        .eq("exam_type", validatedData.exam_type)
        .eq("status", "published")
        .not("id", "in", `(${selectedQuestions.map(q => q.id).join(",")})`)
        .limit(remainingSlots);

      if (additionalQuestions) {
        selectedQuestions.push(...additionalQuestions.slice(0, remainingSlots));
      }
    }

    // Final shuffle for random question order
    const finalQuestions = selectedQuestions.sort(() => Math.random() - 0.5);

    // Store question order for session
    const { error: questionsError } = await supabase
      .from("exam_session_questions")
      .insert(
        finalQuestions.map((question, index) => ({
          session_id: session.id,
          question_id: question.id,
          question_order: index + 1,
        }))
      );

    if (questionsError) {
      console.error("Failed to store exam questions:", questionsError);
      return createErrorResponse("INTERNAL_ERROR", "Failed to prepare exam questions", null, 500);
    }

    // Track analytics
    await ga4Analytics.trackEvent(user.id, [{
      name: "exam_session_started",
      parameters: {
        session_id: session.id,
        exam_type: validatedData.exam_type,
        total_questions: examConfig.total_questions,
        time_limit_minutes: examConfig.time_limit / 60,
      }
    }]);

    const responseData = {
      session: {
        id: session.id,
        exam_type: validatedData.exam_type,
        exam_name: examConfig.name,
        total_questions: examConfig.total_questions,
        time_limit: examConfig.time_limit,
        passing_score: examConfig.passing_score,
        started_at: session.started_at,
        status: session.status,
      },
      // Return first question only - subsequent questions fetched individually
      current_question: finalQuestions[0] ? {
        id: finalQuestions[0].id,
        question_number: 1,
        question_text: finalQuestions[0].question_text,
        question_type: finalQuestions[0].question_type,
        domain_id: finalQuestions[0].domain_id,
        objective_id: finalQuestions[0].objective_id,
        pbq_config: finalQuestions[0].pbq_config,
        choices: finalQuestions[0].choices?.map((choice: any) => ({
          id: choice.id,
          choice_text: choice.choice_text,
        })) || [],
      } : null,
    };

    return createSuccessResponse(responseData, 201);

  } catch (error) {
    return handleAPIError(error);
  }
}

/**
 * GET /api/exam - List user's exam sessions
 */
export async function GET(request: NextRequest) {
  try {
    const methodError = validateMethod(request, ["GET"]);
    if (methodError) return methodError;

    const user = await getAuthenticatedUser();
    
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);
    const offset = parseInt(searchParams.get("offset") || "0");
    const status = searchParams.get("status");
    const examType = searchParams.get("exam_type");

    const supabase = createSupabaseAdmin();

    let query = supabase
      .from("exam_sessions")
      .select(`
        id,
        exam_type,
        status,
        score,
        passed,
        total_questions,
        correct_answers,
        started_at,
        completed_at,
        time_limit,
        passing_score
      `)
      .eq("user_id", user.id)
      .order("started_at", { ascending: false });

    if (status) {
      query = query.eq("status", status);
    }

    if (examType) {
      query = query.eq("exam_type", examType);
    }

    const { data: sessions, error: sessionsError } = await query
      .range(offset, offset + limit - 1);

    if (sessionsError) {
      console.error("Failed to fetch exam sessions:", sessionsError);
      return createErrorResponse("INTERNAL_ERROR", "Failed to fetch exam sessions", null, 500);
    }

    const responseData = {
      sessions: sessions?.map(session => ({
        ...session,
        exam_name: EXAM_CONFIG[session.exam_type as keyof typeof EXAM_CONFIG]?.name,
      })) || [],
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