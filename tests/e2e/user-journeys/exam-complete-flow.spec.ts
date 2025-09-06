/**
 * @fileoverview End-to-End tests for complete exam flow
 * Test ID: E2E_EXAM_COMPLETE_001-005
 * Priority: Critical
 * Coverage: Login → Start Exam → Answer Questions → Submit → View Results
 */

import { test, expect, Page, BrowserContext } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// Test configuration for exam flow
const EXAM_CONFIG = {
  TOTAL_QUESTIONS: 90,
  TIME_LIMIT_MINUTES: 90,
  PASSING_SCORE: 75.0,
  DOMAINS: [1, 2, 3, 4, 5],
  QUESTIONS_PER_DOMAIN: 18,
};

// Helper functions for exam flow
class ExamFlowHelpers {
  constructor(private page: Page) {}

  async loginAsStandardUser() {
    await this.page.goto("/login");
    await this.page.fill('[data-testid="email-input"]', "standard@test.com");
    await this.page.fill('[data-testid="password-input"]', "TestPass123!");
    await this.page.click('[data-testid="login-button"]');
    await this.page.waitForSelector('[data-testid="user-menu"]');
  }

  async loginAsPremiumUser() {
    await this.page.goto("/login");
    await this.page.fill('[data-testid="email-input"]', "premium@test.com");
    await this.page.fill('[data-testid="password-input"]', "TestPass123!");
    await this.page.click('[data-testid="login-button"]');
    await this.page.waitForSelector('[data-testid="user-menu"]');
  }

  async startExam() {
    await this.page.goto("/exam/comptia-aplus");
    await expect(this.page.locator('[data-testid="exam-instructions"]')).toBeVisible();
    await this.page.click('[data-testid="start-exam-button"]');
    await this.page.waitForSelector('[data-testid="exam-timer"]');
  }

  async verifyExamInterface() {
    // Verify timer is running
    await expect(this.page.locator('[data-testid="exam-timer"]')).toContainText("90:");
    
    // Verify question navigation grid
    await expect(this.page.locator('[data-testid="question-grid"]')).toBeVisible();
    
    // Verify current question is displayed
    await expect(this.page.locator('[data-testid="current-question"]')).toBeVisible();
    
    // Verify answer choices
    const choices = this.page.locator('[data-testid*="choice-"]');
    await expect(choices).toHaveCount(4);
  }

  async answerQuestion(questionNumber: number, choice: "A" | "B" | "C" | "D") {
    await this.page.click(`[data-testid="question-${questionNumber}-choice-${choice}"]`);
  }

  async flagQuestion(questionNumber: number) {
    await this.page.click(`[data-testid="flag-question-${questionNumber}"]`);
  }

  async navigateToQuestion(questionNumber: number) {
    await this.page.click(`[data-testid="nav-question-${questionNumber}"]`);
  }

  async submitExam() {
    await this.page.click('[data-testid="submit-exam"]');
    await this.page.click('[data-testid="confirm-submit"]');
    await this.page.waitForSelector('[data-testid="exam-results"]');
  }

  async verifyResults() {
    // Verify score is displayed
    await expect(this.page.locator('[data-testid="exam-score"]')).toBeVisible();
    
    // Verify pass/fail status
    await expect(this.page.locator('[data-testid="pass-fail-status"]')).toBeVisible();
    
    // Verify domain breakdown
    await expect(this.page.locator('[data-testid="domain-breakdown"]')).toBeVisible();
    
    // Verify no rationales are shown in exam mode
    await expect(this.page.locator('[data-testid="question-rationale"]')).not.toBeVisible();
  }
}

test.describe("E2E_EXAM_COMPLETE_FLOW: Complete Exam Flow", () => {
  let helpers: ExamFlowHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new ExamFlowHelpers(page);
  });

  test.describe("E2E_EXAM_START_001: Exam Start Flow", () => {
    test("should complete login and start exam for standard user", async ({ page }) => {
      await helpers.loginAsStandardUser();
      await helpers.startExam();
      await helpers.verifyExamInterface();

      // Verify subscription limits are enforced
      await expect(page.locator('[data-testid="attempts-remaining"]')).toContainText("4"); // Started with 5
    });

    test("should start exam for premium user with unlimited attempts", async ({ page }) => {
      await helpers.loginAsPremiumUser();
      await helpers.startExam();
      await helpers.verifyExamInterface();

      // Premium users should see "unlimited" attempts
      await expect(page.locator('[data-testid="attempts-remaining"]')).toContainText("unlimited");
    });

    test("should prevent multiple concurrent exam sessions", async ({ page, context }) => {
      await helpers.loginAsStandardUser();
      await helpers.startExam();

      // Try to start another exam in a new tab
      const newPage = await context.newPage();
      await newPage.goto("/exam/comptia-aplus");
      
      // Should show error or redirect to existing exam
      await expect(newPage.locator('[data-testid="exam-in-progress-message"]')).toBeVisible();
    });
  });

  test.describe("E2E_EXAM_NAVIGATION_002: Question Navigation", () => {
    test.beforeEach(async ({ page }) => {
      await helpers.loginAsStandardUser();
      await helpers.startExam();
    });

    test("should navigate through all 90 questions", async ({ page }) => {
      // Navigate to each question and verify structure
      for (let i = 1; i <= 90; i++) {
        await helpers.navigateToQuestion(i);
        
        // Verify question number
        await expect(page.locator('[data-testid="question-number"]')).toContainText(`${i}`);
        
        // Verify question has content
        await expect(page.locator('[data-testid="question-text"]')).not.toBeEmpty();
        
        // Verify 4 choices available
        const choices = page.locator('[data-testid*="choice-"]');
        await expect(choices).toHaveCount(4);
        
        // Quick break every 10 questions to prevent timeout
        if (i % 10 === 0) {
          await page.waitForTimeout(100);
        }
      }
    });

    test("should show question status in navigation grid", async ({ page }) => {
      // Answer first question
      await helpers.answerQuestion(1, "A");
      await expect(page.locator('[data-testid="nav-question-1"]')).toHaveClass(/answered/);

      // Flag second question
      await helpers.navigateToQuestion(2);
      await helpers.flagQuestion(2);
      await expect(page.locator('[data-testid="nav-question-2"]')).toHaveClass(/flagged/);

      // Leave third question unanswered
      await helpers.navigateToQuestion(3);
      await expect(page.locator('[data-testid="nav-question-3"]')).toHaveClass(/unanswered/);
    });

    test("should maintain question state during navigation", async ({ page }) => {
      // Answer and flag multiple questions
      const testScenarios = [
        { question: 1, answer: "A", flag: false },
        { question: 5, answer: "B", flag: true },
        { question: 10, answer: "C", flag: false },
        { question: 15, answer: "D", flag: true },
      ];

      for (const scenario of testScenarios) {
        await helpers.navigateToQuestion(scenario.question);
        await helpers.answerQuestion(scenario.question, scenario.answer);
        if (scenario.flag) {
          await helpers.flagQuestion(scenario.question);
        }
      }

      // Navigate away and back to verify state persistence
      await helpers.navigateToQuestion(50);
      await page.waitForTimeout(1000);

      // Verify each question maintained its state
      for (const scenario of testScenarios) {
        await helpers.navigateToQuestion(scenario.question);
        
        // Verify selected answer
        await expect(
          page.locator(`[data-testid="question-${scenario.question}-choice-${scenario.answer}"]`)
        ).toBeChecked();
        
        // Verify flag status
        if (scenario.flag) {
          await expect(page.locator(`[data-testid="flag-question-${scenario.question}"]`)).toHaveClass(/flagged/);
        }
      }
    });
  });

  test.describe("E2E_EXAM_TIMER_003: Timer Functionality", () => {
    test.beforeEach(async ({ page }) => {
      await helpers.loginAsStandardUser();
      await helpers.startExam();
    });

    test("should display and countdown timer correctly", async ({ page }) => {
      // Initial timer should show 90:00
      await expect(page.locator('[data-testid="exam-timer"]')).toContainText("90:00");

      // Wait a few seconds and verify countdown
      await page.waitForTimeout(3000);
      const timerText = await page.locator('[data-testid="exam-timer"]').textContent();
      expect(timerText).toMatch(/89:5[0-9]/); // Should be around 89:5X
    });

    test("should show warning when time is running low", async ({ page }) => {
      // Mock timer to show 5 minutes remaining
      await page.evaluate(() => {
        // Simulate low time warning
        const timerElement = document.querySelector('[data-testid="exam-timer"]');
        if (timerElement) {
          timerElement.textContent = "5:00";
          timerElement.classList.add("warning");
        }
      });

      // Verify warning styles/message
      await expect(page.locator('[data-testid="time-warning"]')).toBeVisible();
    });

    test("should auto-submit when timer expires", async ({ page }) => {
      // Mock timer expiration
      await page.evaluate(() => {
        // Simulate timer expiration
        window.dispatchEvent(new CustomEvent('examTimeExpired'));
      });

      // Should automatically navigate to results
      await expect(page.locator('[data-testid="exam-results"]')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('[data-testid="auto-submit-notice"]')).toBeVisible();
    });
  });

  test.describe("E2E_EXAM_COMPLETION_004: Exam Completion", () => {
    test.beforeEach(async ({ page }) => {
      await helpers.loginAsStandardUser();
      await helpers.startExam();
    });

    test("should complete full exam with all questions answered", async ({ page }) => {
      // Answer all 90 questions with predetermined pattern for predictable score
      const answerPattern = ["A", "B", "C", "D"];
      
      for (let i = 1; i <= 90; i++) {
        await helpers.navigateToQuestion(i);
        const answerIndex = (i - 1) % 4;
        await helpers.answerQuestion(i, answerPattern[answerIndex] as "A" | "B" | "C" | "D");
        
        // Progress indicator
        if (i % 20 === 0) {
          await page.waitForTimeout(500);
          console.log(`Answered ${i}/90 questions`);
        }
      }

      // Submit exam
      await helpers.submitExam();
      await helpers.verifyResults();

      // Verify score calculation
      const score = await page.locator('[data-testid="exam-score"]').textContent();
      expect(score).toMatch(/\d+\.\d%/); // Should be a percentage

      // Verify domain breakdown
      for (let domain = 1; domain <= 5; domain++) {
        await expect(page.locator(`[data-testid="domain-${domain}-score"]`)).toBeVisible();
      }
    });

    test("should handle partial completion (some unanswered questions)", async ({ page }) => {
      // Answer only first 45 questions
      for (let i = 1; i <= 45; i++) {
        await helpers.navigateToQuestion(i);
        await helpers.answerQuestion(i, "A");
      }

      // Submit with unanswered questions
      await helpers.submitExam();
      
      // Should show warning about unanswered questions
      await expect(page.locator('[data-testid="unanswered-warning"]')).toBeVisible();
      
      // Confirm submission
      await page.click('[data-testid="confirm-with-unanswered"]');
      
      await helpers.verifyResults();
      
      // Verify unanswered questions are noted
      await expect(page.locator('[data-testid="unanswered-count"]')).toContainText("45");
    });
  });

  test.describe("E2E_EXAM_RESUME_005: Exam Resume Functionality", () => {
    test("should resume exam after browser refresh", async ({ page }) => {
      await helpers.loginAsStandardUser();
      await helpers.startExam();

      // Answer a few questions and flag some
      await helpers.answerQuestion(1, "A");
      await helpers.navigateToQuestion(2);
      await helpers.flagQuestion(2);
      await helpers.navigateToQuestion(5);
      await helpers.answerQuestion(5, "B");

      // Refresh the page
      await page.reload();

      // Should resume to the same state
      await expect(page.locator('[data-testid="exam-timer"]')).toBeVisible();
      
      // Verify question states were preserved
      await helpers.navigateToQuestion(1);
      await expect(page.locator('[data-testid="question-1-choice-A"]')).toBeChecked();

      await helpers.navigateToQuestion(2);
      await expect(page.locator('[data-testid="flag-question-2"]')).toHaveClass(/flagged/);

      await helpers.navigateToQuestion(5);
      await expect(page.locator('[data-testid="question-5-choice-B"]')).toBeChecked();
    });

    test("should resume exam after session interruption", async ({ page, context }) => {
      await helpers.loginAsStandardUser();
      await helpers.startExam();

      // Answer some questions
      await helpers.answerQuestion(1, "A");
      await helpers.navigateToQuestion(10);
      await helpers.answerQuestion(10, "C");

      // Close page and create new one (simulate browser close/reopen)
      await page.close();
      
      const newPage = await context.newPage();
      const newHelpers = new ExamFlowHelpers(newPage);
      
      // Login and navigate to exam area
      await newHelpers.loginAsStandardUser();
      await newPage.goto("/exam");

      // Should show option to resume
      await expect(newPage.locator('[data-testid="resume-exam-button"]')).toBeVisible();
      await newPage.click('[data-testid="resume-exam-button"]');

      // Should resume with previous state
      await newHelpers.navigateToQuestion(1);
      await expect(newPage.locator('[data-testid="question-1-choice-A"]')).toBeChecked();
    });
  });

  test.describe("Cross-Browser Compatibility", () => {
    ["chromium", "firefox", "webkit"].forEach((browserName) => {
      test(`should work correctly in ${browserName}`, async ({ page }) => {
        await helpers.loginAsStandardUser();
        await helpers.startExam();
        
        // Answer a few questions to test basic functionality
        for (let i = 1; i <= 5; i++) {
          await helpers.navigateToQuestion(i);
          await helpers.answerQuestion(i, "A");
        }

        // Verify navigation and state management
        await helpers.navigateToQuestion(1);
        await expect(page.locator('[data-testid="question-1-choice-A"]')).toBeChecked();
      });
    });
  });

  test.describe("Accessibility Compliance", () => {
    test("should meet WCAG 2.1 AA standards", async ({ page }) => {
      await helpers.loginAsStandardUser();
      await helpers.startExam();

      // Run accessibility scan
      const accessibilityResults = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();

      expect(accessibilityResults.violations).toEqual([]);
    });

    test("should be keyboard navigable", async ({ page }) => {
      await helpers.loginAsStandardUser();
      await helpers.startExam();

      // Tab through interface elements
      await page.keyboard.press("Tab");
      await expect(page.locator("[data-testid='question-1-choice-A']")).toBeFocused();

      await page.keyboard.press("Tab");
      await expect(page.locator("[data-testid='question-1-choice-B']")).toBeFocused();

      // Select answer with spacebar
      await page.keyboard.press("Space");
      await expect(page.locator('[data-testid="question-1-choice-B"]')).toBeChecked();
    });

    test("should work with screen reader landmarks", async ({ page }) => {
      await helpers.loginAsStandardUser();
      await helpers.startExam();

      // Verify proper ARIA landmarks
      await expect(page.locator('main[role="main"]')).toBeVisible();
      await expect(page.locator('nav[aria-label="Question navigation"]')).toBeVisible();
      await expect(page.locator('[role="timer"]')).toBeVisible();
    });
  });

  test.describe("Performance Requirements", () => {
    test("should meet performance benchmarks", async ({ page }) => {
      const startTime = Date.now();
      
      await helpers.loginAsStandardUser();
      await helpers.startExam();
      
      const loadTime = Date.now() - startTime;
      
      // Exam should start within 2 seconds
      expect(loadTime).toBeLessThan(2000);
    });

    test("should handle rapid question navigation", async ({ page }) => {
      await helpers.loginAsStandardUser();
      await helpers.startExam();

      const startTime = Date.now();
      
      // Rapidly navigate through 20 questions
      for (let i = 1; i <= 20; i++) {
        await helpers.navigateToQuestion(i);
        await page.waitForTimeout(50); // Small delay to allow rendering
      }
      
      const navigationTime = Date.now() - startTime;
      
      // Should complete navigation within reasonable time
      expect(navigationTime).toBeLessThan(5000); // 5 seconds for 20 questions
    });
  });

  test.describe("Error Handling & Edge Cases", () => {
    test("should handle network interruption during exam", async ({ page, context }) => {
      await helpers.loginAsStandardUser();
      await helpers.startExam();

      // Answer a question
      await helpers.answerQuestion(1, "A");

      // Simulate network failure
      await context.setOffline(true);
      
      // Try to navigate to next question
      await helpers.navigateToQuestion(2);
      
      // Should show offline message but maintain state
      await expect(page.locator('[data-testid="offline-notice"]')).toBeVisible();

      // Restore network
      await context.setOffline(false);
      
      // Should sync and continue normally
      await page.waitForTimeout(2000);
      await expect(page.locator('[data-testid="offline-notice"]')).not.toBeVisible();
    });

    test("should handle invalid exam state gracefully", async ({ page }) => {
      // Try to access exam without proper setup
      await page.goto("/exam/comptia-aplus/invalid-attempt-id");
      
      // Should redirect to exam start or show error
      await expect(page.locator('[data-testid="invalid-exam-message"]')).toBeVisible();
    });
  });
});