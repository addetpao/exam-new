"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { QuestionCard } from "@/components/exam/question-card";
import { AppHeader } from "@/components/layout/app-header";
import { 
  Settings, 
  Play, 
  RotateCcw, 
  BookOpen,
  Filter,
  ChevronLeft,
  ChevronRight,
  Check,
  Eye,
  EyeOff,
  Target
} from "lucide-react";
import { cn } from "@/lib/utils";

// Use the same mock data as exam but allow filtering
import questionsData from "../../public/data/questions.json";

interface PracticeState {
  currentQuestionIndex: number;
  answers: Record<string, number>;
  showRationale: boolean;
  showAnswers: boolean;
  filteredQuestions: any[];
  sessionStarted: boolean;
  sessionComplete: boolean;
}

interface FilterOptions {
  domain: string;
  difficulty: string;
  examVersion: string;
  questionCount: number;
  showOnlyFlagged: boolean;
  showOnlyIncorrect: boolean;
}

export default function PracticePage() {
  const [practiceState, setPracticeState] = useState<PracticeState>({
    currentQuestionIndex: 0,
    answers: {},
    showRationale: false,
    showAnswers: false,
    filteredQuestions: [],
    sessionStarted: false,
    sessionComplete: false
  });

  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    domain: "all",
    difficulty: "all", 
    examVersion: "all",
    questionCount: 10,
    showOnlyFlagged: false,
    showOnlyIncorrect: false
  });

  const [showFilters, setShowFilters] = useState(false);

  // Available filter options
  const domains = ["all", ...Array.from(new Set(questionsData.questions.map(q => q.domain)))];
  const difficulties = ["all", "Easy", "Medium", "Hard"];
  const examVersions = ["all", ...Array.from(new Set(questionsData.questions.map(q => q.examVersion)))];

  useEffect(() => {
    // Apply filters to questions
    let filtered = [...questionsData.questions];

    if (filterOptions.domain !== "all") {
      filtered = filtered.filter(q => q.domain === filterOptions.domain);
    }

    if (filterOptions.difficulty !== "all") {
      filtered = filtered.filter(q => q.difficulty === filterOptions.difficulty);
    }

    if (filterOptions.examVersion !== "all") {
      filtered = filtered.filter(q => q.examVersion === filterOptions.examVersion);
    }

    // Mock flagged and incorrect questions filtering
    if (filterOptions.showOnlyFlagged) {
      // In real app, filter by actual flagged questions
      filtered = filtered.filter((_, index) => index % 3 === 0); // Mock every 3rd question as flagged
    }

    if (filterOptions.showOnlyIncorrect) {
      // In real app, filter by questions answered incorrectly
      filtered = filtered.filter((_, index) => index % 4 === 1); // Mock every 4th question as incorrect
    }

    // Limit to requested count
    filtered = filtered.slice(0, filterOptions.questionCount);

    setPracticeState(prev => ({
      ...prev,
      filteredQuestions: filtered,
      currentQuestionIndex: 0,
      sessionStarted: false,
      sessionComplete: false
    }));
  }, [filterOptions]);

  const currentQuestion = practiceState.filteredQuestions[practiceState.currentQuestionIndex];
  const totalQuestions = practiceState.filteredQuestions.length;
  const answeredCount = Object.keys(practiceState.answers).length;

  const handleAnswerChange = (answerIndex: number) => {
    setPracticeState(prev => ({
      ...prev,
      answers: {
        ...prev.answers,
        [currentQuestion.id]: answerIndex
      }
    }));
  };

  const goToNextQuestion = () => {
    if (practiceState.currentQuestionIndex < totalQuestions - 1) {
      setPracticeState(prev => ({
        ...prev,
        currentQuestionIndex: prev.currentQuestionIndex + 1
      }));
    } else {
      // End of practice session
      setPracticeState(prev => ({ ...prev, sessionComplete: true }));
    }
  };

  const goToPreviousQuestion = () => {
    if (practiceState.currentQuestionIndex > 0) {
      setPracticeState(prev => ({
        ...prev,
        currentQuestionIndex: prev.currentQuestionIndex - 1
      }));
    }
  };

  const startPracticeSession = () => {
    setPracticeState(prev => ({
      ...prev,
      sessionStarted: true,
      answers: {},
      currentQuestionIndex: 0
    }));
  };

  const resetSession = () => {
    setPracticeState(prev => ({
      ...prev,
      sessionStarted: false,
      sessionComplete: false,
      answers: {},
      currentQuestionIndex: 0,
      showRationale: false,
      showAnswers: false
    }));
  };

  const toggleRationale = () => {
    setPracticeState(prev => ({
      ...prev,
      showRationale: !prev.showRationale
    }));
  };

  const toggleAnswers = () => {
    setPracticeState(prev => ({
      ...prev,
      showAnswers: !prev.showAnswers
    }));
  };

  // Session complete view
  if (practiceState.sessionComplete) {
    const correctAnswers = Object.entries(practiceState.answers).filter(([questionId, answerIndex]) => {
      const question = practiceState.filteredQuestions.find(q => q.id === questionId);
      return question && question.correctAnswer === answerIndex;
    }).length;

    const score = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;

    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="container py-6">
          <Card className="max-w-2xl mx-auto">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Practice Session Complete!</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <div className="space-y-2">
                <div className="text-4xl font-bold text-primary">{score}%</div>
                <p className="text-muted-foreground">
                  {correctAnswers} of {totalQuestions} questions correct
                </p>
              </div>
              
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-green-600">{correctAnswers}</div>
                  <div className="text-sm text-muted-foreground">Correct</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-600">{totalQuestions - correctAnswers}</div>
                  <div className="text-sm text-muted-foreground">Incorrect</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-600">{totalQuestions}</div>
                  <div className="text-sm text-muted-foreground">Total</div>
                </div>
              </div>
              
              <div className="flex justify-center gap-4 pt-4">
                <Button onClick={resetSession} variant="outline">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  New Session
                </Button>
                <Button asChild>
                  <a href="/dashboard">Return to Dashboard</a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // Setup view
  if (!practiceState.sessionStarted) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="container py-6 space-y-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">Practice Mode</h1>
            <p className="text-muted-foreground">
              Customize your practice session with filters and options
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Filter Options */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Filter Options
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Domain</label>
                    <Select
                      value={filterOptions.domain}
                      onValueChange={(value) => setFilterOptions(prev => ({ ...prev, domain: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {domains.map(domain => (
                          <SelectItem key={domain} value={domain}>
                            {domain === "all" ? "All Domains" : domain}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Difficulty</label>
                    <Select
                      value={filterOptions.difficulty}
                      onValueChange={(value) => setFilterOptions(prev => ({ ...prev, difficulty: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {difficulties.map(difficulty => (
                          <SelectItem key={difficulty} value={difficulty}>
                            {difficulty === "all" ? "All Difficulties" : difficulty}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Question Count</label>
                    <Select
                      value={filterOptions.questionCount.toString()}
                      onValueChange={(value) => setFilterOptions(prev => ({ ...prev, questionCount: parseInt(value) }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5 Questions</SelectItem>
                        <SelectItem value="10">10 Questions</SelectItem>
                        <SelectItem value="20">20 Questions</SelectItem>
                        <SelectItem value="30">30 Questions</SelectItem>
                        <SelectItem value="50">50 Questions</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="flagged"
                        checked={filterOptions.showOnlyFlagged}
                        onCheckedChange={(checked) => 
                          setFilterOptions(prev => ({ ...prev, showOnlyFlagged: !!checked }))
                        }
                      />
                      <label htmlFor="flagged" className="text-sm font-medium">
                        Only flagged questions
                      </label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="incorrect"
                        checked={filterOptions.showOnlyIncorrect}
                        onCheckedChange={(checked) => 
                          setFilterOptions(prev => ({ ...prev, showOnlyIncorrect: !!checked }))
                        }
                      />
                      <label htmlFor="incorrect" className="text-sm font-medium">
                        Only previously incorrect
                      </label>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Session Preview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Session Preview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Questions:</span>
                    <Badge variant="secondary">{practiceState.filteredQuestions.length}</Badge>
                  </div>
                  
                  {filterOptions.domain !== "all" && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Domain:</span>
                      <Badge variant="outline">{filterOptions.domain}</Badge>
                    </div>
                  )}
                  
                  {filterOptions.difficulty !== "all" && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Difficulty:</span>
                      <Badge variant="outline">{filterOptions.difficulty}</Badge>
                    </div>
                  )}
                  
                  {(filterOptions.showOnlyFlagged || filterOptions.showOnlyIncorrect) && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Filter:</span>
                      <div className="flex gap-1">
                        {filterOptions.showOnlyFlagged && (
                          <Badge variant="secondary">Flagged</Badge>
                        )}
                        {filterOptions.showOnlyIncorrect && (
                          <Badge variant="secondary">Incorrect</Badge>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <Button 
                  onClick={startPracticeSession}
                  className="w-full"
                  size="lg"
                  disabled={practiceState.filteredQuestions.length === 0}
                >
                  <Play className="h-5 w-5 mr-2" />
                  Start Practice Session
                </Button>

                {practiceState.filteredQuestions.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center">
                    No questions match the current filters
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  // Practice session view
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      
      <main className="container py-4">
        <div className="space-y-4">
          {/* Session Header */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h1 className="text-xl font-semibold">Practice Session</h1>
                  <p className="text-sm text-muted-foreground">
                    Question {practiceState.currentQuestionIndex + 1} of {totalQuestions}
                  </p>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={toggleRationale}
                      className={cn(practiceState.showRationale && "bg-blue-50 border-blue-200")}
                    >
                      <BookOpen className="h-4 w-4 mr-1" />
                      {practiceState.showRationale ? "Hide" : "Show"} Rationale
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={toggleAnswers}
                      className={cn(practiceState.showAnswers && "bg-green-50 border-green-200")}
                    >
                      {practiceState.showAnswers ? (
                        <EyeOff className="h-4 w-4 mr-1" />
                      ) : (
                        <Eye className="h-4 w-4 mr-1" />
                      )}
                      {practiceState.showAnswers ? "Hide" : "Show"} Answers
                    </Button>
                  </div>

                  <Button variant="ghost" size="sm" onClick={resetSession}>
                    <RotateCcw className="h-4 w-4 mr-1" />
                    Reset
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Question */}
          {currentQuestion && (
            <QuestionCard
              question={currentQuestion}
              currentAnswer={practiceState.answers[currentQuestion.id]}
              showRationale={practiceState.showRationale}
              showCorrectAnswer={practiceState.showAnswers}
              onAnswerChange={handleAnswerChange}
            />
          )}

          {/* Navigation */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  onClick={goToPreviousQuestion}
                  disabled={practiceState.currentQuestionIndex === 0}
                >
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Previous
                </Button>

                <div className="text-sm text-muted-foreground">
                  Progress: {practiceState.currentQuestionIndex + 1} / {totalQuestions}
                </div>

                {practiceState.currentQuestionIndex === totalQuestions - 1 ? (
                  <Button onClick={goToNextQuestion} className="bg-green-600 hover:bg-green-700">
                    <Check className="h-4 w-4 mr-2" />
                    Complete Session
                  </Button>
                ) : (
                  <Button onClick={goToNextQuestion}>
                    Next
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}