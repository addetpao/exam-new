"use client";

import { TestCard } from "@/components/ui/test-card";

export default function HomePage() {
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
              Platform Status
            </h2>
            <div className="grid gap-2 text-sm">
              <div className="flex items-center justify-between py-1">
                <span className="text-muted-foreground">TypeScript</span>
                <span className="text-green-600 font-medium">✓ Configured</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-muted-foreground">App Router</span>
                <span className="text-green-600 font-medium">✓ Ready</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-muted-foreground">TailwindCSS</span>
                <span className="text-green-600 font-medium">✓ Active</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-muted-foreground">Build System</span>
                <span className="text-green-600 font-medium">✓ Active</span>
              </div>
            </div>
          </div>
          
          <div className="pt-4 border-t">
            <p className="text-xs text-muted-foreground">
              Next.js 14 • Ready for shadcn/ui integration
            </p>
          </div>
        </div>
        
        <div className="flex justify-center">
          <button className="bg-primary text-primary-foreground px-6 py-2 rounded-md font-medium hover:bg-primary/90 transition-colors">
            Start Building
          </button>
        </div>

        <div className="flex justify-center pt-8">
          <TestCard />
        </div>
      </div>
    </main>
  );
}
"use client";

import { TestCard } from "@/components/ui/test-card";

export default function HomePage() {
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
              Platform Status
            </h2>
            <div className="grid gap-2 text-sm">
              <div className="flex items-center justify-between py-1">
                <span className="text-muted-foreground">TypeScript</span>
                <span className="text-green-600 font-medium">✔ Configured</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-muted-foreground">App Router</span>
                <span className="text-green-600 font-medium">✔ Ready</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-muted-foreground">TailwindCSS</span>
                <span className="text-green-600 font-medium">✔ Active</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-muted-foreground">Build System</span>
                <span className="text-green-600 font-medium">✔ Active</span>
              </div>
            </div>
          </div>
          
          <div className="pt-4 border-t">
            <p className="text-xs text-muted-foreground">Next.js 14 — Ready for shadcn/ui integration</p>
          </div>
        </div>
        
        <div className="flex justify-center">
          <button className="bg-primary text-primary-foreground px-6 py-2 rounded-md font-medium hover:bg-primary/90 transition-colors">
            Start Building
          </button>
        </div>

        <div className="flex justify-center pt-8">
          <TestCard />
        </div>
      </div>
    </main>
  );
}
