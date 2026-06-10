import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

// Extend Express Request type
export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: "admin" | "user";
  };
}

/**
 * Middleware xác thực JWT token.
 * Gắn req.user = { id, email, role } nếu token hợp lệ.
 */
export const authenticate = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({
        success: false,
        message: "Vui lòng đăng nhập để tiếp tục",
      });
      return;
    }

    const token = authHeader.split(" ")[1];
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      throw new Error("JWT_SECRET is not defined");
    }

    const decoded = jwt.verify(token, secret) as {
      id: string;
      email: string;
      role: "admin" | "user";
    };

    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
    };

    next();
  } catch (error: any) {
    if (error.name === "TokenExpiredError") {
      res.status(401).json({
        success: false,
        message: "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại",
      });
      return;
    }

    if (error.name === "JsonWebTokenError") {
      res.status(401).json({
        success: false,
        message: "Token không hợp lệ",
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: "Lỗi xác thực",
    });
  }
};

/**
 * Middleware kiểm tra role admin.
 * Phải đặt SAU authenticate middleware.
 */
export const requireAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: "Chưa xác thực",
    });
    return;
  }

  if (req.user.role !== "admin") {
    res.status(403).json({
      success: false,
      message: "Bạn không có quyền thực hiện thao tác này (yêu cầu Admin)",
    });
    return;
  }

  next();
};
