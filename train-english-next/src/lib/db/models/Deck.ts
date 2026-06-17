import mongoose, { Schema, Document } from "mongoose";
import { IDeck } from "@/types";

export interface IDeckDocument extends Omit<IDeck, "_id">, Document {}

const DeckSchema = new Schema<IDeckDocument>(
  {
    name: {
      type: String,
      required: [true, "Deck name is required"],
      trim: true,
      index: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    color: {
      type: String,
      trim: true,
      default: "#3B82F6",
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique: mỗi user không được tạo 2 deck cùng tên
DeckSchema.index({ userId: 1, name: 1 }, { unique: true });

export default mongoose.models.Deck || mongoose.model<IDeckDocument>("Deck", DeckSchema);
