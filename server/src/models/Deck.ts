import mongoose, { Schema, Document } from "mongoose";

export interface IDeck extends Document {
  // Tên bộ thẻ
  name: string;
  // Mô tả bộ thẻ
  description: string;
  // Màu sắc hiển thị (hex color)
  color: string;
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
      unique: true,
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
  },
  {
    timestamps: true,
  }
);

const Deck = mongoose.model<IDeck>("Deck", DeckSchema);

export default Deck;
