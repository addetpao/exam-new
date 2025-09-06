"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AppHeader } from "@/components/layout/app-header";
import {
  BookOpen,
  Target,
  Clock,
  TrendingUp,
  Award,
  PlayCircle,
  BarChart3,
  Calendar,
  CheckCircle2
} from "lucide-react";
import Link from "next/link";

// Mock data - replace with real data from API
const mockData = {
  user: {
    name: "John Doe",
    plan: "Premium",
    subscriptionEnd: "2024-12-31"
  },
  progress: {
    overallScore: 78,
    questionsAnswered: 245,
    totalQuestions: 1200,
    studyStreak: 7,
    completedDomains: 3,
    totalDomains: 6
  },
  recentSessions: [
    {
      id: "1",
      type: "Practice",
      domain: "Mobile Devices",
      score: 82,
      questionsCount: 25,
      date: "2024-09-05",
      timeSpent: "18 min"
    },
    {
      id: "2", 
      type: "Exam",
      domain: "Mixed Topics",
      score: 76,
      questionsCount: 90,
      date: "2024-09-04",
      timeSpent: "85 min"
    },
    {
      id: "3",
      type: "Practice", 
      domain: "Networking",
      score: 88,
      questionsCount: 30,
      date: "2024-09-03",
      timeSpent: "22 min"
    }
  ],
  domains: [
    { name: "Mobile Devices", progress: 85, mastered: true },
    { name: "Networking", progress: 92, mastered: true },
    { name: "Hardware", progress: 65, mastered: false },
    { name: "Virtualization", progress: 45, mastered: false },
    { name: "Troubleshooting", progress: 72, mastered: false },
    { name: "OS Installation", progress: 58, mastered: false }
  ]
};

export default function DashboardPage() {
  const { user, progress, recentSessions, domains } = mockData;

  const getScoreColor = (score: number) => {
    if (score >= 85) return "text-green-600";
    if (score >= 70) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBadgeVariant = (score: number): "default" | "secondary" | "destructive" | "outline" => {
    if (score >= 85) return "default";
    if (score >= 70) return "secondary";
    return "destructive";
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      
      <main className="container py-6 space-y-6">
        {/* Welcome Section */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Welcome back, {user.name}!</h1>
          <p className="text-muted-foreground">
            Continue your CompTIA A+ 220-1101/1102 certification journey
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overall Score</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{progress.overallScore}%</div>
              <p className="text-xs text-muted-foreground">
                +2% from last week
              </p>
              <Progress value={progress.overallScore} className="mt-3" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Questions Answered</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{progress.questionsAnswered}</div>
              <p className="text-xs text-muted-foreground">
                of {progress.totalQuestions} total
              </p>
              <Progress 
                value={(progress.questionsAnswered / progress.totalQuestions) * 100} 
                className="mt-3" 
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Study Streak</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{progress.studyStreak} days</div>
              <p className="text-xs text-muted-foreground">
                Keep it up!
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Domains Mastered</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {progress.completedDomains}/{progress.totalDomains}
              </div>
              <p className="text-xs text-muted-foreground">
                {Math.round((progress.completedDomains / progress.totalDomains) * 100)}% complete
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Link href="/practice" className="block">
                <Button className="w-full justify-start" size="lg">
                  <PlayCircle className="h-5 w-5 mr-2" />
                  Start Practice Session
                </Button>
              </Link>
              
              <Link href="/exam" className="block">
                <Button variant="outline" className="w-full justify-start" size="lg">
                  <BarChart3 className="h-5 w-5 mr-2" />
                  Take Full Exam (90Q/90min)
                </Button>
              </Link>
              
              <div className="grid grid-cols-2 gap-2">
                <Link href="/practice?domain=weak" className="block">
                  <Button variant="secondary" className="w-full" size="sm">
                    <TrendingUp className="h-4 w-4 mr-1" />
                    Weak Areas
                  </Button>
                </Link>
                
                <Link href="/practice?flagged=true" className="block">
                  <Button variant="secondary" className="w-full" size="sm">
                    <BookOpen className="h-4 w-4 mr-1" />
                    Review Flagged
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Recent Sessions */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Sessions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentSessions.map((session) => (
                <div key={session.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={session.type === "Exam" ? "default" : "secondary"}>
                        {session.type}
                      </Badge>
                      <span className="text-sm font-medium">{session.domain}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{session.questionsCount}Q</span>
                      <span>•</span>
                      <span>{session.timeSpent}</span>
                      <span>•</span>
                      <span>{session.date}</span>
                    </div>
                  </div>
                  <Badge variant={getScoreBadgeVariant(session.score)}>
                    {session.score}%
                  </Badge>
                </div>
              ))}
              
              <Link href="/dashboard/history" className="block">
                <Button variant="ghost" className="w-full" size="sm">
                  View All Sessions
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Domain Progress */}
        <Card>
          <CardHeader>
            <CardTitle>Domain Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {domains.map((domain, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{domain.name}</span>
                    <div className="flex items-center gap-1">
                      {domain.mastered && (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      )}
                      <span className="text-sm text-muted-foreground">
                        {domain.progress}%
                      </span>
                    </div>
                  </div>
                  <Progress value={domain.progress} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}