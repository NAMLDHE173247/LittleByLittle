import mongoose from "mongoose";

export interface IUser {
  _id: string | mongoose.Types.ObjectId;
  email: string;
  password?: string;
  name: string;
  role: "admin" | "user";
  status: "pending" | "active" | "rejected";
  createdAt: Date;
  updatedAt: Date;
  comparePassword?: (candidatePassword: string) => Promise<boolean>;
}
