"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Flag, HelpCircle, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Question {
  id: string;
  domain: string;
  difficulty: "Easy" | "Medium" | "Hard";
  type: "multiple-choice" | "performance-based";
  question: string;
  options: string[];
  correctAnswer: number;
  rationale: string;
  tags: string[];
  examVersion: string;
}

interface QuestionCardProps {
  question: Question;
  currentAnswer?: number;
  isFlagged?: boolean;
  showRationale?: boolean;
  showCorrectAnswer?: boolean;
  onAnswerChange?: (answer: number) => void;
  onFlag?: () => void;
  className?: string;
}

export function QuestionCard({
  question,
  currentAnswer,
  isFlagged = false,
  showRationale = false,
  showCorrectAnswer = false,
  onAnswerChange,
  onFlag,
  className
}: QuestionCardProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<string>(
    currentAnswer?.toString() || ""
  );

  const handleAnswerChange = (value: string) => {
    setSelectedAnswer(value);
    onAnswerChange?.(parseInt(value));
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Easy":
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300";
      case "Medium":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300";
      case "Hard":
        return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300";
    }
  };

  const isCorrectAnswer = (optionIndex: number) => {
    return showCorrectAnswer && optionIndex === question.correctAnswer;
  };

  const isIncorrectAnswer = (optionIndex: number) => {
    return showCorrectAnswer && 
           selectedAnswer && 
           parseInt(selectedAnswer) === optionIndex && 
           optionIndex !== question.correctAnswer;
  };

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-xs">
                {question.domain}
              </Badge>
              <Badge 
                variant="outline" 
                className={cn("text-xs", getDifficultyColor(question.difficulty))}
              >
                {question.difficulty}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {question.examVersion}
              </Badge>
              {question.type === "performance-based" && (
                <Badge variant="secondary" className="text-xs">
                  PBQ
                </Badge>
              )}
            </div>
            <CardTitle className="text-lg leading-relaxed">
              {question.question}
            </CardTitle>
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={onFlag}
            className={cn(
              "ml-4 flex-shrink-0",
              isFlagged && "text-yellow-600 hover:text-yellow-700"
            )}
            aria-label={isFlagged ? "Remove flag" : "Flag question"}
          >
            <Flag className={cn("h-4 w-4", isFlagged && "fill-current")} />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Answer Options */}
        <RadioGroup 
          value={selectedAnswer} 
          onValueChange={handleAnswerChange}
          className="space-y-3"
        >
          {question.options.map((option, index) => (
            <div
              key={index}
              className={cn(
                "flex items-center space-x-3 rounded-lg border p-4 transition-colors hover:bg-accent/50",
                isCorrectAnswer(index) && "border-green-500 bg-green-50 dark:bg-green-900/20",
                isIncorrectAnswer(index) && "border-red-500 bg-red-50 dark:bg-red-900/20"
              )}
            >
              <RadioGroupItem 
                value={index.toString()} 
                id={`option-${index}`}
                disabled={showCorrectAnswer}
              />
              <Label 
                htmlFor={`option-${index}`}
                className="flex-1 cursor-pointer text-sm leading-relaxed"
              >
                {option}
              </Label>
              
              {/* Answer indicators */}
              {showCorrectAnswer && (
                <div className="flex-shrink-0">
                  {isCorrectAnswer(index) && (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  )}
                  {isIncorrectAnswer(index) && (
                    <XCircle className="h-5 w-5 text-red-600" />
                  )}
                </div>
              )}
            </div>
          ))}
        </RadioGroup>

        {/* Rationale Section */}
        {showRationale && (
          <>
            <Separator />
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <HelpCircle className="h-4 w-4 text-blue-600" />
                <h4 className="font-medium text-sm">Explanation</h4>
              </div>
              <div className="text-sm text-muted-foreground leading-relaxed bg-muted/30 rounded-lg p-4">
                {question.rationale}
              </div>
            </div>
          </>
        )}

        {/* Tags */}
        {question.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {question.tags.map((tag, index) => (
              <Badge
                key={index}
                variant="secondary"
                className="text-xs px-2 py-1"
              >
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}