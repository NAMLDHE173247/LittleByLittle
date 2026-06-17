import { NextRequest, NextResponse } from "next/server";
import { UserService } from "@/lib/services/users.service";
import { verifyAuth } from "@/lib/utils/auth";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authUser = verifyAuth(req);
    if (!authUser || authUser.role !== "admin") {
      return NextResponse.json({ success: false, message: "Chưa xác thực hoặc không có quyền" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();

    const updatedUser = await UserService.update(id, body);
    if (!updatedUser) {
      return NextResponse.json({ success: false, message: "Người dùng không tồn tại" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updatedUser });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || "Lỗi server" }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authUser = verifyAuth(req);
    if (!authUser || authUser.role !== "admin") {
      return NextResponse.json({ success: false, message: "Chưa xác thực hoặc không có quyền" }, { status: 403 });
    }

    const { id } = await params;
    await UserService.delete(id, authUser.id);

    return NextResponse.json({ success: true, message: "Đã xoá người dùng" });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || "Lỗi server" }, { status: 400 });
  }
}
