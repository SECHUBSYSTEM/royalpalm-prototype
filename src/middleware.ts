import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Public routes that don't require authentication
const publicRoutes = ["/login", "/api/auth/login", "/api/auth/refresh"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Handle CORS preflight requests
  if (request.method === "OPTIONS") {
    const response = new NextResponse(null, { status: 200 });
    response.headers.set("Access-Control-Allow-Credentials", "true");
    response.headers.set("Access-Control-Allow-Origin", "*"); // Allow all origins for prototype
    response.headers.set(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, DELETE, OPTIONS, PATCH"
    );
    response.headers.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, X-Requested-With"
    );
    return response;
  }

  // Allow public routes
  if (publicRoutes.some((route) => pathname.startsWith(route))) {
    const response = NextResponse.next();
    // Add CORS headers to public routes
    response.headers.set("Access-Control-Allow-Origin", "*");
    response.headers.set("Access-Control-Allow-Credentials", "true");
    return response;
  }

  // Check for access token in Authorization header or cookie
  const authHeader = request.headers.get("authorization");
  const hasToken = authHeader?.startsWith("Bearer ");

  // For API routes, require token
  if (pathname.startsWith("/api/") && !pathname.startsWith("/api/auth/")) {
    if (!hasToken) {
      const response = NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
      // Add CORS headers even for error responses
      response.headers.set("Access-Control-Allow-Origin", "*");
      response.headers.set("Access-Control-Allow-Credentials", "true");
      return response;
    }
    const response = NextResponse.next();
    // Add CORS headers to API responses
    response.headers.set("Access-Control-Allow-Origin", "*");
    response.headers.set("Access-Control-Allow-Credentials", "true");
    return response;
  }

  // For page routes, check for token in cookie (set by client)
  // If no token, redirect to login
  // Note: Client-side will handle the actual redirect
  // This middleware just allows the request through
  const response = NextResponse.next();
  // Add CORS headers to page responses
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Credentials", "true");
  return response;
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
