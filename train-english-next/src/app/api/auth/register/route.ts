import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@/lib/services/auth.service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const user = await AuthService.register(body);

    return NextResponse.json({
      success: true,
      message: "Đăng ký thành công. Vui lòng chờ admin duyệt.",
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Lỗi server" },
      { status: 400 }
    );
  }
}
