import mongoose, { Schema, Document } from "mongoose";
import { IVocabulary } from "@/types";

export interface IVocabularyDocument extends Omit<IVocabulary, "_id">, Document {}

const VocabularySchema = new Schema<IVocabularyDocument>(
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

VocabularySchema.index({ word: "text", meanings: "text", topic: "text" });

export default mongoose.models.Vocabulary || mongoose.model<IVocabularyDocument>("Vocabulary", VocabularySchema);
