import mongoose, { Schema, Document } from "mongoose";
import { IUserWordProgress, ISkillProgress } from "@/types";

export interface IUserWordProgressDocument extends Omit<IUserWordProgress, "_id">, Document {}

const SkillProgressSchema = new Schema<ISkillProgress>(
  {
    points: {
      type: Number,
      default: 0,
      min: 0,
    },
    nextReview: {
      type: Date,
      default: Date.now,
    },
    intervalDays: {
      type: Number,
      default: 0,
    },
  },
  { _id: false }
);

const UserWordProgressSchema = new Schema<IUserWordProgressDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
      index: true,
    },
    wordId: {
      type: Schema.Types.ObjectId,
      ref: "Vocabulary",
      required: [true, "Word ID is required"],
      index: true,
    },
    skills: {
      recall: {
        type: SkillProgressSchema,
        default: () => ({ points: 0, nextReview: new Date() }),
      },
      listening: {
        type: SkillProgressSchema,
        default: () => ({ points: 0, nextReview: new Date() }),
      },
      writing: {
        type: SkillProgressSchema,
        default: () => ({ points: 0, nextReview: new Date() }),
      },
      pronunciation: {
        type: SkillProgressSchema,
        default: () => ({ points: 0, nextReview: new Date() }),
      },
    },
  },
  {
    timestamps: true,
  }
);

UserWordProgressSchema.index({ userId: 1, wordId: 1 }, { unique: true });
UserWordProgressSchema.index({ userId: 1, "skills.recall.nextReview": 1 });
UserWordProgressSchema.index({ userId: 1, "skills.listening.nextReview": 1 });
UserWordProgressSchema.index({ userId: 1, "skills.writing.nextReview": 1 });
UserWordProgressSchema.index({ userId: 1, "skills.pronunciation.nextReview": 1 });

export default mongoose.models.UserWordProgress || mongoose.model<IUserWordProgressDocument>("UserWordProgress", UserWordProgressSchema);
