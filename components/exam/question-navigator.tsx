"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Flag, CheckCircle2, Circle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Question {
  id: string;
  answered: boolean;
  flagged: boolean;
}

interface QuestionNavigatorProps {
  questions: Question[];
  currentQuestionIndex: number;
  onQuestionSelect: (index: number) => void;
  className?: string;
}

export function QuestionNavigator({
  questions,
  currentQuestionIndex,
  onQuestionSelect,
  className
}: QuestionNavigatorProps) {
  const answeredCount = questions.filter(q => q.answered).length;
  const flaggedCount = questions.filter(q => q.flagged).length;
  const unansweredCount = questions.length - answeredCount;

  const getQuestionStatus = (question: Question, index: number) => {
    const isCurrent = index === currentQuestionIndex;
    const isAnswered = question.answered;
    const isFlagged = question.flagged;

    if (isCurrent) {
      return {
        variant: "default" as const,
        className: "bg-primary text-primary-foreground",
        icon: Circle
      };
    }

    if (isFlagged && isAnswered) {
      return {
        variant: "secondary" as const,
        className: "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/20 dark:text-yellow-300",
        icon: Flag
      };
    }

    if (isFlagged) {
      return {
        variant: "outline" as const,
        className: "border-yellow-500 text-yellow-600 hover:bg-yellow-50 dark:border-yellow-400 dark:text-yellow-400",
        icon: Flag
      };
    }

    if (isAnswered) {
      return {
        variant: "secondary" as const,
        className: "bg-green-100 text-green-800 border-green-300 dark:bg-green-900/20 dark:text-green-300",
        icon: CheckCircle2
      };
    }

    return {
      variant: "outline" as const,
      className: "hover:bg-accent",
      icon: Circle
    };
  };

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">Question Navigator</CardTitle>
        <div className="flex flex-wrap gap-2 text-sm">
          <Badge variant="secondary" className="flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Answered: {answeredCount}
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <Circle className="h-3 w-3" />
            Unanswered: {unansweredCount}
          </Badge>
          {flaggedCount > 0 && (
            <Badge variant="secondary" className="flex items-center gap-1 text-yellow-700 bg-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-300">
              <Flag className="h-3 w-3" />
              Flagged: {flaggedCount}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-2">
          {questions.map((question, index) => {
            const status = getQuestionStatus(question, index);
            const StatusIcon = status.icon;
            
            return (
              <Button
                key={question.id}
                variant={status.variant}
                size="sm"
                onClick={() => onQuestionSelect(index)}
                className={cn(
                  "h-9 w-9 p-0 relative flex items-center justify-center text-xs font-medium",
                  status.className
                )}
                aria-label={`Question ${index + 1}${question.answered ? " (answered)" : " (unanswered)"}${question.flagged ? " (flagged)" : ""}`}
              >
                <span className="absolute inset-0 flex items-center justify-center">
                  {index + 1}
                </span>
                
                {/* Status indicators */}
                <div className="absolute -top-1 -right-1 flex flex-col gap-0.5">
                  {question.flagged && (
                    <Flag 
                      className="h-2.5 w-2.5 text-yellow-600 dark:text-yellow-400" 
                      fill="currentColor"
                    />
                  )}
                  {question.answered && !question.flagged && index !== currentQuestionIndex && (
                    <CheckCircle2 className="h-2.5 w-2.5 text-green-600 dark:text-green-400" />
                  )}
                </div>
              </Button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-4 pt-4 border-t space-y-2">
          <p className="text-xs font-medium text-muted-foreground mb-2">Legend:</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-primary rounded flex items-center justify-center">
                <span className="text-[10px] text-primary-foreground font-medium">1</span>
              </div>
              <span className="text-muted-foreground">Current</span>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-100 border border-green-300 dark:bg-green-900/20 rounded flex items-center justify-center">
                <CheckCircle2 className="h-2 w-2 text-green-600" />
              </div>
              <span className="text-muted-foreground">Answered</span>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border rounded flex items-center justify-center">
                <Circle className="h-2 w-2 text-muted-foreground" />
              </div>
              <span className="text-muted-foreground">Unanswered</span>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-100 border border-yellow-300 dark:bg-yellow-900/20 rounded flex items-center justify-center">
                <Flag className="h-2 w-2 text-yellow-600 dark:text-yellow-400" fill="currentColor" />
              </div>
              <span className="text-muted-foreground">Flagged</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}