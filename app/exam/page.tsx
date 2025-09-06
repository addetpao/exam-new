"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { QuestionCard } from "@/components/exam/question-card";
import { QuestionNavigator } from "@/components/exam/question-navigator";
import { ExamTimer } from "@/components/exam/exam-timer";
import { AppHeader } from "@/components/layout/app-header";
import { 
  ChevronLeft, 
  ChevronRight, 
  Flag, 
  Grid3X3, 
  Check,
  AlertTriangle,
  RotateCcw
} from "lucide-react";
import { cn } from "@/lib/utils";

// Mock exam data - replace with real data from API
const mockExamQuestions = Array.from({ length: 90 }, (_, i) => ({
  id: (i + 1).toString(),
  domain: ["Mobile Devices", "Networking", "Hardware", "Virtualization", "Troubleshooting", "OS Installation"][i % 6],
  difficulty: ["Easy", "Medium", "Hard"][i % 3] as "Easy" | "Medium" | "Hard",
  type: "multiple-choice" as const,
  question: `Sample exam question ${i + 1}. This is a comprehensive question that tests your understanding of CompTIA A+ concepts and requires careful analysis to determine the correct answer.`,
  options: [
    `Option A for question ${i + 1}`,
    `Option B for question ${i + 1}`,
    `Option C for question ${i + 1}`,
    `Option D for question ${i + 1}`
  ],
  correctAnswer: i % 4,
  rationale: `This is the detailed explanation for question ${i + 1}. The correct answer demonstrates understanding of key CompTIA A+ principles and best practices in IT support.`,
  tags: ["exam", "comptia", "certification"],
  examVersion: "220-1101"
}));

interface ExamState {
  currentQuestionIndex: number;
  answers: Record<string, number>;
  flaggedQuestions: Set<string>;
  timeLeft: number;
  showNavigator: boolean;
  isSubmitted: boolean;
}

export default function ExamPage() {
  const [examState, setExamState] = useState<ExamState>({
    currentQuestionIndex: 0,
    answers: {},
    flaggedQuestions: new Set(),
    timeLeft: 90 * 60, // 90 minutes in seconds
    showNavigator: false,
    isSubmitted: false
  });

  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [showTimeEndDialog, setShowTimeEndDialog] = useState(false);

  const currentQuestion = mockExamQuestions[examState.currentQuestionIndex];
  const totalQuestions = mockExamQuestions.length;
  const answeredCount = Object.keys(examState.answers).length;
  const flaggedCount = examState.flaggedQuestions.size;

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (examState.isSubmitted) return;

      switch (event.key) {
        case "1":
        case "2":
        case "3":
        case "4":
          event.preventDefault();
          const answerIndex = parseInt(event.key) - 1;
          if (answerIndex < currentQuestion.options.length) {
            handleAnswerChange(answerIndex);
          }
          break;
        case "ArrowLeft":
        case "p":
        case "P":
          event.preventDefault();
          goToPreviousQuestion();
          break;
        case "ArrowRight":
        case "n":
        case "N":
          event.preventDefault();
          goToNextQuestion();
          break;
        case "f":
        case "F":
          event.preventDefault();
          toggleFlag();
          break;
        case "g":
        case "G":
          event.preventDefault();
          setExamState(prev => ({ ...prev, showNavigator: !prev.showNavigator }));
          break;
        case "Enter":
          if (event.ctrlKey) {
            event.preventDefault();
            setShowSubmitDialog(true);
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [examState.currentQuestionIndex, examState.isSubmitted, currentQuestion.options.length]);

  const handleAnswerChange = (answerIndex: number) => {
    setExamState(prev => ({
      ...prev,
      answers: {
        ...prev.answers,
        [currentQuestion.id]: answerIndex
      }
    }));
  };

  const toggleFlag = () => {
    setExamState(prev => {
      const newFlagged = new Set(prev.flaggedQuestions);
      if (newFlagged.has(currentQuestion.id)) {
        newFlagged.delete(currentQuestion.id);
      } else {
        newFlagged.add(currentQuestion.id);
      }
      return { ...prev, flaggedQuestions: newFlagged };
    });
  };

  const goToNextQuestion = () => {
    if (examState.currentQuestionIndex < totalQuestions - 1) {
      setExamState(prev => ({
        ...prev,
        currentQuestionIndex: prev.currentQuestionIndex + 1
      }));
    }
  };

  const goToPreviousQuestion = () => {
    if (examState.currentQuestionIndex > 0) {
      setExamState(prev => ({
        ...prev,
        currentQuestionIndex: prev.currentQuestionIndex - 1
      }));
    }
  };

  const goToQuestion = (index: number) => {
    setExamState(prev => ({
      ...prev,
      currentQuestionIndex: index,
      showNavigator: false
    }));
  };

  const handleTimeEnd = useCallback(() => {
    setShowTimeEndDialog(true);
  }, []);

  const submitExam = () => {
    setExamState(prev => ({ ...prev, isSubmitted: true }));
    setShowSubmitDialog(false);
    setShowTimeEndDialog(false);
    // Here you would submit to API
    console.log("Exam submitted", { answers: examState.answers });
  };

  const restartExam = () => {
    setExamState({
      currentQuestionIndex: 0,
      answers: {},
      flaggedQuestions: new Set(),
      timeLeft: 90 * 60,
      showNavigator: false,
      isSubmitted: false
    });
    setShowSubmitDialog(false);
    setShowTimeEndDialog(false);
  };

  // Convert questions to navigator format
  const navigatorQuestions = mockExamQuestions.map(q => ({
    id: q.id,
    answered: examState.answers.hasOwnProperty(q.id),
    flagged: examState.flaggedQuestions.has(q.id)
  }));

  if (examState.isSubmitted) {
    const score = Math.round((answeredCount / totalQuestions) * 100);
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="container py-6">
          <Card className="max-w-2xl mx-auto">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Exam Completed!</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <div className="space-y-2">
                <div className="text-4xl font-bold text-green-600">{score}%</div>
                <p className="text-muted-foreground">
                  You answered {answeredCount} of {totalQuestions} questions
                </p>
              </div>
              
              <div className="flex justify-center gap-4">
                <Button onClick={restartExam} variant="outline">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Retake Exam
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

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      
      <main className="container py-4">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left Column - Question */}
          <div className="flex-1 space-y-4">
            {/* Exam Header */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h1 className="text-xl font-semibold">CompTIA A+ Practice Exam</h1>
                    <p className="text-sm text-muted-foreground">
                      Question {examState.currentQuestionIndex + 1} of {totalQuestions}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Answered:</span>
                    <span className="font-medium">{answeredCount}/{totalQuestions}</span>
                    {flaggedCount > 0 && (
                      <>
                        <span className="text-muted-foreground">• Flagged:</span>
                        <span className="font-medium text-yellow-600">{flaggedCount}</span>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Question Card */}
            <QuestionCard
              question={currentQuestion}
              currentAnswer={examState.answers[currentQuestion.id]}
              isFlagged={examState.flaggedQuestions.has(currentQuestion.id)}
              onAnswerChange={handleAnswerChange}
              onFlag={toggleFlag}
            />

            {/* Navigation Controls */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <Button
                    variant="outline"
                    onClick={goToPreviousQuestion}
                    disabled={examState.currentQuestionIndex === 0}
                  >
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    Previous
                  </Button>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setExamState(prev => ({ ...prev, showNavigator: !prev.showNavigator }))}
                    >
                      <Grid3X3 className="h-4 w-4 mr-2" />
                      Navigator
                    </Button>

                    <Button
                      variant="outline"
                      onClick={toggleFlag}
                      className={cn(
                        examState.flaggedQuestions.has(currentQuestion.id) && "text-yellow-600 border-yellow-600"
                      )}
                    >
                      <Flag className={cn(
                        "h-4 w-4 mr-2",
                        examState.flaggedQuestions.has(currentQuestion.id) && "fill-current"
                      )} />
                      Flag
                    </Button>
                  </div>

                  {examState.currentQuestionIndex === totalQuestions - 1 ? (
                    <Button
                      onClick={() => setShowSubmitDialog(true)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Submit Exam
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

          {/* Right Column - Timer & Navigator */}
          <div className="lg:w-80 space-y-4">
            <ExamTimer
              totalTimeMinutes={90}
              isActive={!examState.isSubmitted}
              onTimeEnd={handleTimeEnd}
            />

            {examState.showNavigator && (
              <QuestionNavigator
                questions={navigatorQuestions}
                currentQuestionIndex={examState.currentQuestionIndex}
                onQuestionSelect={goToQuestion}
              />
            )}
          </div>
        </div>
      </main>

      {/* Submit Confirmation Dialog */}
      <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Exam</DialogTitle>
            <DialogDescription>
              Are you sure you want to submit your exam? You have answered{" "}
              {answeredCount} of {totalQuestions} questions.
              {answeredCount < totalQuestions && (
                <span className="text-yellow-600 font-medium">
                  {" "}You still have {totalQuestions - answeredCount} unanswered questions.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSubmitDialog(false)}>
              Continue Exam
            </Button>
            <Button onClick={submitExam}>Submit Exam</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Time End Dialog */}
      <Dialog open={showTimeEndDialog} onOpenChange={setShowTimeEndDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              Time Expired
            </DialogTitle>
            <DialogDescription>
              Your exam time has ended. Your exam will be automatically submitted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={submitExam}>Submit Exam</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Keyboard Shortcuts Help */}
      <div className="fixed bottom-4 right-4 bg-muted rounded-lg p-3 text-xs max-w-xs">
        <p className="font-medium mb-2">Keyboard Shortcuts:</p>
        <div className="space-y-1 text-muted-foreground">
          <div>1-4: Select answer</div>
          <div>N/P: Next/Previous</div>
          <div>F: Flag question</div>
          <div>G: Toggle navigator</div>
          <div>Ctrl+Enter: Submit exam</div>
        </div>
      </div>
    </div>
  );
}