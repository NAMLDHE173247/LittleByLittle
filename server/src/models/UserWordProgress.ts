import mongoose, { Schema, Document } from "mongoose";

// Cấu trúc cho mỗi kỹ năng
interface ISkillProgress {
  // Điểm số hiện tại (0-100 hoặc theo thang SRS)
  points: number;
  // Thời điểm đến hạn ôn tập tiếp theo
  nextReview: Date;
}

export interface IUserWordProgress extends Document {
  // ID của người dùng
  userId: mongoose.Types.ObjectId;
  // ID của từ vựng
  wordId: mongoose.Types.ObjectId;
  // 4 kỹ năng cốt lõi
  skills: {
    recall: ISkillProgress;       // Nhớ nghĩa (Từ Việt -> Anh)
    listening: ISkillProgress;    // Nghe hiểu
    writing: ISkillProgress;      // Viết / Chính tả
    pronunciation: ISkillProgress;// Phát âm
  };
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

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
  },
  { _id: false }
);

const UserWordProgressSchema = new Schema<IUserWordProgress>(
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

// Compound index: mỗi user chỉ có 1 record cho mỗi từ
UserWordProgressSchema.index({ userId: 1, wordId: 1 }, { unique: true });

// Index cho truy vấn "từ nào cần ôn tập" theo từng kỹ năng
UserWordProgressSchema.index({ userId: 1, "skills.recall.nextReview": 1 });
UserWordProgressSchema.index({ userId: 1, "skills.listening.nextReview": 1 });
UserWordProgressSchema.index({ userId: 1, "skills.writing.nextReview": 1 });
UserWordProgressSchema.index({ userId: 1, "skills.pronunciation.nextReview": 1 });

const UserWordProgress = mongoose.model<IUserWordProgress>(
  "UserWordProgress",
  UserWordProgressSchema
);

export default UserWordProgress;
