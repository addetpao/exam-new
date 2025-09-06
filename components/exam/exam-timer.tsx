"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, AlertTriangle, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ExamTimerProps {
  totalTimeMinutes: number;
  isActive?: boolean;
  onTimeEnd?: () => void;
  className?: string;
}

export function ExamTimer({ 
  totalTimeMinutes, 
  isActive = true, 
  onTimeEnd,
  className 
}: ExamTimerProps) {
  const [timeLeft, setTimeLeft] = useState(totalTimeMinutes * 60); // Convert to seconds
  const [isWarning, setIsWarning] = useState(false);
  const [isCritical, setIsCritical] = useState(false);

  useEffect(() => {
    if (!isActive || timeLeft <= 0) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        const newTime = prev - 1;
        
        // Set warning states
        const totalSeconds = totalTimeMinutes * 60;
        const warningThreshold = totalSeconds * 0.25; // 25% of total time
        const criticalThreshold = totalSeconds * 0.1; // 10% of total time
        
        setIsWarning(newTime <= warningThreshold && newTime > criticalThreshold);
        setIsCritical(newTime <= criticalThreshold && newTime > 0);
        
        if (newTime <= 0) {
          onTimeEnd?.();
          return 0;
        }
        
        return newTime;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, timeLeft, totalTimeMinutes, onTimeEnd]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  const getProgressPercentage = () => {
    const totalSeconds = totalTimeMinutes * 60;
    return ((totalSeconds - timeLeft) / totalSeconds) * 100;
  };

  const getTimerVariant = () => {
    if (isCritical) return "destructive";
    if (isWarning) return "secondary";
    return "default";
  };

  const getTimerIcon = () => {
    if (timeLeft <= 0) return CheckCircle;
    if (isCritical) return AlertTriangle;
    return Clock;
  };

  const TimerIcon = getTimerIcon();

  return (
    <Card className={cn("w-full", className)}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <TimerIcon 
              className={cn(
                "h-4 w-4",
                isCritical && "text-destructive animate-pulse",
                isWarning && "text-yellow-600",
                timeLeft <= 0 && "text-green-600"
              )} 
            />
            <span className="text-sm font-medium text-muted-foreground">
              {timeLeft <= 0 ? "Time Completed" : "Time Remaining"}
            </span>
          </div>
          
          <Badge 
            variant={timeLeft <= 0 ? "default" : getTimerVariant()}
            className={cn(
              "font-mono text-sm px-3 py-1",
              isCritical && "animate-pulse"
            )}
          >
            {formatTime(timeLeft)}
          </Badge>
        </div>
        
        {/* Progress bar */}
        <div className="mt-3">
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className={cn(
                "h-2 rounded-full transition-all duration-300",
                isCritical && "bg-destructive",
                isWarning && "bg-yellow-500",
                !isWarning && !isCritical && "bg-primary",
                timeLeft <= 0 && "bg-green-500"
              )}
              style={{ width: `${getProgressPercentage()}%` }}
            />
          </div>
        </div>

        {/* Status messages */}
        {isCritical && timeLeft > 0 && (
          <div className="mt-3 flex items-center space-x-2 text-destructive text-xs">
            <AlertTriangle className="h-3 w-3" />
            <span>Less than 10% time remaining</span>
          </div>
        )}
        
        {isWarning && !isCritical && (
          <div className="mt-3 flex items-center space-x-2 text-yellow-600 text-xs">
            <AlertTriangle className="h-3 w-3" />
            <span>Less than 25% time remaining</span>
          </div>
        )}
        
        {timeLeft <= 0 && (
          <div className="mt-3 flex items-center space-x-2 text-green-600 text-xs">
            <CheckCircle className="h-3 w-3" />
            <span>Exam time has ended</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}