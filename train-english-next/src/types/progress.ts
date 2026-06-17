import mongoose from "mongoose";

export interface ISkillProgress {
  points: number;
  nextReview: Date;
}

export interface IUserWordProgress {
  _id: string | mongoose.Types.ObjectId;
  userId: string | mongoose.Types.ObjectId;
  wordId: string | mongoose.Types.ObjectId;
  skills: {
    recall: ISkillProgress;
    listening: ISkillProgress;
    writing: ISkillProgress;
    pronunciation: ISkillProgress;
  };
  createdAt: Date;
  updatedAt: Date;
}


