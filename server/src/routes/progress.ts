import { Router, Request, Response } from "express";
import mongoose from "mongoose";
import UserWordProgress from "../models/UserWordProgress";
import Vocabulary from "../models/Vocabulary";
import {
  applyDecayToProgress,
  calculateAnswerPoints,
  getNextReviewDate,
} from "../utils/decayCalculator";

const router = Router();

// Hardcoded userId for now (single user mode)
const DEFAULT_USER_ID = "000000000000000000000001";

// ===== HELPER: Apply decay to all overdue records =====
async function applyDecayBatch(userId: string) {
  const now = new Date();
  const progresses = await UserWordProgress.find({ userId });

  let decayedCount = 0;
  let totalDecayedPoints = 0;
  const bulkOps: any[] = [];

  for (const progress of progresses) {
    const result = applyDecayToProgress(progress, now);

    if (result.changed) {
      decayedCount++;
      totalDecayedPoints += result.totalPointsLost;

      bulkOps.push({
        updateOne: {
          filter: { _id: progress._id },
          update: {
            $set: {
              "skills.recall.points": result.skills.recall.points,
              "skills.recall.nextReview": result.skills.recall.nextReview,
              "skills.listening.points": result.skills.listening.points,
              "skills.listening.nextReview": result.skills.listening.nextReview,
              "skills.writing.points": result.skills.writing.points,
              "skills.writing.nextReview": result.skills.writing.nextReview,
              "skills.pronunciation.points":
                result.skills.pronunciation.points,
              "skills.pronunciation.nextReview":
                result.skills.pronunciation.nextReview,
            },
          },
        },
      });
    }
  }

  // Batch write to DB
  if (bulkOps.length > 0) {
    await UserWordProgress.bulkWrite(bulkOps);
  }

  return { decayedCount, totalDecayedPoints };
}

// ================================================================
// GET /api/progress/stats — Thống kê tổng quan (có apply decay)
// ================================================================
router.get("/stats", async (_req: Request, res: Response) => {
  try {
    // 1. Apply decay trước khi tính stats
    const decaySummary = await applyDecayBatch(DEFAULT_USER_ID);

    // 2. Đọc lại data sau decay
    const totalWords = await Vocabulary.countDocuments();
    const progresses = await UserWordProgress.find({
      userId: DEFAULT_USER_ID,
    });

    const now = new Date();
    const skills = ["recall", "listening", "writing", "pronunciation"] as const;

    // 3. Calculate per-skill stats
    const skillStats = skills.map((skill) => {
      const wordsWithProgress = progresses.filter(
        (p) => p.skills[skill].points > 0
      );
      const totalPoints = progresses.reduce(
        (sum, p) => sum + p.skills[skill].points,
        0
      );
      const maxPossiblePoints = totalWords * 100;

      // Proficiency tiers
      const mastered = progresses.filter(
        (p) => p.skills[skill].points >= 80
      ).length;
      const familiar = progresses.filter(
        (p) => p.skills[skill].points >= 40 && p.skills[skill].points < 80
      ).length;
      const learning = progresses.filter(
        (p) => p.skills[skill].points > 0 && p.skills[skill].points < 40
      ).length;
      const notStarted = totalWords - wordsWithProgress.length;

      // Due for review
      const dueForReview = progresses.filter(
        (p) => p.skills[skill].nextReview <= now && p.skills[skill].points > 0
      ).length;

      // Average points of words that have progress
      const avgPoints =
        wordsWithProgress.length > 0
          ? Math.round(totalPoints / wordsWithProgress.length)
          : 0;

      // Overall proficiency percentage
      const proficiencyPercent =
        maxPossiblePoints > 0
          ? Math.round((totalPoints / maxPossiblePoints) * 100)
          : 0;

      return {
        skill,
        totalPoints,
        avgPoints,
        proficiencyPercent,
        wordsStarted: wordsWithProgress.length,
        mastered,
        familiar,
        learning,
        notStarted,
        dueForReview,
      };
    });

    // Overall stats
    const overallPoints = skillStats.reduce(
      (sum, s) => sum + s.totalPoints,
      0
    );
    const overallMax = totalWords * 100 * 4;
    const overallPercent =
      overallMax > 0 ? Math.round((overallPoints / overallMax) * 100) : 0;

    // Recently practiced words (last 10)
    const recentProgresses = await UserWordProgress.find({
      userId: DEFAULT_USER_ID,
    })
      .sort({ updatedAt: -1 })
      .limit(10)
      .populate("wordId", "word pronunciation level");

    // Build recent activity with decay status
    const recentActivity = recentProgresses.map((p) => {
      const recallOverdue = p.skills.recall?.nextReview <= now && p.skills.recall?.points > 0;
      const listeningOverdue = p.skills.listening?.nextReview <= now && p.skills.listening?.points > 0;
      const writingOverdue = p.skills.writing.nextReview <= now && p.skills.writing.points > 0;
      const pronOverdue = p.skills.pronunciation.nextReview <= now && p.skills.pronunciation.points > 0;

      return {
        word: (p.wordId as any)?.word || "Unknown",
        pronunciation: (p.wordId as any)?.pronunciation || "",
        level: (p.wordId as any)?.level || "A1",
        skills: {
          recall: p.skills.recall?.points || 0,
          listening: p.skills.listening?.points || 0,
          writing: p.skills.writing.points,
          pronunciation: p.skills.pronunciation.points,
        },
        isDecaying: recallOverdue || listeningOverdue || writingOverdue || pronOverdue,
        updatedAt: p.updatedAt,
      };
    });

    res.json({
      success: true,
      data: {
        totalWords,
        totalWordsWithProgress: progresses.length,
        overallPercent,
        skills: skillStats,
        recentActivity,
        decay: {
          decayedCount: decaySummary.decayedCount,
          totalDecayedPoints: decaySummary.totalDecayedPoints,
          appliedAt: now.toISOString(),
        },
      },
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server error", error });
  }
});

// ================================================================
// GET /api/progress/due — Lấy danh sách từ cần ôn tập
// ================================================================
router.get("/due", async (req: Request, res: Response) => {
  try {
    const skill = (req.query.skill as string) || "recall";
    const limit = parseInt(req.query.limit as string) || 10;
    const now = new Date();

    const validSkills = ["recall", "listening", "writing", "pronunciation"];
    if (!validSkills.includes(skill)) {
      res.status(400).json({
        success: false,
        message: `Invalid skill. Must be one of: ${validSkills.join(", ")}`,
      });
      return;
    }

    // Find overdue words, sorted by most overdue first
    const overdueField = `skills.${skill}.nextReview`;
    const pointsField = `skills.${skill}.points`;

    const dueWords = await UserWordProgress.find({
      userId: DEFAULT_USER_ID,
      [overdueField]: { $lte: now },
      [pointsField]: { $gt: 0 },
    })
      .sort({ [overdueField]: 1 }) // Most overdue first
      .limit(limit)
      .populate("wordId", "word pronunciation meanings level type partOfSpeech topic");

    // Also include words never started (no progress record)
    const wordsWithProgress = await UserWordProgress.find({
      userId: DEFAULT_USER_ID,
    }).select("wordId");
    const progressWordIds = wordsWithProgress.map((p) => p.wordId.toString());

    const newWords = await Vocabulary.find({
      _id: { $nin: progressWordIds },
    })
      .limit(Math.max(0, limit - dueWords.length))
      .select("word pronunciation meanings level type partOfSpeech topic");

    res.json({
      success: true,
      data: {
        dueWords: dueWords.map((p) => ({
          progressId: p._id,
          wordId: (p.wordId as any)?._id,
          word: (p.wordId as any)?.word || "Unknown",
          pronunciation: (p.wordId as any)?.pronunciation || "",
          meanings: (p.wordId as any)?.meanings || [],
          level: (p.wordId as any)?.level || "A1",
          type: (p.wordId as any)?.type || "word",
          currentPoints: (p.skills as any)[skill].points,
          nextReview: (p.skills as any)[skill].nextReview,
          status: "overdue",
        })),
        newWords: newWords.map((v) => ({
          wordId: v._id,
          word: v.word,
          pronunciation: v.pronunciation,
          meanings: v.meanings,
          level: v.level,
          type: v.type,
          currentPoints: 0,
          status: "new",
        })),
        skill,
        totalDue: dueWords.length,
        totalNew: newWords.length,
      },
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server error", error });
  }
});

// ================================================================
// GET /api/progress/practice-words — Lấy N từ có độ thông thạo thấp nhất
// ================================================================
router.get("/practice-words", async (req: Request, res: Response) => {
  try {
    const count = parseInt(req.query.count as string) || 8;
    await applyDecayBatch(DEFAULT_USER_ID);

    // 1. Lấy tất cả từ vựng
    const allVocabs = await Vocabulary.find().lean();
    
    // 2. Lấy tất cả tiến độ
    const progresses = await UserWordProgress.find({ userId: DEFAULT_USER_ID }).lean();
    const progressMap = new Map(progresses.map((p) => [p.wordId.toString(), p]));

    // 3. Tính điểm overall cho mỗi từ
    const wordScores = allVocabs.map((vocab) => {
      const progress = progressMap.get(vocab._id.toString());
      const recall = progress?.skills?.recall?.points ?? 0;
      const listening = progress?.skills?.listening?.points ?? 0;
      const writing = progress?.skills?.writing?.points ?? 0;
      const pronunciation = progress?.skills?.pronunciation?.points ?? 0;
      const overall = Math.round((recall + listening + writing + pronunciation) / 4);

      return {
        vocab,
        recall,
        listening,
        writing,
        pronunciation,
        overall,
      };
    });

    // 4. Sắp xếp: ưu tiên điểm thấp nhất
    // Cùng điểm overall thì random hoặc giữ nguyên
    wordScores.sort((a, b) => {
      if (a.overall !== b.overall) return a.overall - b.overall;
      return Math.random() - 0.5;
    });

    // 5. Lấy N từ đầu tiên
    const selected = wordScores.slice(0, count).map(w => ({
      ...w.vocab,
      skills: {
        recall: w.recall,
        listening: w.listening,
        writing: w.writing,
        pronunciation: w.pronunciation
      },
      overall: w.overall
    }));

    res.json({
      success: true,
      data: selected
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error });
  }
});

// ================================================================
// POST /api/progress/review — Ôn tập 1 từ (cập nhật điểm)
// ================================================================
router.post("/review", async (req: Request, res: Response) => {
  try {
    const { wordId, skill, correct } = req.body;

    // Validate
    if (!wordId || !skill || typeof correct !== "boolean") {
      res.status(400).json({
        success: false,
        message: "Required: wordId (string), skill (string), correct (boolean)",
      });
      return;
    }

    const validSkills = ["recall", "listening", "writing", "pronunciation"];
    if (!validSkills.includes(skill)) {
      res.status(400).json({
        success: false,
        message: `Invalid skill. Must be one of: ${validSkills.join(", ")}`,
      });
      return;
    }

    const userId = new mongoose.Types.ObjectId(DEFAULT_USER_ID);
    const wordObjId = new mongoose.Types.ObjectId(wordId);

    // Find or create progress record
    let progress = await UserWordProgress.findOne({
      userId,
      wordId: wordObjId,
    });

    if (!progress) {
      progress = await UserWordProgress.create({
        userId,
        wordId: wordObjId,
        skills: {
          recall: { points: 0, nextReview: new Date() },
          listening: { points: 0, nextReview: new Date() },
          writing: { points: 0, nextReview: new Date() },
          pronunciation: { points: 0, nextReview: new Date() },
        },
      });
    }

    // Calculate new points
    const currentPoints = (progress.skills as any)[skill].points;
    const { newPoints, pointsChange } = calculateAnswerPoints(
      currentPoints,
      correct,
      0 // TODO: implement streak tracking
    );

    // Calculate next review date
    const nextReview = getNextReviewDate(newPoints);

    // Update in DB
    const updatePath = `skills.${skill}`;
    await UserWordProgress.updateOne(
      { _id: progress._id },
      {
        $set: {
          [`${updatePath}.points`]: newPoints,
          [`${updatePath}.nextReview`]: nextReview,
        },
      }
    );

    // Get tier info
    const getTier = (pts: number) => {
      if (pts >= 80) return "mastered";
      if (pts >= 40) return "familiar";
      if (pts > 0) return "learning";
      return "not_started";
    };

    res.json({
      success: true,
      data: {
        wordId,
        skill,
        correct,
        previousPoints: currentPoints,
        newPoints,
        pointsChange,
        previousTier: getTier(currentPoints),
        newTier: getTier(newPoints),
        nextReview: nextReview.toISOString(),
      },
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server error", error });
  }
});

// ================================================================
// POST /api/progress/apply-decay — Chạy decay thủ công (admin/debug)
// ================================================================
router.post("/apply-decay", async (_req: Request, res: Response) => {
  try {
    const result = await applyDecayBatch(DEFAULT_USER_ID);

    res.json({
      success: true,
      message: `Decay applied: ${result.decayedCount} words affected, ${result.totalDecayedPoints} total points lost`,
      data: result,
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server error", error });
  }
});

// ================================================================
// POST /api/progress/seed-demo — Tạo dữ liệu demo cho skill proficiency
// ================================================================
router.post("/seed-demo", async (_req: Request, res: Response) => {
  try {
    const vocabularies = await Vocabulary.find().limit(50);
    if (vocabularies.length === 0) {
      res
        .status(400)
        .json({ success: false, message: "No vocabularies found to seed" });
      return;
    }

    const userId = new mongoose.Types.ObjectId(DEFAULT_USER_ID);

    let created = 0;
    let skipped = 0;

    for (const vocab of vocabularies) {
      // Check if progress already exists
      const existing = await UserWordProgress.findOne({
        userId,
        wordId: vocab._id,
      });
      if (existing) {
        skipped++;
        continue;
      }

      // Generate realistic-looking random progress
      const rand = Math.random();
      let recallPts: number, listeningPts: number, writingPts: number, pronPts: number;

      if (rand < 0.2) {
        // 20% mastered
        recallPts = 75 + Math.floor(Math.random() * 25);
        listeningPts = 70 + Math.floor(Math.random() * 25);
        writingPts = 60 + Math.floor(Math.random() * 40);
        pronPts = 50 + Math.floor(Math.random() * 50);
      } else if (rand < 0.5) {
        // 30% familiar
        recallPts = 40 + Math.floor(Math.random() * 40);
        listeningPts = 40 + Math.floor(Math.random() * 40);
        writingPts = 30 + Math.floor(Math.random() * 40);
        pronPts = 20 + Math.floor(Math.random() * 50);
      } else if (rand < 0.8) {
        // 30% learning
        recallPts = 10 + Math.floor(Math.random() * 30);
        listeningPts = 10 + Math.floor(Math.random() * 30);
        writingPts = 5 + Math.floor(Math.random() * 25);
        pronPts = 5 + Math.floor(Math.random() * 20);
      } else {
        // 20% just started
        recallPts = Math.floor(Math.random() * 10);
        listeningPts = Math.floor(Math.random() * 10);
        writingPts = Math.floor(Math.random() * 5);
        pronPts = Math.floor(Math.random() * 5);
      }

      // Randomize next review dates (some in the past to trigger decay)
      const daysOffset = () =>
        Math.floor(Math.random() * 14) - 3; // -3 to +11 days
      const makeReviewDate = () => {
        const d = new Date();
        d.setDate(d.getDate() + daysOffset());
        return d;
      };

      await UserWordProgress.create({
        userId,
        wordId: vocab._id,
        skills: {
          recall: { points: recallPts, nextReview: makeReviewDate() },
          listening: { points: listeningPts, nextReview: makeReviewDate() },
          writing: { points: writingPts, nextReview: makeReviewDate() },
          pronunciation: { points: pronPts, nextReview: makeReviewDate() },
        },
      });
      created++;
    }

    res.json({
      success: true,
      message: `Seeded ${created} progress records (${skipped} already existed)`,
      data: { created, skipped },
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server error", error });
  }
});

// ================================================================
// GET /api/progress/words — Danh sách từ vựng kèm điểm + filter
// ================================================================
router.get("/words", async (req: Request, res: Response) => {
  try {
    const {
      tier,
      search,
      sort = "overall_desc",
      page = "1",
      limit = "20",
      skill = "all",
    } = req.query as Record<string, string>;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));

    // 1. Apply decay first
    await applyDecayBatch(DEFAULT_USER_ID);

    // 2. Get all vocabularies
    const searchFilter: any = {};
    if (search) {
      searchFilter.word = { $regex: search, $options: "i" };
    }
    const allVocabs = await Vocabulary.find(searchFilter)
      .select("word pronunciation level type partOfSpeech topic")
      .lean();

    // 3. Get all progress records
    const progresses = await UserWordProgress.find({
      userId: DEFAULT_USER_ID,
    }).lean();
    const progressMap = new Map(
      progresses.map((p) => [p.wordId.toString(), p])
    );

    const now = new Date();

    // 4. Build word list with proficiency
    let wordList = allVocabs.map((vocab) => {
      const progress = progressMap.get(vocab._id.toString());
      const recall = progress?.skills?.recall?.points ?? 0;
      const listening = progress?.skills?.listening?.points ?? 0;
      const writing = progress?.skills?.writing?.points ?? 0;
      const pronunciation = progress?.skills?.pronunciation?.points ?? 0;
      const overall = Math.round((recall + listening + writing + pronunciation) / 4);

      const getTier = (pts: number) => {
        if (pts >= 80) return "mastered";
        if (pts >= 40) return "familiar";
        if (pts > 0) return "learning";
        return "not_started";
      };

      // Check if any skill is overdue
      const isDecaying = progress
        ? (progress.skills.recall?.nextReview <= now && recall > 0) ||
          (progress.skills.listening?.nextReview <= now && listening > 0) ||
          (progress.skills.writing.nextReview <= now && writing > 0) ||
          (progress.skills.pronunciation.nextReview <= now && pronunciation > 0)
        : false;

      return {
        wordId: vocab._id.toString(),
        word: vocab.word,
        pronunciation: vocab.pronunciation || "",
        level: vocab.level || "A1",
        type: vocab.type || "word",
        skills: { recall, listening, writing, pronunciation },
        overall,
        tier: getTier(
          skill === "recall" ? recall :
          skill === "listening" ? listening :
          skill === "writing" ? writing :
          skill === "pronunciation" ? pronunciation :
          overall
        ),
        isDecaying,
        hasProgress: !!progress,
      };
    });

    // 5. Filter by tier
    if (tier && tier !== "all") {
      wordList = wordList.filter((w) => w.tier === tier);
    }

    // 6. Sort
    const sortFns: Record<string, (a: any, b: any) => number> = {
      overall_desc: (a, b) => b.overall - a.overall,
      overall_asc: (a, b) => a.overall - b.overall,
      word_asc: (a, b) => a.word.localeCompare(b.word),
      word_desc: (a, b) => b.word.localeCompare(a.word),
      recall_desc: (a, b) => b.skills.recall - a.skills.recall,
      listening_desc: (a, b) => b.skills.listening - a.skills.listening,
      writing_desc: (a, b) => b.skills.writing - a.skills.writing,
      pronunciation_desc: (a, b) => b.skills.pronunciation - a.skills.pronunciation,
    };
    const sortFn = sortFns[sort] || sortFns.overall_desc;
    wordList.sort(sortFn);

    // 7. Paginate
    const totalItems = wordList.length;
    const totalPages = Math.ceil(totalItems / limitNum);
    const startIdx = (pageNum - 1) * limitNum;
    const paginatedWords = wordList.slice(startIdx, startIdx + limitNum);

    // 8. Tier summary
    const tierSummary = {
      mastered: wordList.filter((w) => w.tier === "mastered").length,
      familiar: wordList.filter((w) => w.tier === "familiar").length,
      learning: wordList.filter((w) => w.tier === "learning").length,
      not_started: wordList.filter((w) => w.tier === "not_started").length,
      total: totalItems,
    };

    res.json({
      success: true,
      data: {
        words: paginatedWords,
        pagination: { page: pageNum, totalPages, totalItems, limit: limitNum },
        tierSummary,
      },
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server error", error });
  }
});

// ================================================================
// PATCH /api/progress/adjust — Tăng/giảm điểm thủ công
// ================================================================
router.patch("/adjust", async (req: Request, res: Response) => {
  try {
    const { wordId, skill, amount } = req.body;

    if (!wordId || !skill || typeof amount !== "number") {
      res.status(400).json({
        success: false,
        message: "Required: wordId (string), skill (string), amount (number, can be negative)",
      });
      return;
    }

    const validSkills = ["recall", "listening", "writing", "pronunciation"];
    if (!validSkills.includes(skill)) {
      res.status(400).json({
        success: false,
        message: `Invalid skill. Must be one of: ${validSkills.join(", ")}`,
      });
      return;
    }

    const userId = new mongoose.Types.ObjectId(DEFAULT_USER_ID);
    const wordObjId = new mongoose.Types.ObjectId(wordId);

    let progress = await UserWordProgress.findOne({ userId, wordId: wordObjId });

    if (!progress) {
      progress = await UserWordProgress.create({
        userId,
        wordId: wordObjId,
        skills: {
          recall: { points: 0, nextReview: new Date() },
          listening: { points: 0, nextReview: new Date() },
          writing: { points: 0, nextReview: new Date() },
          pronunciation: { points: 0, nextReview: new Date() },
        },
      });
    }

    const currentPoints = (progress.skills as any)[skill].points;
    const newPoints = Math.max(0, Math.min(100, currentPoints + amount));
    const nextReview = getNextReviewDate(newPoints);

    await UserWordProgress.updateOne(
      { _id: progress._id },
      {
        $set: {
          [`skills.${skill}.points`]: newPoints,
          [`skills.${skill}.nextReview`]: nextReview,
        },
      }
    );

    res.json({
      success: true,
      data: {
        wordId,
        skill,
        previousPoints: currentPoints,
        newPoints,
        change: newPoints - currentPoints,
        nextReview: nextReview.toISOString(),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error });
  }
});

// ================================================================
// DELETE /api/progress/clear — Xóa tiến độ (toàn bộ hoặc 1 từ)
// ================================================================
router.delete("/clear", async (_req: Request, res: Response) => {
  try {
    const result = await UserWordProgress.deleteMany({
      userId: DEFAULT_USER_ID,
    });
    res.json({
      success: true,
      message: `Cleared all progress: ${result.deletedCount} records deleted`,
      data: { deletedCount: result.deletedCount },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error });
  }
});

router.delete("/clear/:wordId", async (req: Request, res: Response) => {
  try {
    const { wordId } = req.params;
    const result = await UserWordProgress.deleteOne({
      userId: DEFAULT_USER_ID,
      wordId: new mongoose.Types.ObjectId(wordId),
    });
    res.json({
      success: true,
      message: result.deletedCount > 0 ? "Progress cleared" : "No progress found",
      data: { deletedCount: result.deletedCount },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error });
  }
});

export default router;
