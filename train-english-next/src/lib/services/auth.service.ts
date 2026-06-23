import { User } from "../db/models";
import jwt from "jsonwebtoken";
import dbConnect from "../db/connection";

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
const PASSWORD_ERROR_MSG =
  "Mật khẩu phải có ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt (@$!%*?&)";

export class AuthService {
  static generateToken(user: { _id: string; email: string; role: string }): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error("JWT_SECRET is not defined");
    const expiresIn = process.env.JWT_EXPIRES_IN || "7d";

    return jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      secret,
      { expiresIn } as jwt.SignOptions
    );
  }

  static async register(data: any) {
    await dbConnect();
    const { email, password, name } = data;

    if (!email || !password || !name) {
      throw new Error("Vui lòng điền đầy đủ email, mật khẩu và tên");
    }
    if (typeof email !== "string" || typeof password !== "string" || typeof name !== "string") {
      throw new Error("Dữ liệu đầu vào không hợp lệ");
    }
    if (!PASSWORD_REGEX.test(password)) {
      throw new Error(PASSWORD_ERROR_MSG);
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      throw new Error("Email này đã được đăng ký");
    }

    const user = await User.create({
      email: email.toLowerCase().trim(),
      password,
      name: name.trim(),
      role: "user",
      status: "pending",
    });

    return user;
  }

  static async login(data: any) {
    await dbConnect();
    const { email, password } = data;

    if (!email || !password) {
      throw new Error("Vui lòng nhập email và mật khẩu");
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select("+password");
    if (!user) {
      throw new Error("Email hoặc mật khẩu không đúng");
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw new Error("Email hoặc mật khẩu không đúng");
    }

    if (user.status === "pending") {
      throw new Error("Tài khoản của bạn đang chờ Admin duyệt.");
    }
    if (user.status === "rejected") {
      throw new Error("Tài khoản của bạn đã bị từ chối hoặc khoá.");
    }

    const token = this.generateToken({
      _id: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    return { token, user };
  }

  static async getMe(userId: string) {
    await dbConnect();
    const user = await User.findById(userId);
    if (!user) {
      throw new Error("Không tìm thấy người dùng");
    }
    return user;
  }

  static async changePassword(userId: string, data: any) {
    await dbConnect();
    const { currentPassword, newPassword } = data;

    if (!currentPassword || !newPassword) {
      throw new Error("Vui lòng nhập mật khẩu hiện tại và mật khẩu mới");
    }
    if (!PASSWORD_REGEX.test(newPassword)) {
      throw new Error(PASSWORD_ERROR_MSG);
    }

    const user = await User.findById(userId).select("+password");
    if (!user) {
      throw new Error("Không tìm thấy người dùng");
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      throw new Error("Mật khẩu hiện tại không đúng");
    }

    user.password = newPassword;
    await user.save();
    return true;
  }
}
