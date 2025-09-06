"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { TestCard } from "@/components/ui/test-card";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to dashboard after a brief moment to show the landing page
    const timer = setTimeout(() => {
      router.push("/dashboard");
    }, 2000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-foreground animate-fade-in">
            ExamPrep Platform
          </h1>
          <p className="text-xl text-muted-foreground">
            CompTIA A+ 220-1101/1102 Exam Preparation
          </p>
        </div>

        <div className="bg-card rounded-lg border p-6 space-y-4 max-w-md mx-auto animate-slide-in">
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-card-foreground">
              Platform Ready
            </h2>
            <div className="grid gap-2 text-sm">
              <div className="flex items-center justify-between py-1">
                <span className="text-muted-foreground">UI Components</span>
                <span className="text-green-600 font-medium">✔ Active</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-muted-foreground">Dashboard</span>
                <span className="text-green-600 font-medium">✔ Ready</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-muted-foreground">Exam Mode</span>
                <span className="text-green-600 font-medium">✔ Active</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-muted-foreground">Practice Mode</span>
                <span className="text-green-600 font-medium">✔ Active</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t">
            <p className="text-xs text-muted-foreground">
              Redirecting to dashboard...
            </p>
          </div>
        </div>

        <div className="flex justify-center pt-8">
          <TestCard />
        </div>
      </div>
    </main>
  );
}
