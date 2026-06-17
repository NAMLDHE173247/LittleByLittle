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
    const { status } = await req.json();
    const user = await UserService.updateStatus(id, status, authUser.id);

    return NextResponse.json({ success: true, message: `Đã cập nhật trạng thái thành ${status}`, data: user });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || "Lỗi server" }, { status: 400 });
  }
}
