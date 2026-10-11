import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const eliteRole = req.cookies.get("elite_role")?.value;
    const pathname = req.nextUrl.pathname;

    const currentRole = token?.role || eliteRole;

    // Phân quyền bảo vệ route /admin
    if (pathname.startsWith("/admin") && currentRole !== "ADMIN") {
      return NextResponse.redirect(new URL("/portal/login?error=AdminRequired", req.url));
    }

    // Phân quyền bảo vệ route /chu-tro
    if (
      pathname.startsWith("/chu-tro") &&
      currentRole !== "LANDLORD" &&
      currentRole !== "ADMIN"
    ) {
      return NextResponse.redirect(new URL("/portal/login?error=LandlordRequired", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const pathname = req.nextUrl.pathname;
        const eliteRole = req.cookies.get("elite_role")?.value;
        const currentRole = token?.role || eliteRole;

        // Bắt buộc quyền ADMIN khi vào /admin
        if (pathname.startsWith("/admin")) {
          return currentRole === "ADMIN";
        }

        // Bắt buộc quyền LANDLORD hoặc ADMIN khi vào /chu-tro
        if (pathname.startsWith("/chu-tro")) {
          return currentRole === "LANDLORD" || currentRole === "ADMIN";
        }

        return true;
      },
    },
    pages: {
      signIn: "/portal/login",
    },
  }
);

export const config = {
  matcher: ["/chu-tro/:path*", "/admin/:path*"],
};

