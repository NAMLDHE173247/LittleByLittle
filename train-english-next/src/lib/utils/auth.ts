import { NextRequest } from "next/server";
import jwt from "jsonwebtoken";

export interface AuthUser {
  id: string;
  email: string;
  role: "admin" | "user";
}

export function verifyAuth(req: NextRequest): AuthUser | null {
  try {
    const authHeader = req.headers.get("authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return null;
    }

    const token = authHeader.split(" ")[1];
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      throw new Error("JWT_SECRET is not defined");
    }

    const decoded = jwt.verify(token, secret) as AuthUser;
    return decoded;
  } catch (error) {
    return null;
  }
}
