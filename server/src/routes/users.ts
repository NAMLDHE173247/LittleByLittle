import { Router, Response } from "express";
import User from "../models/User";
import { authenticate, requireAdmin, AuthRequest } from "../middleware/auth";

const router = Router();

// Tất cả các API quản lý user đều yêu cầu xác thực và quyền Admin
router.use(authenticate as any);
router.use(requireAdmin as any);

// ================================================================
// GET /api/users — Lấy danh sách toàn bộ người dùng
// ================================================================
router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const users = await User.find({}).sort({ createdAt: -1 });
    res.json({
      success: true,
      data: users,
    });
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
});

// ================================================================
// PUT /api/users/:id/status — Cập nhật trạng thái người dùng (Duyệt/Từ chối)
// ================================================================
router.put("/:id/status", async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["pending", "active", "rejected"].includes(status)) {
      res.status(400).json({
        success: false,
        message: "Trạng thái không hợp lệ",
      });
      return;
    }

    // Không cho phép Admin tự thay đổi trạng thái của chính mình
    if (id === req.user?.id) {
      res.status(400).json({
        success: false,
        message: "Không thể tự thay đổi trạng thái của chính mình",
      });
      return;
    }

    const user = await User.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!user) {
      res.status(404).json({
        success: false,
        message: "Không tìm thấy người dùng",
      });
      return;
    }

    res.json({
      success: true,
      message: `Đã cập nhật trạng thái thành ${status}`,
      data: user,
    });
  } catch (error) {
    console.error("Update user status error:", error);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
});
// ================================================================
// PUT /api/users/:id/role — Cập nhật vai trò người dùng
// ================================================================
router.put("/:id/role", async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!["admin", "user"].includes(role)) {
      res.status(400).json({
        success: false,
        message: "Vai trò không hợp lệ",
      });
      return;
    }

    if (id === req.user?.id) {
      res.status(400).json({
        success: false,
        message: "Không thể tự thay đổi vai trò của chính mình",
      });
      return;
    }

    const user = await User.findByIdAndUpdate(id, { role }, { new: true });

    if (!user) {
      res.status(404).json({
        success: false,
        message: "Không tìm thấy người dùng",
      });
      return;
    }

    res.json({
      success: true,
      message: `Đã cập nhật vai trò thành ${role}`,
      data: user,
    });
  } catch (error) {
    console.error("Update user role error:", error);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
});

// ================================================================
// DELETE /api/users/:id — Xoá người dùng vĩnh viễn
// ================================================================
router.delete("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Không cho phép Admin tự xoá chính mình
    if (id === req.user?.id) {
      res.status(400).json({
        success: false,
        message: "Không thể tự xoá tài khoản của chính mình",
      });
      return;
    }

    const user = await User.findByIdAndDelete(id);

    if (!user) {
      res.status(404).json({
        success: false,
        message: "Không tìm thấy người dùng",
      });
      return;
    }

    // Tuỳ chọn: Có thể xoá luôn các dữ liệu liên quan (Decks, Progress) của user này.
    // Tạm thời chỉ xoá user.

    res.json({
      success: true,
      message: "Đã xoá người dùng",
    });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
});

export default router;
