/**
 * @fileoverview Test user fixtures for ExamPrep platform
 * Provides standardized test user data for consistent testing
 */

export interface TestUser {
  id: string;
  email: string;
  password: string;
  role: "user" | "admin" | "sme" | "editor";
  subscription?: {
    plan: "30-day" | "60-day" | "90-day" | "180-day" | null;
    status: "active" | "cancelled" | "expired" | "trial" | null;
    attempts_remaining: number | null;
    created_at: string;
    expires_at: string;
  };
  profile?: {
    first_name: string;
    last_name: string;
    phone?: string;
    company?: string;
  };
  progress?: {
    domains_completed: number[];
    total_practice_questions: number;
    total_exam_attempts: number;
    best_score: number | null;
  };
  created_at: string;
}

// Standard test users for different scenarios
export const testUsers: Record<string, TestUser> = {
  // Standard user with active 30-day subscription
  standardUser: {
    id: "test-user-standard",
    email: "standard@test.com",
    password: "TestPass123!",
    role: "user",
    subscription: {
      plan: "30-day",
      status: "active",
      attempts_remaining: 5,
      created_at: "2025-01-01T00:00:00Z",
      expires_at: "2025-01-31T23:59:59Z",
    },
    profile: {
      first_name: "John",
      last_name: "Standard",
      company: "Test Company",
    },
    progress: {
      domains_completed: [1, 2],
      total_practice_questions: 150,
      total_exam_attempts: 0,
      best_score: null,
    },
    created_at: "2025-01-01T00:00:00Z",
  },

  // Premium user with unlimited attempts
  premiumUser: {
    id: "test-user-premium",
    email: "premium@test.com",
    password: "TestPass123!",
    role: "user",
    subscription: {
      plan: "180-day",
      status: "active",
      attempts_remaining: null, // unlimited
      created_at: "2025-01-01T00:00:00Z",
      expires_at: "2025-06-30T23:59:59Z",
    },
    profile: {
      first_name: "Jane",
      last_name: "Premium",
      phone: "+1-555-0123",
      company: "Premium Corp",
    },
    progress: {
      domains_completed: [1, 2, 3, 4, 5],
      total_practice_questions: 500,
      total_exam_attempts: 3,
      best_score: 85.6,
    },
    created_at: "2025-01-01T00:00:00Z",
  },

  // Free user with no subscription
  freeUser: {
    id: "test-user-free",
    email: "free@test.com",
    password: "TestPass123!",
    role: "user",
    subscription: null,
    profile: {
      first_name: "Bob",
      last_name: "Free",
    },
    progress: {
      domains_completed: [],
      total_practice_questions: 25, // Limited access
      total_exam_attempts: 0,
      best_score: null,
    },
    created_at: "2025-01-01T00:00:00Z",
  },

  // User with expired subscription
  expiredUser: {
    id: "test-user-expired",
    email: "expired@test.com",
    password: "TestPass123!",
    role: "user",
    subscription: {
      plan: "30-day",
      status: "expired",
      attempts_remaining: 0,
      created_at: "2024-12-01T00:00:00Z",
      expires_at: "2024-12-31T23:59:59Z",
    },
    profile: {
      first_name: "Alice",
      last_name: "Expired",
    },
    progress: {
      domains_completed: [1],
      total_practice_questions: 75,
      total_exam_attempts: 1,
      best_score: 62.3,
    },
    created_at: "2024-12-01T00:00:00Z",
  },

  // Admin user for testing admin functionality
  adminUser: {
    id: "test-user-admin",
    email: "admin@test.com",
    password: "AdminPass123!",
    role: "admin",
    subscription: null, // Admins don't need subscriptions
    profile: {
      first_name: "Admin",
      last_name: "User",
    },
    progress: {
      domains_completed: [],
      total_practice_questions: 0,
      total_exam_attempts: 0,
      best_score: null,
    },
    created_at: "2025-01-01T00:00:00Z",
  },

  // SME (Subject Matter Expert) user
  smeUser: {
    id: "test-user-sme",
    email: "sme@test.com",
    password: "SMEPass123!",
    role: "sme",
    subscription: null,
    profile: {
      first_name: "Expert",
      last_name: "SME",
      company: "Educational Services Inc",
    },
    progress: {
      domains_completed: [],
      total_practice_questions: 0,
      total_exam_attempts: 0,
      best_score: null,
    },
    created_at: "2025-01-01T00:00:00Z",
  },

  // Editor user for content management
  editorUser: {
    id: "test-user-editor",
    email: "editor@test.com",
    password: "EditorPass123!",
    role: "editor",
    subscription: null,
    profile: {
      first_name: "Content",
      last_name: "Editor",
    },
    progress: {
      domains_completed: [],
      total_practice_questions: 0,
      total_exam_attempts: 0,
      best_score: null,
    },
    created_at: "2025-01-01T00:00:00Z",
  },

  // User with trial subscription
  trialUser: {
    id: "test-user-trial",
    email: "trial@test.com",
    password: "TrialPass123!",
    role: "user",
    subscription: {
      plan: "30-day",
      status: "trial",
      attempts_remaining: 1,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
    },
    profile: {
      first_name: "Trial",
      last_name: "User",
    },
    progress: {
      domains_completed: [],
      total_practice_questions: 10,
      total_exam_attempts: 0,
      best_score: null,
    },
    created_at: new Date().toISOString(),
  },

  // User who has used all exam attempts
  noAttemptsUser: {
    id: "test-user-no-attempts",
    email: "noattempts@test.com",
    password: "TestPass123!",
    role: "user",
    subscription: {
      plan: "30-day",
      status: "active",
      attempts_remaining: 0,
      created_at: "2025-01-01T00:00:00Z",
      expires_at: "2025-01-31T23:59:59Z",
    },
    profile: {
      first_name: "No",
      last_name: "Attempts",
    },
    progress: {
      domains_completed: [1, 2, 3],
      total_practice_questions: 300,
      total_exam_attempts: 5,
      best_score: 73.4,
    },
    created_at: "2025-01-01T00:00:00Z",
  },
};

// Helper functions for test data management
export const userHelpers = {
  /**
   * Get a user by type for testing
   */
  getUser: (userType: keyof typeof testUsers): TestUser => {
    return testUsers[userType];
  },

  /**
   * Get multiple users for batch testing
   */
  getUsers: (userTypes: (keyof typeof testUsers)[]): TestUser[] => {
    return userTypes.map(type => testUsers[type]);
  },

  /**
   * Get users by role
   */
  getUsersByRole: (role: TestUser["role"]): TestUser[] => {
    return Object.values(testUsers).filter(user => user.role === role);
  },

  /**
   * Get users with active subscriptions
   */
  getActiveSubscribers: (): TestUser[] => {
    return Object.values(testUsers).filter(
      user => user.subscription?.status === "active"
    );
  },

  /**
   * Get users with specific subscription plans
   */
  getUsersByPlan: (plan: NonNullable<TestUser["subscription"]>["plan"]): TestUser[] => {
    return Object.values(testUsers).filter(
      user => user.subscription?.plan === plan
    );
  },

  /**
   * Create a test user with custom properties
   */
  createTestUser: (overrides: Partial<TestUser>): TestUser => {
    const baseUser: TestUser = {
      id: `test-user-${Date.now()}`,
      email: `test-${Date.now()}@test.com`,
      password: "TestPass123!",
      role: "user",
      profile: {
        first_name: "Test",
        last_name: "User",
      },
      progress: {
        domains_completed: [],
        total_practice_questions: 0,
        total_exam_attempts: 0,
        best_score: null,
      },
      created_at: new Date().toISOString(),
    };

    return { ...baseUser, ...overrides };
  },

  /**
   * Get login credentials for a user type
   */
  getLoginCredentials: (userType: keyof typeof testUsers) => {
    const user = testUsers[userType];
    return {
      email: user.email,
      password: user.password,
    };
  },
};

export default testUsers;