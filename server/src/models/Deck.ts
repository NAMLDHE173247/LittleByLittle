import mongoose, { Schema, Document } from "mongoose";

export interface IDeck extends Document {
  // Tên bộ thẻ
  name: string;
  // Mô tả bộ thẻ
  description: string;
  // Màu sắc hiển thị (hex color)
  color: string;
  // Người tạo deck
  userId: mongoose.Types.ObjectId;
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const DeckSchema = new Schema<IDeck>(
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

const Deck = mongoose.model<IDeck>("Deck", DeckSchema);

export default Deck;
