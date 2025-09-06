/**
 * @fileoverview Test question fixtures for ExamPrep platform
 * Provides standardized test question data for consistent testing
 */

export interface TestChoice {
  id: string;
  choice_letter: "A" | "B" | "C" | "D";
  text: string;
  is_correct: boolean;
}

export interface TestQuestion {
  id: string;
  text: string;
  domain: 1 | 2 | 3 | 4 | 5;
  subdomain: number;
  difficulty: "easy" | "medium" | "hard";
  question_type: "multiple_choice" | "performance_based";
  correct_answer: "A" | "B" | "C" | "D";
  rationale: string;
  choices: TestChoice[];
  tags?: string[];
  references?: string[];
  time_estimate?: number; // seconds
  created_at: string;
  updated_at: string;
  status: "draft" | "review" | "published" | "archived";
}

// Helper to create standard question choices
const createChoices = (
  correctAnswer: "A" | "B" | "C" | "D",
  correctText: string,
  wrongChoices: string[]
): TestChoice[] => {
  const choices: TestChoice[] = [];
  const letters: ("A" | "B" | "C" | "D")[] = ["A", "B", "C", "D"];
  
  letters.forEach((letter, index) => {
    choices.push({
      id: `choice-${letter}`,
      choice_letter: letter,
      text: letter === correctAnswer ? correctText : wrongChoices[index - (letter > correctAnswer ? 1 : 0)] || wrongChoices[index],
      is_correct: letter === correctAnswer,
    });
  });
  
  return choices;
};

// Sample test questions covering all domains
export const testQuestions: TestQuestion[] = [
  // Domain 1: Mobile Devices (18 questions)
  {
    id: "test-q-001",
    text: "Which of the following display technologies provides the best color reproduction and contrast ratios for mobile devices?",
    domain: 1,
    subdomain: 1,
    difficulty: "medium",
    question_type: "multiple_choice",
    correct_answer: "A",
    rationale: "OLED (Organic Light Emitting Diode) displays provide superior color reproduction and contrast ratios because each pixel emits its own light, allowing for true blacks and vibrant colors.",
    choices: createChoices("A", "OLED", ["LCD", "E-ink", "TN panel"]),
    tags: ["display", "mobile", "hardware"],
    references: ["CompTIA A+ 220-1101 Objective 1.3"],
    time_estimate: 45,
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
    status: "published",
  },
  
  {
    id: "test-q-002",
    text: "A user reports that their smartphone battery drains very quickly. Which of the following should be checked FIRST?",
    domain: 1,
    subdomain: 2,
    difficulty: "easy",
    question_type: "multiple_choice",
    correct_answer: "B",
    rationale: "Screen brightness is typically the largest drain on mobile device batteries. Checking and adjusting brightness settings should be the first troubleshooting step.",
    choices: createChoices("B", "Screen brightness settings", ["Hardware malfunction", "Network connectivity", "Storage capacity"]),
    tags: ["battery", "troubleshooting", "mobile"],
    references: ["CompTIA A+ 220-1101 Objective 1.4"],
    time_estimate: 30,
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
    status: "published",
  },

  // Domain 2: Networking (18 questions)
  {
    id: "test-q-003",
    text: "Which TCP port number is used by default for HTTPS connections?",
    domain: 2,
    subdomain: 1,
    difficulty: "easy",
    question_type: "multiple_choice",
    correct_answer: "C",
    rationale: "HTTPS (HTTP Secure) uses TCP port 443 by default. This is a fundamental networking concept that is essential for web security.",
    choices: createChoices("C", "443", ["80", "22", "25"]),
    tags: ["networking", "ports", "security", "https"],
    references: ["CompTIA A+ 220-1101 Objective 2.1"],
    time_estimate: 20,
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
    status: "published",
  },

  {
    id: "test-q-004",
    text: "A network administrator needs to configure a wireless network that supports the highest data transfer rates. Which 802.11 standard should be implemented?",
    domain: 2,
    subdomain: 2,
    difficulty: "medium",
    question_type: "multiple_choice",
    correct_answer: "D",
    rationale: "802.11ax (Wi-Fi 6) is the newest standard and provides the highest data transfer rates, up to 9.6 Gbps theoretical maximum throughput.",
    choices: createChoices("D", "802.11ax", ["802.11n", "802.11g", "802.11ac"]),
    tags: ["wireless", "802.11", "standards", "wifi"],
    references: ["CompTIA A+ 220-1101 Objective 2.3"],
    time_estimate: 45,
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
    status: "published",
  },

  // Domain 3: Hardware (18 questions)
  {
    id: "test-q-005",
    text: "Which component is responsible for converting AC power to DC power in a desktop computer?",
    domain: 3,
    subdomain: 1,
    difficulty: "easy",
    question_type: "multiple_choice",
    correct_answer: "A",
    rationale: "The Power Supply Unit (PSU) converts alternating current (AC) from the wall outlet to direct current (DC) that computer components require.",
    choices: createChoices("A", "Power Supply Unit (PSU)", ["Motherboard", "CPU", "RAM"]),
    tags: ["hardware", "power", "psu"],
    references: ["CompTIA A+ 220-1101 Objective 3.2"],
    time_estimate: 25,
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
    status: "published",
  },

  // Domain 4: Virtualization and Cloud Computing (18 questions)
  {
    id: "test-q-006",
    text: "Which cloud service model provides users with access to applications running on a cloud infrastructure?",
    domain: 4,
    subdomain: 1,
    difficulty: "medium",
    question_type: "multiple_choice",
    correct_answer: "B",
    rationale: "Software as a Service (SaaS) provides users with access to software applications that run on cloud infrastructure, such as Gmail, Office 365, or Salesforce.",
    choices: createChoices("B", "Software as a Service (SaaS)", ["Infrastructure as a Service (IaaS)", "Platform as a Service (PaaS)", "Desktop as a Service (DaaS)"]),
    tags: ["cloud", "saas", "service-models"],
    references: ["CompTIA A+ 220-1101 Objective 4.1"],
    time_estimate: 40,
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
    status: "published",
  },

  // Domain 5: Hardware and Network Troubleshooting (18 questions)
  {
    id: "test-q-007",
    text: "A user reports that their computer randomly shuts down during heavy processing tasks. Which component is MOST likely failing?",
    domain: 5,
    subdomain: 1,
    difficulty: "medium",
    question_type: "multiple_choice",
    correct_answer: "C",
    rationale: "Random shutdowns during heavy processing tasks typically indicate power supply failure, as the PSU cannot provide sufficient power under load.",
    choices: createChoices("C", "Power supply", ["RAM", "Hard drive", "Network card"]),
    tags: ["troubleshooting", "hardware", "power", "shutdowns"],
    references: ["CompTIA A+ 220-1101 Objective 5.2"],
    time_estimate: 35,
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
    status: "published",
  },
];

// Generate more questions to reach 90 total
const generateQuestions = (): TestQuestion[] => {
  const questions = [...testQuestions];
  const domains = [1, 2, 3, 4, 5] as const;
  const difficulties = ["easy", "medium", "hard"] as const;
  const correctAnswers = ["A", "B", "C", "D"] as const;
  
  // Generate additional questions to reach 90 total (18 per domain)
  let questionNumber = testQuestions.length + 1;
  
  for (const domain of domains) {
    // Calculate how many more questions we need for this domain
    const existingForDomain = questions.filter(q => q.domain === domain).length;
    const needed = 18 - existingForDomain;
    
    for (let i = 0; i < needed; i++) {
      const difficulty = difficulties[i % 3];
      const correctAnswer = correctAnswers[i % 4];
      
      questions.push({
        id: `test-q-${questionNumber.toString().padStart(3, "0")}`,
        text: `Sample question ${questionNumber} for domain ${domain}: Which of the following is the correct answer for this test scenario?`,
        domain,
        subdomain: (i % 3) + 1,
        difficulty,
        question_type: "multiple_choice",
        correct_answer: correctAnswer,
        rationale: `This is the rationale for question ${questionNumber}. The correct answer is ${correctAnswer} because it demonstrates the proper understanding of domain ${domain} concepts.`,
        choices: createChoices(
          correctAnswer,
          `Correct answer for question ${questionNumber}`,
          [
            `Incorrect choice 1 for question ${questionNumber}`,
            `Incorrect choice 2 for question ${questionNumber}`,
            `Incorrect choice 3 for question ${questionNumber}`,
          ]
        ),
        tags: [`domain-${domain}`, difficulty, "test-question"],
        references: [`CompTIA A+ 220-1101 Objective ${domain}.${(i % 3) + 1}`],
        time_estimate: 30 + (i % 3) * 10,
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-01T00:00:00Z",
        status: "published",
      });
      
      questionNumber++;
    }
  }
  
  return questions;
};

export const fullQuestionSet = generateQuestions();

// Helper functions for test data management
export const questionHelpers = {
  /**
   * Get questions by domain
   */
  getQuestionsByDomain: (domain: 1 | 2 | 3 | 4 | 5): TestQuestion[] => {
    return fullQuestionSet.filter(q => q.domain === domain);
  },

  /**
   * Get questions by difficulty
   */
  getQuestionsByDifficulty: (difficulty: "easy" | "medium" | "hard"): TestQuestion[] => {
    return fullQuestionSet.filter(q => q.difficulty === difficulty);
  },

  /**
   * Get a random subset of questions
   */
  getRandomQuestions: (count: number): TestQuestion[] => {
    const shuffled = [...fullQuestionSet].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  },

  /**
   * Get questions for a full exam (90 questions, 18 per domain)
   */
  getExamQuestions: (): TestQuestion[] => {
    const examQuestions: TestQuestion[] = [];
    
    for (let domain = 1; domain <= 5; domain++) {
      const domainQuestions = questionHelpers.getQuestionsByDomain(domain as 1 | 2 | 3 | 4 | 5);
      examQuestions.push(...domainQuestions.slice(0, 18));
    }
    
    return examQuestions;
  },

  /**
   * Get practice questions for a specific domain
   */
  getPracticeQuestions: (domain: 1 | 2 | 3 | 4 | 5, count: number = 10): TestQuestion[] => {
    const domainQuestions = questionHelpers.getQuestionsByDomain(domain);
    return domainQuestions.slice(0, count);
  },

  /**
   * Create a mock question for testing
   */
  createMockQuestion: (overrides: Partial<TestQuestion> = {}): TestQuestion => {
    const baseQuestion: TestQuestion = {
      id: `mock-q-${Date.now()}`,
      text: "Mock test question: Which of the following is correct?",
      domain: 1,
      subdomain: 1,
      difficulty: "medium",
      question_type: "multiple_choice",
      correct_answer: "A",
      rationale: "This is a mock question rationale for testing purposes.",
      choices: createChoices("A", "Correct answer", ["Wrong answer 1", "Wrong answer 2", "Wrong answer 3"]),
      tags: ["mock", "test"],
      time_estimate: 30,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      status: "published",
    };

    return { ...baseQuestion, ...overrides };
  },

  /**
   * Get questions that match specific criteria
   */
  getFilteredQuestions: (filters: {
    domain?: number;
    difficulty?: string;
    status?: string;
    tags?: string[];
  }): TestQuestion[] => {
    return fullQuestionSet.filter(question => {
      if (filters.domain && question.domain !== filters.domain) return false;
      if (filters.difficulty && question.difficulty !== filters.difficulty) return false;
      if (filters.status && question.status !== filters.status) return false;
      if (filters.tags && !filters.tags.some(tag => question.tags?.includes(tag))) return false;
      return true;
    });
  },

  /**
   * Calculate expected score for a given answer pattern
   */
  calculateScore: (questions: TestQuestion[], answers: Record<string, string>): number => {
    let correct = 0;
    let total = questions.length;

    questions.forEach(question => {
      const userAnswer = answers[question.id];
      if (userAnswer === question.correct_answer) {
        correct++;
      }
    });

    return Math.round((correct / total) * 1000) / 10; // Round to 1 decimal place
  },
};

export { createChoices };
export default fullQuestionSet;