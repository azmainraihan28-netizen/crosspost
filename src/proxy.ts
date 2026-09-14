import { NextResponse, type NextRequest } from "next/server";

// Optimistic check only (cookie presence). Real verification happens in requireUser()/apiUser().
// Signed-in users visiting /login are redirected by the page itself, after verifying the token,
// to avoid redirect loops with stale cookies.
export function proxy(request: NextRequest) {
  if (!request.cookies.has("session")) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/app/:path*"],
};
