import createMiddleware from "next-intl/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { routing } from "@/lib/i18n/routing";

const intlMiddleware = createMiddleware(routing);

const isLocal =
  !process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-project");

const protectedPaths = [
  "/dashboard",
  "/events",
  "/tasks",
  "/contacts",
  "/finance",
  "/calendar",
  "/documents",
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if path is protected (internal tool)
  const isProtected = protectedPaths.some(
    (path) => pathname.includes(path)
  );

  // Skip auth check in local mode — bypass login
  if (isProtected && !isLocal) {
    const hasAuth = request.cookies.getAll().some(
      (cookie) => cookie.name.startsWith("sb-") && cookie.name.endsWith("-auth-token")
    );

    if (!hasAuth) {
      const locale = pathname.startsWith("/en") ? "en" : "fr";
      const loginUrl = new URL(`/${locale}/login`, request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
