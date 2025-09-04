export default function HomePage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          ExamPrep Platform
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          CompTIA A+ 220-1101/1102 Exam Preparation
        </p>
        <div className="space-y-4">
          <p className="text-gray-500">
            Next.js 14 with TypeScript - Ready for Development
          </p>
          <div className="flex justify-center space-x-4 text-sm text-gray-400">
            <span>✓ TypeScript Configured</span>
            <span>✓ App Router Ready</span>
            <span>✓ Build System Active</span>
          </div>
        </div>
      </div>
    </main>
  );
}