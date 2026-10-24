import { NextResponse } from "next/server";

const AUTH_COOKIE_NAMES = [
  "next-auth.portal.session-token",
  "__Secure-next-auth.portal.session-token",
  "next-auth.portal.csrf-token",
  "__Host-next-auth.portal.csrf-token",
  "next-auth.portal.callback-url",
  "__Secure-next-auth.portal.callback-url",
  "next-auth.session-token",
  "__Secure-next-auth.session-token",
  "next-auth.csrf-token",
  "__Host-next-auth.csrf-token",
  "next-auth.callback-url",
  "__Secure-next-auth.callback-url",
  "elite_role",
];

function clearAuthCookies(response: NextResponse) {
  for (const name of AUTH_COOKIE_NAMES) {
    response.cookies.set(name, "", {
      path: "/",
      maxAge: 0,
      expires: new Date(0),
      httpOnly: !name.includes("elite_role"),
      sameSite: "lax",
    });
  }
  return response;
}

export async function POST() {
  const response = NextResponse.json({
    success: true,
    message: "Đã đăng xuất và xóa toàn bộ phiên đăng nhập.",
  });
  return clearAuthCookies(response);
}

export async function GET() {
  const response = NextResponse.json({
    success: true,
    message: "Đã đăng xuất và xóa toàn bộ phiên đăng nhập.",
  });
  return clearAuthCookies(response);
}
