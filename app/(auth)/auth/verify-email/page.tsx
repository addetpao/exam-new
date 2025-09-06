"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth/hooks";
import { createClient } from "@/lib/auth/client";

/**
 * Email Verification Page
 * Shown to users who haven't verified their email address
 */
export default function VerifyEmailPage() {
  const { user, loading } = useAuth();
  const [resending, setResending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const supabase = createClient();

  const handleResendVerification = async () => {
    if (!user?.email) return;

    setResending(true);
    setMessage("");
    setError("");

    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: user.email,
      });

      if (error) {
        setError("Failed to resend verification email. Please try again.");
      } else {
        setMessage("Verification email sent! Please check your inbox.");
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setResending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-yellow-100">
            <svg
              className="h-6 w-6 text-yellow-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>

          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Verify your email address
          </h2>

          <p className="mt-2 text-center text-sm text-gray-600">
            We sent a verification link to{" "}
            <span className="font-medium text-gray-900">
              {user?.email || "your email address"}
            </span>
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-blue-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-700">
                <strong>Please check your email inbox</strong> and click the
                verification link to access your account. Don&apos;t forget to
                check your spam folder!
              </p>
            </div>
          </div>
        </div>

        {message && (
          <div className="rounded-md bg-green-50 p-4">
            <div className="text-sm text-green-700">{message}</div>
          </div>
        )}

        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <div className="text-sm text-red-700">{error}</div>
          </div>
        )}

        <div className="space-y-4">
          <button
            type="button"
            onClick={handleResendVerification}
            disabled={resending}
            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-blue-600 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {resending ? "Sending..." : "Resend verification email"}
          </button>

          <div className="text-center">
            <a
              href="/auth/signin"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              Back to sign in
            </a>
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-gray-500">
          <p>
            Having trouble? Contact us at{" "}
            <a
              href="mailto:support@examprep.com"
              className="text-blue-600 hover:text-blue-500"
            >
              support@examprep.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
