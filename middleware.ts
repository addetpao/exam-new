import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Authentication middleware for Next.js App Router
 * Handles session refresh and route protection
 */
export async function middleware(request: NextRequest) {
  // Graceful no-op if Supabase env is not configured, so public pages still load
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnon) {
    return NextResponse.next();
  }
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(supabaseUrl, supabaseAnon, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  // Refresh session if expired
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const { pathname } = request.nextUrl;

  // Public routes that don't require authentication
  const publicRoutes = [
    "/",
    "/auth/signin",
    "/auth/signup",
    "/auth/callback",
    "/auth/forgot-password",
    "/auth/reset-password",
    "/pricing",
    "/about",
    "/contact",
    "/privacy",
    "/terms",
  ];

  // Auth routes that should redirect if already authenticated
  const authRoutes = ["/auth/signin", "/auth/signup", "/auth/forgot-password"];

  // Protected routes that require authentication
  const protectedRoutes = [
    "/dashboard",
    "/exams",
    "/progress",
    "/profile",
    "/admin",
  ];

  // Admin routes that require admin role
  const adminRoutes = ["/admin"];

  // Content editor routes
  const editorRoutes = ["/admin/content"];

  const isPublicRoute = publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );

  const isAuthRoute = authRoutes.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );

  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  const isAdminRoute = adminRoutes.some((route) => pathname.startsWith(route));

  // If user is authenticated and trying to access auth pages, redirect to dashboard
  if (session && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // If accessing protected routes without session, redirect to signin
  if (!session && isProtectedRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/signin";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  // For authenticated users accessing protected routes, check email verification and roles
  if (session && isProtectedRoute) {
    try {
      // Fetch user profile to check email confirmation and role
      const { data: profile, error } = await supabase
        .from("users")
        .select("email_confirmed, app_role")
        .eq("id", session.user.id)
        .single();

      if (error) {
        console.error("Failed to fetch user profile:", error);
        const url = request.nextUrl.clone();
        url.pathname = "/auth/signin";
        return NextResponse.redirect(url);
      }

      // Check email verification for all protected routes
      if (!profile.email_confirmed) {
        const url = request.nextUrl.clone();
        url.pathname = "/auth/verify-email";
        return NextResponse.redirect(url);
      }

      // Check admin role for admin routes
      if (isAdminRoute && profile.app_role !== "admin") {
        const url = request.nextUrl.clone();
        url.pathname = "/unauthorized";
        return NextResponse.redirect(url);
      }

      // Check content editor role for editor routes
      if (
        pathname.startsWith("/admin/content") &&
        !["admin", "content_editor"].includes(profile.app_role)
      ) {
        const url = request.nextUrl.clone();
        url.pathname = "/unauthorized";
        return NextResponse.redirect(url);
      }
    } catch (error) {
      console.error("Middleware auth check failed:", error);
      const url = request.nextUrl.clone();
      url.pathname = "/auth/signin";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
