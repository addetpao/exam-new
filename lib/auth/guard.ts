import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { Database } from "../database.types";

type UserRole = Database["public"]["Enums"]["user_role"];

/**
 * Authentication guard for API routes
 */
export async function withAuth<T = any>(
  request: NextRequest,
  handler: (request: NextRequest & { user: any }) => Promise<NextResponse<T>>
): Promise<NextResponse<T>> {
  try {
    const response = NextResponse.next();
    
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error || !session?.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Fetch user profile
    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("*")
      .eq("id", session.user.id)
      .single();

    if (profileError) {
      return NextResponse.json(
        { error: "Failed to fetch user profile" },
        { status: 500 }
      );
    }

    // Check email verification
    if (!profile.email_confirmed) {
      return NextResponse.json(
        { 
          error: "Email verification required",
          code: "EMAIL_NOT_VERIFIED" 
        },
        { status: 403 }
      );
    }

    // Attach user data to request
    const requestWithUser = request as NextRequest & { 
      user: { 
        id: string;
        email: string;
        profile: typeof profile;
        session: typeof session;
      } 
    };
    
    requestWithUser.user = {
      id: session.user.id,
      email: session.user.email!,
      profile,
      session,
    };

    return handler(requestWithUser);
  } catch (error) {
    console.error("Authentication guard error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Lightweight auth helper for API routes that expect a result object
 * Usage pattern matches existing routes (returns { success, user? })
 */
export async function requireAuth(request: NextRequest): Promise<{
  success: boolean;
  user?: {
    id: string;
    email: string;
    user_metadata?: Record<string, any>;
  };
}> {
  const response = NextResponse.next();

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error || !session?.user) {
    return { success: false };
  }

  return {
    success: true,
    user: {
      id: session.user.id,
      email: session.user.email!,
      user_metadata: session.user.user_metadata,
    },
  };
}

/**
 * Role-based authentication guard for API routes
 */
export async function withRole<T = any>(
  request: NextRequest,
  requiredRole: UserRole,
  handler: (request: NextRequest & { user: any }) => Promise<NextResponse<T>>
): Promise<NextResponse<T>> {
  return withAuth(request, async (authenticatedRequest) => {
    const userRole = authenticatedRequest.user.profile.app_role;
    
    const roleHierarchy = {
      admin: 3,
      content_editor: 2,
      user: 1,
    };

    const userLevel = roleHierarchy[userRole];
    const requiredLevel = roleHierarchy[requiredRole];

    if (userLevel < requiredLevel) {
      return NextResponse.json(
        { 
          error: "Insufficient permissions",
          required_role: requiredRole,
          user_role: userRole 
        },
        { status: 403 }
      );
    }

    return handler(authenticatedRequest);
  });
}

/**
 * Create route-specific auth guards
 */
export const guards = {
  /**
   * Require any authenticated user
   */
  requireAuth: <T = any>(
    handler: (request: NextRequest & { user: any }) => Promise<NextResponse<T>>
  ) => (request: NextRequest) => withAuth(request, handler),

  /**
   * Require admin role
   */
  requireAdmin: <T = any>(
    handler: (request: NextRequest & { user: any }) => Promise<NextResponse<T>>
  ) => (request: NextRequest) => withRole(request, "admin", handler),

  /**
   * Require content editor or higher
   */
  requireContentEditor: <T = any>(
    handler: (request: NextRequest & { user: any }) => Promise<NextResponse<T>>
  ) => (request: NextRequest) => withRole(request, "content_editor", handler),

  /**
   * Require user or higher (basically just verified email)
   */
  requireUser: <T = any>(
    handler: (request: NextRequest & { user: any }) => Promise<NextResponse<T>>
  ) => (request: NextRequest) => withRole(request, "user", handler),
};
