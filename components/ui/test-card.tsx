import { useState } from "react";

export function TestCard() {
  const [isDark, setIsDark] = useState(false);

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle("dark");
  };

  return (
    <div className="bg-card border rounded-lg p-6 space-y-4 max-w-sm">
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-card-foreground">
          TailwindCSS Test Component
        </h3>
        <p className="text-sm text-muted-foreground">
          This component tests various Tailwind utilities and design tokens.
        </p>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Theme</span>
          <button
            onClick={toggleTheme}
            className="bg-primary text-primary-foreground px-3 py-1 rounded-md text-xs font-medium hover:bg-primary/90 transition-colors"
          >
            {isDark ? "Light" : "Dark"}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-secondary text-secondary-foreground p-2 rounded">
            Secondary
          </div>
          <div className="bg-muted text-muted-foreground p-2 rounded">
            Muted
          </div>
          <div className="bg-accent text-accent-foreground p-2 rounded">
            Accent
          </div>
          <div className="bg-destructive text-destructive-foreground p-2 rounded">
            Destructive
          </div>
        </div>

        <div className="space-y-2">
          <div className="h-2 bg-border rounded-full overflow-hidden">
            <div className="h-full bg-ring w-3/4 animate-pulse-slow"></div>
          </div>
          <p className="text-xs text-muted-foreground">
            Progress bar with custom animation
          </p>
        </div>
      </div>
    </div>
  );
}
