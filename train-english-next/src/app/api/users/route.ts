import { NextRequest, NextResponse } from "next/server";
import { UserService } from "@/lib/services/users.service";
import { verifyAuth } from "@/lib/utils/auth";

export async function GET(req: NextRequest) {
  try {
    const authUser = verifyAuth(req);
    if (!authUser || authUser.role !== "admin") {
      return NextResponse.json({ success: false, message: "Chưa xác thực hoặc không có quyền" }, { status: 403 });
    }

    const users = await UserService.getAll();
    return NextResponse.json({ success: true, data: users });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || "Lỗi server" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authUser = verifyAuth(req);
    if (!authUser || authUser.role !== "admin") {
      return NextResponse.json({ success: false, message: "Chưa xác thực hoặc không có quyền" }, { status: 403 });
    }

    const body = await req.json();
    const newUser = await UserService.create(body);

    return NextResponse.json({ success: true, message: "Tạo tài khoản thành công", data: newUser });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || "Lỗi server" }, { status: 400 });
  }
}
