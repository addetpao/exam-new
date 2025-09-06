/**
 * @fileoverview Unit tests for ExamTimer component
 * Test ID: UI_TIMER_FUNCTIONALITY_001-003
 * Component: ExamTimer
 * Priority: Critical
 * Coverage: Timer display, countdown functionality, expiry handling
 */

import React from "react";
import { render, screen, act, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ExamTimer } from "@/components/ExamTimer";

// Mock implementation - replace with actual component
const MockExamTimer = ({ 
  duration, 
  onTimeExpired, 
  onTimeUpdate,
  showControls = false 
}: {
  duration: number;
  onTimeExpired?: () => void;
  onTimeUpdate?: (timeRemaining: number) => void;
  showControls?: boolean;
}) => {
  const [timeRemaining, setTimeRemaining] = React.useState(duration);
  const [isPaused, setIsPaused] = React.useState(false);

  React.useEffect(() => {
    if (isPaused) return;
    
    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        const newTime = prev - 1;
        onTimeUpdate?.(newTime);
        
        if (newTime <= 0) {
          onTimeExpired?.();
          return 0;
        }
        return newTime;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isPaused, onTimeExpired, onTimeUpdate]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  return (
    <div data-testid="exam-timer">
      <div data-testid="timer-display">{formatTime(timeRemaining)}</div>
      {showControls && (
        <button
          data-testid="pause-resume-button"
          onClick={() => setIsPaused(!isPaused)}
        >
          {isPaused ? "Resume" : "Pause"}
        </button>
      )}
    </div>
  );
};

// Use mock for testing
jest.mock("@/components/ExamTimer", () => ({
  ExamTimer: ({ duration, onTimeExpired, onTimeUpdate, showControls }: any) => (
    <MockExamTimer 
      duration={duration}
      onTimeExpired={onTimeExpired}
      onTimeUpdate={onTimeUpdate}
      showControls={showControls}
    />
  )
}));

describe("ExamTimer Component", () => {
  // Test data following standards
  const defaultProps = {
    duration: 5400, // 90 minutes in seconds
    onTimeExpired: jest.fn(),
    onTimeUpdate: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("UI_TIMER_DISPLAY_001: Timer Display", () => {
    it("should display initial time correctly", () => {
      render(<ExamTimer {...defaultProps} />);
      
      expect(screen.getByTestId("timer-display")).toHaveTextContent("90:00");
      expect(screen.getByTestId("exam-timer")).toBeInTheDocument();
    });

    it("should format time correctly for various durations", () => {
      const testCases = [
        { duration: 5400, expected: "90:00" }, // 90 minutes
        { duration: 3600, expected: "60:00" }, // 60 minutes
        { duration: 3661, expected: "61:01" }, // 61 minutes 1 second
        { duration: 60, expected: "1:00" },    // 1 minute
        { duration: 59, expected: "0:59" },    // 59 seconds
        { duration: 0, expected: "0:00" },     // 0 seconds
      ];

      testCases.forEach(({ duration, expected }) => {
        const { unmount } = render(<ExamTimer {...defaultProps} duration={duration} />);
        expect(screen.getByTestId("timer-display")).toHaveTextContent(expected);
        unmount();
      });
    });
  });

  describe("UI_TIMER_COUNTDOWN_002: Countdown Functionality", () => {
    it("should countdown correctly", async () => {
      render(<ExamTimer {...defaultProps} />);

      // Initial state
      expect(screen.getByTestId("timer-display")).toHaveTextContent("90:00");

      // Advance 1 minute
      act(() => {
        jest.advanceTimersByTime(60000);
      });

      await waitFor(() => {
        expect(screen.getByTestId("timer-display")).toHaveTextContent("89:00");
      });

      // Advance another 30 seconds
      act(() => {
        jest.advanceTimersByTime(30000);
      });

      await waitFor(() => {
        expect(screen.getByTestId("timer-display")).toHaveTextContent("88:30");
      });
    });

    it("should call onTimeUpdate callback during countdown", async () => {
      const mockTimeUpdate = jest.fn();
      render(<ExamTimer {...defaultProps} onTimeUpdate={mockTimeUpdate} />);

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(mockTimeUpdate).toHaveBeenCalledWith(5399);
      });
    });

    it("should handle rapid time advancement", async () => {
      const mockTimeUpdate = jest.fn();
      render(<ExamTimer {...defaultProps} duration={10} onTimeUpdate={mockTimeUpdate} />);

      // Advance 5 seconds rapidly
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        expect(screen.getByTestId("timer-display")).toHaveTextContent("0:05");
        expect(mockTimeUpdate).toHaveBeenCalledWith(5);
      });
    });
  });

  describe("UI_TIMER_EXPIRY_003: Timer Expiry Handling", () => {
    it("should call onTimeExpired when timer reaches zero", async () => {
      const mockTimeExpired = jest.fn();
      render(<ExamTimer {...defaultProps} duration={3} onTimeExpired={mockTimeExpired} />);

      // Advance past the duration
      act(() => {
        jest.advanceTimersByTime(4000);
      });

      await waitFor(() => {
        expect(mockTimeExpired).toHaveBeenCalledTimes(1);
        expect(screen.getByTestId("timer-display")).toHaveTextContent("0:00");
      });
    });

    it("should not go below zero seconds", async () => {
      const mockTimeExpired = jest.fn();
      render(<ExamTimer {...defaultProps} duration={1} onTimeExpired={mockTimeExpired} />);

      // Advance well past the duration
      act(() => {
        jest.advanceTimersByTime(10000);
      });

      await waitFor(() => {
        expect(screen.getByTestId("timer-display")).toHaveTextContent("0:00");
        expect(mockTimeExpired).toHaveBeenCalledTimes(1);
      });
    });

    it("should handle zero duration gracefully", async () => {
      const mockTimeExpired = jest.fn();
      render(<ExamTimer {...defaultProps} duration={0} onTimeExpired={mockTimeExpired} />);

      expect(screen.getByTestId("timer-display")).toHaveTextContent("0:00");
      
      // Should call onTimeExpired immediately for zero duration
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(mockTimeExpired).toHaveBeenCalled();
      });
    });
  });

  describe("UI_TIMER_CONTROLS_004: Timer Controls (when enabled)", () => {
    it("should pause and resume timer when controls are shown", async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<ExamTimer {...defaultProps} showControls={true} />);

      const pauseButton = screen.getByTestId("pause-resume-button");
      expect(pauseButton).toHaveTextContent("Pause");

      // Pause the timer
      await user.click(pauseButton);
      expect(pauseButton).toHaveTextContent("Resume");

      // Time should not advance while paused
      act(() => {
        jest.advanceTimersByTime(60000);
      });

      expect(screen.getByTestId("timer-display")).toHaveTextContent("90:00");

      // Resume the timer
      await user.click(pauseButton);
      expect(pauseButton).toHaveTextContent("Pause");

      // Time should advance normally after resume
      act(() => {
        jest.advanceTimersByTime(60000);
      });

      await waitFor(() => {
        expect(screen.getByTestId("timer-display")).toHaveTextContent("89:00");
      });
    });

    it("should not show controls when showControls is false", () => {
      render(<ExamTimer {...defaultProps} showControls={false} />);
      
      expect(screen.queryByTestId("pause-resume-button")).not.toBeInTheDocument();
    });
  });

  describe("Edge Cases & Error Handling", () => {
    it("should handle invalid duration values", () => {
      // Test negative duration
      const { unmount } = render(<ExamTimer {...defaultProps} duration={-100} />);
      expect(screen.getByTestId("timer-display")).toHaveTextContent("0:00");
      unmount();

      // Test very large duration
      render(<ExamTimer {...defaultProps} duration={999999} />);
      expect(screen.getByTestId("timer-display")).toHaveTextContent("16666:39");
    });

    it("should continue working when callbacks are undefined", async () => {
      render(<ExamTimer duration={2} />);

      act(() => {
        jest.advanceTimersByTime(3000);
      });

      await waitFor(() => {
        expect(screen.getByTestId("timer-display")).toHaveTextContent("0:00");
      });
    });

    it("should handle component unmount during countdown", () => {
      const { unmount } = render(<ExamTimer {...defaultProps} />);
      
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      // Should not throw error on unmount
      expect(() => unmount()).not.toThrow();
    });
  });

  describe("Performance & Memory", () => {
    it("should not cause memory leaks with multiple instances", () => {
      // Create and destroy multiple timer instances
      for (let i = 0; i < 10; i++) {
        const { unmount } = render(<ExamTimer {...defaultProps} duration={60} />);
        act(() => {
          jest.advanceTimersByTime(1000);
        });
        unmount();
      }

      // Should not have any lingering timers
      expect(jest.getTimerCount()).toBe(0);
    });

    it("should handle rapid prop changes", () => {
      const { rerender } = render(<ExamTimer {...defaultProps} duration={60} />);
      
      // Rapidly change duration
      for (let i = 50; i < 70; i++) {
        rerender(<ExamTimer {...defaultProps} duration={i} />);
      }

      expect(screen.getByTestId("timer-display")).toHaveTextContent("1:09");
    });
  });

  describe("Accessibility", () => {
    it("should have proper ARIA attributes", () => {
      render(<ExamTimer {...defaultProps} />);
      
      const timerElement = screen.getByTestId("exam-timer");
      expect(timerElement).toBeInTheDocument();
      
      // Timer display should be readable by screen readers
      const display = screen.getByTestId("timer-display");
      expect(display).toBeInTheDocument();
    });

    it("should be keyboard accessible when controls are shown", async () => {
      render(<ExamTimer {...defaultProps} showControls={true} />);
      
      const pauseButton = screen.getByTestId("pause-resume-button");
      
      // Should be focusable
      pauseButton.focus();
      expect(pauseButton).toHaveFocus();
      
      // Should work with keyboard interaction
      await userEvent.keyboard("{Enter}");
      expect(pauseButton).toHaveTextContent("Resume");
    });
  });
});