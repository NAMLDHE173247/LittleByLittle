import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@/lib/services/auth.service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = await AuthService.login(body);

    return NextResponse.json({
      success: true,
      message: "Đăng nhập thành công!",
      data: {
        token: data.token,
        user: {
          id: data.user._id,
          email: data.user.email,
          name: data.user.name,
          role: data.user.role,
        },
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Lỗi server" },
      { status: 401 }
    );
  }
}
