import { User } from "../db/models";
import bcrypt from "bcryptjs";
import dbConnect from "../db/connection";

export class UserService {
  static async getAll() {
    await dbConnect();
    return User.find({}).sort({ createdAt: -1 });
  }

  static async create(data: any) {
    await dbConnect();
    const { name, email, password, role, status } = data;

    if (!name || !email || !password) {
      throw new Error("Vui lòng nhập đủ thông tin (tên, email, mật khẩu)");
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new Error("Email đã tồn tại");
    }

    // Don't hash manually because the UserSchema.pre('save') hook will do it
    const newUser = await User.create({
      name,
      email,
      password,
      role: role || "user",
      status: status || "active",
    });

    return newUser;
  }

  static async update(id: string, data: any) {
    await dbConnect();
    const { name, email, password, role, status } = data;

    const user = await User.findById(id);
    if (!user) throw new Error("Không tìm thấy người dùng");

    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        throw new Error("Email đã tồn tại");
      }
      user.email = email;
    }

    if (name) user.name = name;
    if (role) user.role = role;
    if (status) user.status = status;
    if (password) user.password = password; // pre('save') hook will hash it

    await user.save();
    return user;
  }

  static async updateStatus(id: string, status: string, requesterId: string) {
    await dbConnect();
    if (!["pending", "active", "rejected"].includes(status)) {
      throw new Error("Trạng thái không hợp lệ");
    }
    if (id === requesterId) {
      throw new Error("Không thể tự thay đổi trạng thái của chính mình");
    }

    const user = await User.findByIdAndUpdate(id, { status }, { new: true });
    if (!user) throw new Error("Không tìm thấy người dùng");
    return user;
  }

  static async updateRole(id: string, role: string, requesterId: string) {
    await dbConnect();
    if (!["admin", "user"].includes(role)) {
      throw new Error("Vai trò không hợp lệ");
    }
    if (id === requesterId) {
      throw new Error("Không thể tự thay đổi vai trò của chính mình");
    }

    const user = await User.findByIdAndUpdate(id, { role }, { new: true });
    if (!user) throw new Error("Không tìm thấy người dùng");
    return user;
  }

  static async delete(id: string, requesterId: string) {
    await dbConnect();
    if (id === requesterId) {
      throw new Error("Không thể tự xoá tài khoản của chính mình");
    }

    const user = await User.findByIdAndDelete(id);
    if (!user) throw new Error("Không tìm thấy người dùng");
    return user;
  }
}
