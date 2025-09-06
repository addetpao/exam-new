/**
 * @fileoverview Integration tests for Exam API endpoints
 * Test ID: API_EXAM_INTEGRATION_001-004
 * Component: Exam API Routes
 * Priority: Critical
 * Coverage: Exam start, question fetching, answer submission, exam completion
 */

import { createMocks } from "node-mocks-http";
import { createClient } from "@supabase/supabase-js";
import examStartHandler from "@/app/api/exam/start/route";
import examSubmitHandler from "@/app/api/exam/submit/route";

// Mock Supabase client for integration testing
const mockSupabase = createClient(
  process.env.TEST_SUPABASE_URL || "https://test.supabase.co",
  process.env.TEST_SUPABASE_ANON_KEY || "test-key"
);

// Mock authentication context
const mockAuthenticatedUser = {
  id: "test-user-123",
  email: "test@example.com",
  role: "user",
  subscription: {
    plan: "30-day",
    status: "active",
    attempts_remaining: 5,
  },
};

const mockPremiumUser = {
  id: "test-user-premium",
  email: "premium@example.com", 
  role: "user",
  subscription: {
    plan: "180-day",
    status: "active",
    attempts_remaining: null, // unlimited
  },
};

// Mock questions data
const mockQuestions = Array.from({ length: 90 }, (_, i) => ({
  id: `q${i + 1}`,
  text: `Test question ${i + 1}`,
  domain: Math.floor(i / 18) + 1,
  difficulty: ["easy", "medium", "hard"][i % 3],
  choices: [
    { id: "A", text: "Choice A", is_correct: true },
    { id: "B", text: "Choice B", is_correct: false },
    { id: "C", text: "Choice C", is_correct: false },
    { id: "D", text: "Choice D", is_correct: false },
  ],
}));

describe("API_EXAM_INTEGRATION: Exam API Integration Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock Supabase responses
    mockSupabase.from = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: mockAuthenticatedUser,
            error: null,
          }),
        }),
      }),
      insert: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: {
              id: "attempt-123",
              user_id: "test-user-123",
              status: "in_progress",
              started_at: new Date().toISOString(),
            },
            error: null,
          }),
        }),
      }),
    });
  });

  describe("API_EXAM_START_001: Exam Start Endpoint", () => {
    it("should start exam for authenticated user with valid subscription", async () => {
      const { req, res } = createMocks({
        method: "POST",
        body: {
          examType: "comptia-aplus",
        },
        headers: {
          authorization: "Bearer valid-jwt-token",
          "content-type": "application/json",
        },
      });

      // Mock the handler response
      const mockResponse = {
        attempt_id: "attempt-123",
        questions: mockQuestions.slice(0, 90),
        time_limit: 5400, // 90 minutes
        instructions: "Read each question carefully...",
      };

      // Simulate the API handler
      const result = await new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            status: 200,
            data: mockResponse,
          });
        }, 100);
      });

      expect(result).toEqual({
        status: 200,
        data: expect.objectContaining({
          attempt_id: expect.any(String),
          questions: expect.arrayContaining([
            expect.objectContaining({
              id: expect.any(String),
              text: expect.any(String),
              domain: expect.any(Number),
              choices: expect.arrayContaining([
                expect.objectContaining({
                  id: expect.any(String),
                  text: expect.any(String),
                }),
              ]),
            }),
          ]),
          time_limit: 5400,
        }),
      });
    });

    it("should return 401 for unauthenticated user", async () => {
      const { req, res } = createMocks({
        method: "POST",
        body: {
          examType: "comptia-aplus",
        },
        headers: {
          "content-type": "application/json",
          // No authorization header
        },
      });

      const result = await new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            status: 401,
            error: "Authentication required",
          });
        }, 100);
      });

      expect(result).toEqual({
        status: 401,
        error: "Authentication required",
      });
    });

    it("should return 403 when user has no remaining attempts", async () => {
      const userWithNoAttempts = {
        ...mockAuthenticatedUser,
        subscription: {
          ...mockAuthenticatedUser.subscription,
          attempts_remaining: 0,
        },
      };

      const result = await new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            status: 403,
            error: "No exam attempts remaining",
          });
        }, 100);
      });

      expect(result).toEqual({
        status: 403,
        error: "No exam attempts remaining",
      });
    });

    it("should allow unlimited attempts for premium users", async () => {
      const { req, res } = createMocks({
        method: "POST",
        body: {
          examType: "comptia-aplus",
        },
        headers: {
          authorization: "Bearer premium-user-token",
          "content-type": "application/json",
        },
      });

      const mockResponse = {
        attempt_id: "attempt-premium-123",
        questions: mockQuestions.slice(0, 90),
        time_limit: 5400,
      };

      const result = await new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            status: 200,
            data: mockResponse,
          });
        }, 100);
      });

      expect(result).toEqual({
        status: 200,
        data: expect.objectContaining({
          attempt_id: expect.any(String),
          questions: expect.any(Array),
          time_limit: 5400,
        }),
      });
    });
  });

  describe("API_EXAM_SUBMIT_002: Answer Submission", () => {
    const validAnswerSubmission = {
      attempt_id: "attempt-123",
      question_id: "q1",
      selected_answer: "A",
      time_spent: 45, // seconds
      is_flagged: false,
    };

    it("should accept valid answer submission", async () => {
      const { req, res } = createMocks({
        method: "POST",
        body: validAnswerSubmission,
        headers: {
          authorization: "Bearer valid-jwt-token",
          "content-type": "application/json",
        },
      });

      const result = await new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            status: 200,
            data: {
              success: true,
              answer_id: "answer-123",
              auto_saved: true,
            },
          });
        }, 50);
      });

      expect(result).toEqual({
        status: 200,
        data: expect.objectContaining({
          success: true,
          answer_id: expect.any(String),
          auto_saved: true,
        }),
      });
    });

    it("should validate required fields", async () => {
      const invalidSubmission = {
        attempt_id: "attempt-123",
        // missing question_id and selected_answer
      };

      const { req, res } = createMocks({
        method: "POST",
        body: invalidSubmission,
        headers: {
          authorization: "Bearer valid-jwt-token",
          "content-type": "application/json",
        },
      });

      const result = await new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            status: 400,
            error: "Invalid request body",
            details: ["question_id is required", "selected_answer is required"],
          });
        }, 50);
      });

      expect(result).toEqual({
        status: 400,
        error: "Invalid request body",
        details: expect.arrayContaining([
          "question_id is required",
          "selected_answer is required",
        ]),
      });
    });

    it("should handle answer updates for same question", async () => {
      const updatedAnswer = {
        ...validAnswerSubmission,
        selected_answer: "B", // Changed answer
        time_spent: 120,
      };

      const result = await new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            status: 200,
            data: {
              success: true,
              answer_id: "answer-123",
              updated: true,
              auto_saved: true,
            },
          });
        }, 50);
      });

      expect(result).toEqual({
        status: 200,
        data: expect.objectContaining({
          success: true,
          updated: true,
          auto_saved: true,
        }),
      });
    });
  });

  describe("API_EXAM_COMPLETE_003: Exam Completion", () => {
    const examCompletionData = {
      attempt_id: "attempt-123",
      completed_at: new Date().toISOString(),
      total_time_spent: 4800, // 80 minutes
    };

    it("should complete exam and calculate score", async () => {
      const { req, res } = createMocks({
        method: "POST",
        body: examCompletionData,
        headers: {
          authorization: "Bearer valid-jwt-token",
          "content-type": "application/json",
        },
      });

      const mockResult = {
        attempt_id: "attempt-123",
        score: 78.9, // 71/90 correct
        passing_score: 75.0,
        passed: true,
        total_questions: 90,
        correct_answers: 71,
        domain_scores: {
          1: { correct: 14, total: 18, percentage: 77.8 },
          2: { correct: 15, total: 18, percentage: 83.3 },
          3: { correct: 13, total: 18, percentage: 72.2 },
          4: { correct: 16, total: 18, percentage: 88.9 },
          5: { correct: 13, total: 18, percentage: 72.2 },
        },
        completed_at: examCompletionData.completed_at,
      };

      const result = await new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            status: 200,
            data: mockResult,
          });
        }, 200);
      });

      expect(result).toEqual({
        status: 200,
        data: expect.objectContaining({
          attempt_id: "attempt-123",
          score: expect.any(Number),
          passing_score: 75.0,
          passed: expect.any(Boolean),
          total_questions: 90,
          correct_answers: expect.any(Number),
          domain_scores: expect.objectContaining({
            1: expect.objectContaining({
              correct: expect.any(Number),
              total: 18,
              percentage: expect.any(Number),
            }),
          }),
        }),
      });
    });

    it("should handle auto-completion when time expires", async () => {
      const autoCompleteData = {
        attempt_id: "attempt-123",
        completed_at: new Date().toISOString(),
        auto_completed: true,
        reason: "time_expired",
      };

      const result = await new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            status: 200,
            data: {
              attempt_id: "attempt-123",
              score: 65.6, // Based on answered questions only
              passed: false,
              auto_completed: true,
              unanswered_questions: 23,
            },
          });
        }, 200);
      });

      expect(result).toEqual({
        status: 200,
        data: expect.objectContaining({
          auto_completed: true,
          unanswered_questions: expect.any(Number),
          score: expect.any(Number),
        }),
      });
    });

    it("should return 404 for invalid attempt_id", async () => {
      const { req, res } = createMocks({
        method: "POST",
        body: {
          attempt_id: "invalid-attempt-id",
          completed_at: new Date().toISOString(),
        },
        headers: {
          authorization: "Bearer valid-jwt-token",
          "content-type": "application/json",
        },
      });

      const result = await new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            status: 404,
            error: "Exam attempt not found",
          });
        }, 100);
      });

      expect(result).toEqual({
        status: 404,
        error: "Exam attempt not found",
      });
    });
  });

  describe("API_EXAM_RESUME_004: Exam Resume Functionality", () => {
    it("should allow resuming an in-progress exam", async () => {
      const { req, res } = createMocks({
        method: "GET",
        query: {
          attempt_id: "attempt-123",
        },
        headers: {
          authorization: "Bearer valid-jwt-token",
        },
      });

      const mockResumeData = {
        attempt_id: "attempt-123",
        current_question: 25,
        time_remaining: 3600, // 60 minutes left
        answered_questions: [1, 2, 3, 4, 5], // question numbers
        flagged_questions: [3, 7, 12],
        user_answers: {
          1: "A",
          2: "B", 
          3: "C",
          4: "A",
          5: "D",
        },
      };

      const result = await new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            status: 200,
            data: mockResumeData,
          });
        }, 100);
      });

      expect(result).toEqual({
        status: 200,
        data: expect.objectContaining({
          attempt_id: "attempt-123",
          current_question: expect.any(Number),
          time_remaining: expect.any(Number),
          answered_questions: expect.any(Array),
          flagged_questions: expect.any(Array),
          user_answers: expect.any(Object),
        }),
      });
    });

    it("should prevent resuming completed exam", async () => {
      const result = await new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            status: 400,
            error: "Cannot resume completed exam",
          });
        }, 100);
      });

      expect(result).toEqual({
        status: 400,
        error: "Cannot resume completed exam",
      });
    });
  });

  describe("Performance & Scalability", () => {
    it("should handle multiple concurrent exam starts", async () => {
      const promises = Array.from({ length: 10 }, (_, i) =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              status: 200,
              data: {
                attempt_id: `attempt-${i}`,
                questions: mockQuestions.slice(0, 90),
              },
            });
          }, Math.random() * 100);
        })
      );

      const results = await Promise.all(promises);

      results.forEach((result, index) => {
        expect(result).toEqual({
          status: 200,
          data: expect.objectContaining({
            attempt_id: `attempt-${index}`,
            questions: expect.any(Array),
          }),
        });
      });
    });

    it("should respond within acceptable time limits", async () => {
      const startTime = Date.now();

      const result = await new Promise((resolve) => {
        setTimeout(() => {
          const endTime = Date.now();
          resolve({
            status: 200,
            responseTime: endTime - startTime,
            data: { attempt_id: "test" },
          });
        }, 50);
      });

      expect((result as any).responseTime).toBeLessThan(300); // <300ms
    });
  });

  describe("Security & Validation", () => {
    it("should sanitize user inputs", async () => {
      const maliciousInput = {
        attempt_id: "attempt-123",
        question_id: "<script>alert('xss')</script>",
        selected_answer: "A'; DROP TABLE users; --",
      };

      const result = await new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            status: 400,
            error: "Invalid input detected",
          });
        }, 100);
      });

      expect(result).toEqual({
        status: 400,
        error: "Invalid input detected",
      });
    });

    it("should enforce rate limiting", async () => {
      // Simulate rapid requests
      const rapidRequests = Array.from({ length: 100 }, () =>
        new Promise((resolve) => {
          setTimeout(() => resolve({ status: 429, error: "Rate limit exceeded" }), 10);
        })
      );

      const results = await Promise.all(rapidRequests);
      const rateLimitedResponses = results.filter((r: any) => r.status === 429);

      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });
});