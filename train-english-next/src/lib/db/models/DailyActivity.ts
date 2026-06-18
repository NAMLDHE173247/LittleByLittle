import mongoose, { Schema, Document } from 'mongoose';

export interface IDailyActivity extends Document {
  userId: mongoose.Types.ObjectId | string;
  dateString: string; // Định dạng bắt buộc: YYYY-MM-DD
  totalReviews: number;
  skills: {
    recall: number;
    listening: number;
    writing: number;
    pronunciation: number;
  };
}

const DailyActivitySchema = new Schema<IDailyActivity>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    dateString: { type: String, required: true },
    totalReviews: { type: Number, default: 0 },
    skills: {
      recall: { type: Number, default: 0 },
      listening: { type: Number, default: 0 },
      writing: { type: Number, default: 0 },
      pronunciation: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

// BẮT BUỘC: Compound Index
// 1. Đảm bảo tính Unique (1 User chỉ có 1 record duy nhất trong 1 ngày)
// 2. Tốc độ tra cứu lịch sử 365 ngày cực nhanh (tránh full-collection scan)
DailyActivitySchema.index({ userId: 1, dateString: 1 }, { unique: true });

export const DailyActivity = 
  mongoose.models.DailyActivity || 
  mongoose.model<IDailyActivity>('DailyActivity', DailyActivitySchema);
