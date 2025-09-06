import { chromium, FullConfig } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

async function globalSetup(config: FullConfig) {
  console.log("🚀 Starting global E2E test setup...");

  // Initialize test database with clean state
  if (process.env.TEST_SUPABASE_URL && process.env.TEST_SUPABASE_ANON_KEY) {
    await setupTestDatabase();
  }

  // Create authentication state for different user roles
  await createAuthenticationStates(config);

  console.log("✅ Global E2E test setup completed");
}

async function setupTestDatabase() {
  console.log("🗄️ Setting up test database...");
  
  const supabase = createClient(
    process.env.TEST_SUPABASE_URL!,
    process.env.TEST_SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // Clean existing test data
    await supabase.from("exam_attempts").delete().neq("id", "");
    await supabase.from("user_progress").delete().neq("id", "");
    await supabase.from("user_answers").delete().neq("id", "");

    // Seed test data
    await seedTestUsers(supabase);
    await seedTestQuestions(supabase);
    
    console.log("✅ Test database setup completed");
  } catch (error) {
    console.error("❌ Test database setup failed:", error);
    throw error;
  }
}

async function seedTestUsers(supabase: any) {
  const testUsers = [
    {
      id: "test-user-standard",
      email: "standard@test.com",
      role: "user",
      subscription_plan: "30-day",
      subscription_status: "active",
      created_at: new Date().toISOString(),
    },
    {
      id: "test-user-premium",
      email: "premium@test.com", 
      role: "user",
      subscription_plan: "180-day",
      subscription_status: "active",
      created_at: new Date().toISOString(),
    },
    {
      id: "test-user-admin",
      email: "admin@test.com",
      role: "admin",
      subscription_plan: null,
      subscription_status: null,
      created_at: new Date().toISOString(),
    },
    {
      id: "test-user-free",
      email: "free@test.com",
      role: "user",
      subscription_plan: null,
      subscription_status: null,
      created_at: new Date().toISOString(),
    },
  ];

  for (const user of testUsers) {
    await supabase.from("users").upsert(user);
  }
}

async function seedTestQuestions(supabase: any) {
  // Create 90 test questions for complete exam
  const questions = Array.from({ length: 90 }, (_, i) => ({
    id: `test-question-${i + 1}`,
    text: `Test question ${i + 1}: Which of the following best describes this scenario?`,
    domain: Math.floor(i / 18) + 1, // 18 questions per domain (1-5)
    subdomain: ((i % 18) % 3) + 1, // 3 subdomains per domain
    difficulty: ["easy", "medium", "hard"][i % 3],
    question_type: "multiple_choice",
    correct_answer: "A",
    rationale: `This is the rationale for question ${i + 1}. The correct answer is A because...`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    status: "published",
  }));

  // Insert in batches to avoid timeout
  const batchSize = 20;
  for (let i = 0; i < questions.length; i += batchSize) {
    const batch = questions.slice(i, i + batchSize);
    await supabase.from("questions").upsert(batch);
  }

  // Create choices for each question
  const choices = questions.flatMap((question) => [
    {
      id: `${question.id}-choice-A`,
      question_id: question.id,
      choice_letter: "A",
      text: "Correct answer choice",
      is_correct: true,
    },
    {
      id: `${question.id}-choice-B`,
      question_id: question.id,
      choice_letter: "B",
      text: "Incorrect answer choice",
      is_correct: false,
    },
    {
      id: `${question.id}-choice-C`,
      question_id: question.id,
      choice_letter: "C",
      text: "Another incorrect choice",
      is_correct: false,
    },
    {
      id: `${question.id}-choice-D`,
      question_id: question.id,
      choice_letter: "D",
      text: "Final incorrect choice",
      is_correct: false,
    },
  ]);

  // Insert choices in batches
  for (let i = 0; i < choices.length; i += batchSize) {
    const batch = choices.slice(i, i + batchSize);
    await supabase.from("choices").upsert(batch);
  }
}

async function createAuthenticationStates(config: FullConfig) {
  console.log("🔐 Creating authentication states...");

  const browser = await chromium.launch();
  const baseURL = config.projects[0].use?.baseURL || "http://localhost:3000";

  // Test user authentication states to be saved
  const authStates = [
    {
      name: "standardUser",
      email: "standard@test.com",
      password: "TestPass123!",
      file: "tests/e2e/auth/standard-user.json",
    },
    {
      name: "premiumUser", 
      email: "premium@test.com",
      password: "TestPass123!",
      file: "tests/e2e/auth/premium-user.json",
    },
    {
      name: "adminUser",
      email: "admin@test.com",
      password: "AdminPass123!",
      file: "tests/e2e/auth/admin-user.json",
    },
  ];

  for (const { name, email, password, file } of authStates) {
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      // Navigate to login page
      await page.goto(`${baseURL}/login`);

      // Perform login
      await page.fill('[data-testid="email-input"]', email);
      await page.fill('[data-testid="password-input"]', password);
      await page.click('[data-testid="login-button"]');

      // Wait for successful login (presence of user menu or dashboard)
      await page.waitForSelector('[data-testid="user-menu"]', { timeout: 10000 });

      // Save authentication state
      await context.storageState({ path: file });
      
      console.log(`✅ Authentication state saved for ${name}`);
    } catch (error) {
      console.warn(`⚠️ Failed to create auth state for ${name}:`, error);
      // Continue with other auth states even if one fails
    }

    await context.close();
  }

  await browser.close();
  console.log("✅ Authentication states created");
}

export default globalSetup;