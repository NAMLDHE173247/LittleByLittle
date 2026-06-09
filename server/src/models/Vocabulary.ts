import mongoose, { Schema, Document } from "mongoose";

export interface IVocabulary extends Document {
  // Từ hoặc cụm từ tiếng Anh
  word: string;
  // Loại: word (từ đơn) hoặc phrase (cụm từ)
  type: "word" | "phrase";
  // Phiên âm IPA
  pronunciation: string;
  // Nghĩa tiếng Việt (có thể nhiều nghĩa)
  meanings: string[];
  // Loại từ: noun, verb, adjective, adverb, preposition, phrasal verb, idiom, etc.
  partOfSpeech: string;
  // Câu ví dụ (tiếng Anh + dịch tiếng Việt)
  examples: {
    en: string;
    vi: string;
  }[];
  // Chủ đề: travel, business, daily life, technology, etc.
  topic: string;
  // Trình độ: A1, A2, B1, B2, C1, C2
  level: "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
  // Từ đồng nghĩa
  synonyms: string[];
  // Từ trái nghĩa
  antonyms: string[];
  // Ghi chú thêm (mẹo nhớ, ngữ cảnh sử dụng, etc.)
  note: string;
  // URL hình ảnh minh hoạ (nếu có)
  imageUrl: string;
  // URL audio phát âm (nếu có)
  audioUrl: string;
  // Bộ thẻ mà từ vựng thuộc về
  deckIds: mongoose.Types.ObjectId[];
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const VocabularySchema = new Schema<IVocabulary>(
  {
    word: {
      type: String,
      required: [true, "Word/phrase is required"],
      trim: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["word", "phrase"],
      default: "word",
    },
    pronunciation: {
      type: String,
      trim: true,
      default: "",
    },
    meanings: {
      type: [String],
      required: [true, "At least one meaning is required"],
    },
    partOfSpeech: {
      type: String,
      trim: true,
      default: "",
    },
    examples: [
      {
        en: { type: String, required: true },
        vi: { type: String, required: true },
      },
    ],
    topic: {
      type: String,
      trim: true,
      default: "general",
      index: true,
    },
    level: {
      type: String,
      enum: ["A1", "A2", "B1", "B2", "C1", "C2"],
      default: "A1",
      index: true,
    },
    synonyms: {
      type: [String],
      default: [],
    },
    antonyms: {
      type: [String],
      default: [],
    },
    note: {
      type: String,
      default: "",
    },
    imageUrl: {
      type: String,
      default: "",
    },
    audioUrl: {
      type: String,
      default: "",
    },
    deckIds: {
      type: [{ type: Schema.Types.ObjectId, ref: "Deck" }],
      default: [],
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Text search index cho tìm kiếm từ vựng
VocabularySchema.index({ word: "text", meanings: "text", topic: "text" });

const Vocabulary = mongoose.model<IVocabulary>("Vocabulary", VocabularySchema);

export default Vocabulary;
