import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@/lib/services/auth.service";
import { verifyAuth } from "@/lib/utils/auth";

export async function PUT(req: NextRequest) {
  try {
    const authUser = verifyAuth(req);
    if (!authUser) {
      return NextResponse.json(
        { success: false, message: "Vui lòng đăng nhập để tiếp tục" },
        { status: 401 }
      );
    }

    const body = await req.json();
    await AuthService.changePassword(authUser.id, body);

    return NextResponse.json({
      success: true,
      message: "Đổi mật khẩu thành công!",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Lỗi server" },
      { status: 400 }
    );
  }
}
