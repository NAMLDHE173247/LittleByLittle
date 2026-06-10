import { Router, Request, Response } from "express";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import User from "../models/User";
import { authenticate, AuthRequest } from "../middleware/auth";

const router = Router();

// Middleware chống Brute-force (Giới hạn số lần gọi API đăng nhập/đăng ký)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 10, // Tối đa 10 lần thử từ 1 IP trong 15 phút
  message: { 
    success: false, 
    message: "Bạn đã thử quá nhiều lần. Vui lòng thử lại sau 15 phút." 
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Tạo JWT token
 */
const generateToken = (user: {
  _id: string;
  email: string;
  role: string;
}): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not defined");

  const expiresIn = process.env.JWT_EXPIRES_IN || "7d";

  return jwt.sign(
    { id: user._id, email: user.email, role: user.role },
    secret,
    { expiresIn } as jwt.SignOptions
  );
};

// ================================================================
// POST /api/auth/register — Đăng ký tài khoản mới
// ================================================================
router.post("/register", authLimiter, async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;

    // Validate exist
    if (!email || !password || !name) {
      res.status(400).json({
        success: false,
        message: "Vui lòng điền đầy đủ email, mật khẩu và tên",
      });
      return;
    }

    // Validate type (tránh crash ứng dụng nếu dữ liệu gửi lên không phải String)
    if (typeof email !== "string" || typeof password !== "string" || typeof name !== "string") {
      res.status(400).json({
        success: false,
        message: "Dữ liệu đầu vào không hợp lệ",
      });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({
        success: false,
        message: "Mật khẩu phải có ít nhất 6 ký tự",
      });
      return;
    }

    // Check duplicate email
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      res.status(400).json({
        success: false,
        message: "Email này đã được đăng ký",
      });
      return;
    }

    // Create user (role mặc định là 'user', status mặc định là 'pending')
    const user = await User.create({
      email: email.toLowerCase().trim(),
      password,
      name: name.trim(),
      role: "user",
      status: "pending",
    });

    res.status(201).json({
      success: true,
      message: "Đăng ký thành công. Vui lòng chờ admin duyệt.",
    });
  } catch (error: any) {
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map(
        (e: any) => e.message
      );
      res.status(400).json({ success: false, message: messages.join(", ") });
      return;
    }
    if (error.code === 11000) {
      res.status(400).json({
        success: false,
        message: "Email này đã được đăng ký",
      });
      return;
    }
    console.error("Register error:", error);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
});

// ================================================================
// POST /api/auth/login — Đăng nhập
// ================================================================
router.post("/login", authLimiter, async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({
        success: false,
        message: "Vui lòng nhập email và mật khẩu",
      });
      return;
    }

    // Validate type
    if (typeof email !== "string" || typeof password !== "string") {
      res.status(400).json({
        success: false,
        message: "Dữ liệu đầu vào không hợp lệ",
      });
      return;
    }

    // Find user (include password field)
    const user = await User.findOne({
      email: email.toLowerCase(),
    }).select("+password");

    if (!user) {
      res.status(401).json({
        success: false,
        message: "Email hoặc mật khẩu không đúng",
      });
      return;
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      res.status(401).json({
        success: false,
        message: "Email hoặc mật khẩu không đúng",
      });
      return;
    }

    // Check status
    if (user.status === "pending") {
      res.status(403).json({
        success: false,
        message: "Tài khoản của bạn đang chờ Admin duyệt.",
      });
      return;
    }
    
    if (user.status === "rejected") {
      res.status(403).json({
        success: false,
        message: "Tài khoản của bạn đã bị từ chối hoặc khoá.",
      });
      return;
    }

    // Generate token
    const token = generateToken({
      _id: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    res.json({
      success: true,
      message: "Đăng nhập thành công!",
      data: {
        token,
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
});

// ================================================================
// GET /api/auth/me — Lấy thông tin user hiện tại
// ================================================================
router.get(
  "/me",
  authenticate as any,
  async (req: AuthRequest, res: Response) => {
    try {
      const user = await User.findById(req.user!.id);
      if (!user) {
        res.status(404).json({
          success: false,
          message: "Không tìm thấy người dùng",
        });
        return;
      }

      res.json({
        success: true,
        data: {
          id: user._id,
          email: user.email,
          name: user.name,
          role: user.role,
          createdAt: user.createdAt,
        },
      });
    } catch (error) {
      console.error("Get me error:", error);
      res.status(500).json({ success: false, message: "Lỗi server" });
    }
  }
);

// ================================================================
// PUT /api/auth/change-password — Đổi mật khẩu
// ================================================================
router.put(
  "/change-password",
  authenticate as any,
  async (req: AuthRequest, res: Response) => {
    try {
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        res.status(400).json({
          success: false,
          message: "Vui lòng nhập mật khẩu hiện tại và mật khẩu mới",
        });
        return;
      }

      if (typeof currentPassword !== "string" || typeof newPassword !== "string") {
        res.status(400).json({
          success: false,
          message: "Dữ liệu đầu vào không hợp lệ",
        });
        return;
      }

      if (newPassword.length < 6) {
        res.status(400).json({
          success: false,
          message: "Mật khẩu mới phải có ít nhất 6 ký tự",
        });
        return;
      }

      const user = await User.findById(req.user!.id).select("+password");
      if (!user) {
        res.status(404).json({
          success: false,
          message: "Không tìm thấy người dùng",
        });
        return;
      }

      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) {
        res.status(401).json({
          success: false,
          message: "Mật khẩu hiện tại không đúng",
        });
        return;
      }

      user.password = newPassword;
      await user.save();

      res.json({
        success: true,
        message: "Đổi mật khẩu thành công!",
      });
    } catch (error) {
      console.error("Change password error:", error);
      res.status(500).json({ success: false, message: "Lỗi server" });
    }
  }
);

export default router;
