import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isLoggedIn = request.cookies.has("session");
  const isLoginPage = pathname === "/login";

  if (!isLoggedIn && !isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // `img/` dikecualikan supaya aset statis `public/img` (mis. banner) bisa
  // dibaca browser maupun Image Optimization milik Next.js. File upload di
  // `/uploads` TIDAK dikecualikan, jadi tetap wajib login.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|img/).*)"],
};
