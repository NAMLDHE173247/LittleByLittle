import mongoose from "mongoose";

export interface IDeck {
  _id: string | mongoose.Types.ObjectId;
  name: string;
  description: string;
  color: string;
  userId: string | mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}
