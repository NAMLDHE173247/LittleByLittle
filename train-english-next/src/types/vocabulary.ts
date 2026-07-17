import mongoose from "mongoose";

export interface IVocabulary {
  _id: string | mongoose.Types.ObjectId;
  userId: string | mongoose.Types.ObjectId;
  normalizedWord: string;
  word: string;
  type: "word" | "phrase";
  pronunciation: string;
  meanings: string[];
  partOfSpeech: string;
  examples: {
    en: string;
    vi: string;
  }[];
  topic: string;
  level: "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
  synonyms: string[];
  antonyms: string[];
  note: string;
  imageUrl: string;
  audioUrl: string;
  deckIds: (string | mongoose.Types.ObjectId)[];
  createdAt: Date;
  updatedAt: Date;
}
