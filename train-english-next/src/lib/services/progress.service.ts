import mongoose from "mongoose";
import User from "../db/models/User";
import { UserWordProgress, Vocabulary, Deck } from "../db/models";
import { DailyActivity } from "../db/models/DailyActivity";
import dbConnect from "../db/connection";
import {
  calculateDecay,
  calculateAnswerPoints,
  getNextReviewDate,
} from "../utils/decayCalculator";



const SKILLS = ["recall", "listening", "writing", "pronunciation"] as const;

// ===== HELPER: Tính decay in-memory (Lazy Evaluation — KHÔNG ghi DB) =====
function getDecayedSkillPoints(
  skillData: { points: number; nextReview: Date },
  now: Date
): number {
  if (!skillData || skillData.points === 0) return 0;
  const { decayedPoints } = calculateDecay(
    skillData.points,
    new Date(skillData.nextReview),
    now
  );
  return decayedPoints;
}

// ================================================================
// GET /api/progress/stats — Thống kê tổng quan (Lazy Evaluation)
// ================================================================
export const getStats = async (userId: string) => {
  await dbConnect();
  try {
    const [totalWords, progresses] = await Promise.all([
      Vocabulary.countDocuments({ userId }),
      UserWordProgress.find({ userId }).lean(),
    ]);

    const now = new Date();

    // Tính decay in-memory cho tất cả progress (KHÔNG ghi DB)
    const decayedProgresses = progresses.map((p) => {
      const decayed: Record<string, number> = {};
      for (const skill of SKILLS) {
        decayed[skill] = getDecayedSkillPoints(p.skills[skill], now);
      }
      return { ...p, _decayed: decayed };
    });

    // Calculate per-skill stats using decayed points
    const skillStats = SKILLS.map((skill) => {
      const wordsWithProgress = decayedProgresses.filter(
        (p) => p._decayed[skill] > 0
      );
      const totalPoints = decayedProgresses.reduce(
        (sum, p) => sum + p._decayed[skill],
        0
      );
      const maxPossiblePoints = totalWords * 100;

      // Proficiency tiers (based on decayed points)
      const mastered = decayedProgresses.filter(
        (p) => p._decayed[skill] >= 80
      ).length;
      const familiar = decayedProgresses.filter(
        (p) => p._decayed[skill] >= 40 && p._decayed[skill] < 80
      ).length;
      const learning = decayedProgresses.filter(
        (p) => p._decayed[skill] > 0 && p._decayed[skill] < 40
      ).length;
      const notStarted = totalWords - wordsWithProgress.length;

      // Due for review: nextReview đã quá hạn VÀ decayed points > 0
      const dueForReview = decayedProgresses.filter(
        (p) =>
          new Date(p.skills[skill].nextReview) <= now &&
          p._decayed[skill] > 0
      ).length;

      const avgPoints =
        wordsWithProgress.length > 0
          ? Math.round(totalPoints / wordsWithProgress.length)
          : 0;

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

    // Recently practiced words (last 10) — also with decay in-memory
    const recentProgresses = await UserWordProgress.find({ userId })
      .sort({ updatedAt: -1 })
      .limit(10)
      .populate("wordId", "word pronunciation level")
      .lean();

    const recentActivity = recentProgresses.map((p: any) => {
      const decayedRecall = getDecayedSkillPoints(p.skills.recall, now);
      const decayedListening = getDecayedSkillPoints(p.skills.listening, now);
      const decayedWriting = getDecayedSkillPoints(p.skills.writing, now);
      const decayedPron = getDecayedSkillPoints(p.skills.pronunciation, now);

      const hasOverdue =
        (new Date(p.skills.recall.nextReview) <= now && decayedRecall > 0) ||
        (new Date(p.skills.listening.nextReview) <= now && decayedListening > 0) ||
        (new Date(p.skills.writing.nextReview) <= now && decayedWriting > 0) ||
        (new Date(p.skills.pronunciation.nextReview) <= now && decayedPron > 0);

      return {
        word: p.wordId?.word || "Unknown",
        pronunciation: p.wordId?.pronunciation || "",
        level: p.wordId?.level || "A1",
        skills: {
          recall: decayedRecall,
          listening: decayedListening,
          writing: decayedWriting,
          pronunciation: decayedPron,
        },
        isDecaying: hasOverdue,
        updatedAt: p.updatedAt,
      };
    });

    return {
      success: true,
      data: {
        totalWords,
        totalWordsWithProgress: progresses.length,
        overallPercent,
        skills: skillStats,
        recentActivity,
        streak: await User.findById(userId).then((u) => u?.streak || 0),
      },
    };
  } catch (error) {
    throw error;
  }
};

// ================================================================
// GET /api/progress/due — Lấy danh sách từ cần ôn tập (Lazy Evaluation)
// ================================================================
export const getDue = async (payload: { skill?: string; limit?: number }, userId: string) => {
  await dbConnect();
  try {
    const skill = (payload.skill as string) || "recall";
    const limit = Number(payload.limit) || 10;
    const now = new Date();

    const validSkills = ["recall", "listening", "writing", "pronunciation"];
    if (!validSkills.includes(skill)) {
      throw new Error(JSON.stringify({
        success: false,
        message: `Invalid skill. Must be one of: ${validSkills.join(", ")}`,
      }));
    }

    // Query overdue words (nextReview đã quá hạn VÀ points gốc > 0)
    const overdueField = `skills.${skill}.nextReview`;
    const pointsField = `skills.${skill}.points`;

    const dueWords = await UserWordProgress.find({
      userId,
      [overdueField]: { $lte: now },
      [pointsField]: { $gt: 0 },
    })
      .sort({ [overdueField]: 1 }) // Most overdue first
      .limit(limit)
      .populate("wordId", "word pronunciation meanings level type partOfSpeech topic")
      .lean();

    // Also include words never started (no progress record)
    const wordsWithProgress = await UserWordProgress.find({
      userId,
    }).select("wordId").lean();
    const progressWordIds = wordsWithProgress.map((p) => p.wordId.toString());

    const newWords = await Vocabulary.find({
      userId,
      _id: { $nin: progressWordIds },
    })
      .limit(Math.max(0, limit - dueWords.length))
      .select("word pronunciation meanings level type partOfSpeech topic")
      .lean();

    return {
      success: true,
      data: {
        dueWords: dueWords.map((p: any) => {
          // Tính decay in-memory cho skill này
          const decayedPoints = getDecayedSkillPoints(p.skills[skill], now);
          return {
            progressId: p._id,
            wordId: p.wordId?._id,
            word: p.wordId?.word || "Unknown",
            pronunciation: p.wordId?.pronunciation || "",
            meanings: p.wordId?.meanings || [],
            level: p.wordId?.level || "A1",
            type: p.wordId?.type || "word",
            currentPoints: decayedPoints,
            nextReview: p.skills[skill].nextReview,
            status: "overdue",
          };
        }),
        newWords: newWords.map((v: any) => ({
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
    };
  } catch (error) {
    throw error;
  }
};

// ================================================================
// GET /api/progress/practice-words — Lấy danh sách từ vựng luyện tập (hỗ trợ filter)
// ================================================================
export const getPracticeWords = async (payload: { count?: number; mode?: string; tier?: string; deckId?: string }, userId: string) => { 
  await dbConnect();
  try {
    const count = Number(payload.count) || 8;
    const mode = (payload.mode as string) || "lowest_score";
    const tierFilter = (payload.tier as string) || "all";
    const deckId = payload.deckId as string;

    // 1. Filter Vocabulary
    const vocabQuery: any = { userId };
    if (deckId) {
      vocabQuery.deckIds = deckId;
    }
    const allVocabs = await Vocabulary.find(vocabQuery).lean();
    
    // 2. Get Progress
    const progresses = await UserWordProgress.find({ userId }).lean();
    const progressMap = new Map(progresses.map((p) => [p.wordId.toString(), p]));

    const now = new Date();

    // 3. Calculate score & tier for each word (decay in-memory)
    let wordScores = allVocabs.map((vocab) => {
      const progress = progressMap.get(vocab._id.toString());
      // Tính decay in-memory thay vì dùng điểm gốc từ DB
      const recall = progress ? getDecayedSkillPoints(progress.skills.recall, now) : 0;
      const listening = progress ? getDecayedSkillPoints(progress.skills.listening, now) : 0;
      const writing = progress ? getDecayedSkillPoints(progress.skills.writing, now) : 0;
      const pronunciation = progress ? getDecayedSkillPoints(progress.skills.pronunciation, now) : 0;
      const overall = Math.round((recall + listening + writing + pronunciation) / 4);

      let tier = "not_started";
      if (overall >= 80) tier = "mastered";
      else if (overall >= 40) tier = "familiar";
      else if (overall > 0) tier = "learning";

      const isDecaying = progress
        ? (new Date(progress.skills.recall?.nextReview) <= now && recall > 0) ||
          (new Date(progress.skills.listening?.nextReview) <= now && listening > 0) ||
          (new Date(progress.skills.writing.nextReview) <= now && writing > 0) ||
          (new Date(progress.skills.pronunciation.nextReview) <= now && pronunciation > 0)
        : false;

      return {
        vocab,
        recall,
        listening,
        writing,
        pronunciation,
        overall,
        tier,
        isDecaying,
        createdAt: vocab.createdAt || new Date(0)
      };
    });

    // 4. Apply Tier & Decaying filter
    if (tierFilter !== "all") {
      wordScores = wordScores.filter(w => w.tier === tierFilter);
    }
    if (mode === "overdue") {
      wordScores = wordScores.filter(w => w.isDecaying);
    } else if (mode === "smart") {
      // Giữ phong độ / Trả nợ: ưu tiên từ quá hạn, bổ sung từ điểm thấp (không lấy từ chưa học)
      wordScores = wordScores.filter(w => w.tier !== "not_started");
    }

    // 5. Sort based on mode
    if (mode === "smart") {
      wordScores.sort((a, b) => {
        if (a.isDecaying !== b.isDecaying) return a.isDecaying ? -1 : 1;
        if (a.overall !== b.overall) return a.overall - b.overall;
        return Math.random() - 0.5;
      });
    } else if (mode === "lowest_score") {
      wordScores.sort((a, b) => {
        if (a.overall !== b.overall) return a.overall - b.overall;
        return Math.random() - 0.5;
      });
    } else if (mode === "newest") {
      wordScores.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (mode === "oldest") {
      wordScores.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    } else {
      // random or overdue (which is already filtered, now random sort)
      wordScores.sort(() => Math.random() - 0.5);
    }

    // 6. Select top N
    const selected = wordScores.slice(0, count).map(w => ({
      ...w.vocab,
      skills: {
        recall: w.recall,
        listening: w.listening,
        writing: w.writing,
        pronunciation: w.pronunciation
      },
      overall: w.overall,
      tier: w.tier,
      isDecaying: w.isDecaying
    }));

    return {
      success: true,
      data: selected,
    };
  } catch (error) {
    throw error;
  }
};

// ================================================================
// GET /api/progress/practice-availability — Đếm số từ khả dụng theo từng pool
// (dùng cho Smart Shortcuts ở trang Streak để cap số lượng không vượt kho)
// ================================================================
export const getPracticeAvailability = async (payload: { deckId?: string }, userId: string) => {
  await dbConnect();
  try {
    const deckId = payload.deckId as string;

    const vocabQuery: any = { userId };
    if (deckId) vocabQuery.deckIds = deckId;
    const allVocabs = await Vocabulary.find(vocabQuery).lean();

    const progresses = await UserWordProgress.find({ userId }).lean();
    const progressMap = new Map(progresses.map((p) => [p.wordId.toString(), p]));
    const now = new Date();

    let due = 0;
    let notStarted = 0;
    let learning = 0;

    for (const vocab of allVocabs) {
      const progress = progressMap.get(vocab._id.toString());
      if (!progress) {
        notStarted++;
        continue;
      }
      const recall = getDecayedSkillPoints(progress.skills.recall, now);
      const listening = getDecayedSkillPoints(progress.skills.listening, now);
      const writing = getDecayedSkillPoints(progress.skills.writing, now);
      const pronunciation = getDecayedSkillPoints(progress.skills.pronunciation, now);
      const overall = Math.round((recall + listening + writing + pronunciation) / 4);

      if (overall === 0) {
        notStarted++;
      } else if (overall < 40) {
        learning++;
      }

      const isDecaying =
        (new Date(progress.skills.recall?.nextReview) <= now && recall > 0) ||
        (new Date(progress.skills.listening?.nextReview) <= now && listening > 0) ||
        (new Date(progress.skills.writing.nextReview) <= now && writing > 0) ||
        (new Date(progress.skills.pronunciation.nextReview) <= now && pronunciation > 0);
      if (isDecaying) due++;
    }

    return {
      success: true,
      data: {
        total: allVocabs.length,
        due,
        notStarted,
        learning,
        started: allVocabs.length - notStarted,
      },
    };
  } catch (error) {
    throw error;
  }
};

// ================================================================
// POST /api/progress/review — Ôn tập 1 từ (Lazy Evaluation: apply decay trước khi tính điểm)
// ================================================================
export const reviewWord = async (payload: { wordId: string; skill: string; correct: boolean; timezone?: string; clientDateString?: string; isHinted?: boolean }, userId: string) => {
  await dbConnect();
  try {
    const { wordId, skill, correct, isHinted = false } = payload;

    // Validate
    if (!wordId || !skill || typeof correct !== "boolean") {
      throw new Error(JSON.stringify({
        success: false,
        message: "Required: wordId (string), skill (string), correct (boolean)",
      }));
    }

    const validSkills = ["recall", "listening", "writing", "pronunciation"];
    if (!validSkills.includes(skill)) {
      throw new Error(JSON.stringify({
        success: false,
        message: `Invalid skill. Must be one of: ${validSkills.join(", ")}`,
      }));
    }

    const userObjId = new mongoose.Types.ObjectId(userId);
    const wordObjId = new mongoose.Types.ObjectId(wordId);
    const now = new Date();

    // ============================================================================
    // LOGIC GAMIFICATION: Ghi nhận hoạt động hàng ngày (Daily Activity Upsert)
    // ============================================================================
    let todayTotalReviews = 0;
    try {
      const todayStr = payload.clientDateString || new Date().toLocaleDateString('en-CA'); 
      const updatedActivity = await DailyActivity.findOneAndUpdate(
        { userId: userObjId, dateString: todayStr },
        { $inc: { totalReviews: 1, [`skills.${skill}`]: 1 } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      todayTotalReviews = updatedActivity.totalReviews;
    } catch (err) {
      console.error("Lỗi khi ghi nhận Daily Activity:", err);
    }

    // Find or create progress record
    let progress = await UserWordProgress.findOne({
      userId: userObjId,
      wordId: wordObjId,
    });

    if (!progress) {
      progress = await UserWordProgress.create({
        userId: userObjId,
        wordId: wordObjId,
        skills: {
          recall: { points: 0, nextReview: now, intervalDays: 0 },
          listening: { points: 0, nextReview: now, intervalDays: 0 },
          writing: { points: 0, nextReview: now, intervalDays: 0 },
          pronunciation: { points: 0, nextReview: now, intervalDays: 0 },
        },
      });
    }

    // Calculate streak
    let user = await User.findById(userObjId);
    let currentStreak = user?.streak || 0;
    
    if (user) {
      const lastStudy = user.lastStudyDate;
      if (!lastStudy) {
        currentStreak = 1;
      } else {
        const tz = payload.timezone || "Asia/Ho_Chi_Minh";
        const formatter = new Intl.DateTimeFormat("en-US", { 
          timeZone: tz, 
          year: 'numeric', 
          month: '2-digit', 
          day: '2-digit' 
        });

        const formatParts = (date: Date) => {
          const parts = formatter.formatToParts(date);
          const y = parts.find(p => p.type === 'year')?.value;
          const m = parts.find(p => p.type === 'month')?.value;
          const d = parts.find(p => p.type === 'day')?.value;
          return `${y}-${m}-${d}`;
        };

        const lastStudyStr = formatParts(new Date(lastStudy));
        const todayStr = formatParts(now);

        const lastStudyMidnight = new Date(`${lastStudyStr}T00:00:00Z`);
        const todayMidnight = new Date(`${todayStr}T00:00:00Z`);

        const diffTime = todayMidnight.getTime() - lastStudyMidnight.getTime();
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) {
          currentStreak += 1;
        } else if (diffDays > 1) {
          currentStreak = 1;
        }
      }
      user.streak = currentStreak;
      user.lastStudyDate = now;
      await user.save();
    }

    // 1. Lấy điểm gốc từ DB
    const rawPoints = (progress.skills as any)[skill].points;
    const rawNextReview = (progress.skills as any)[skill].nextReview;
    const rawIntervalDays = (progress.skills as any)[skill].intervalDays || 0;

    // 2. Tính decay từ điểm gốc (in-memory, không ghi DB)
    const decayedPoints = getDecayedSkillPoints(
      { points: rawPoints, nextReview: rawNextReview },
      now
    );

    // Get tier info
    const getTier = (pts: number) => {
      if (pts >= 80) return "mastered";
      if (pts >= 40) return "familiar";
      if (pts > 0) return "learning";
      return "not_started";
    };
    // =========================================================
    // LOGIC GỢI Ý (BYPASS SRS - KHÔNG CỘNG ĐIỂM NẾU DÙNG GỢI Ý)
    // =========================================================
    if (correct && isHinted) {
      return {
        success: true,
        data: {
          wordId,
          skill,
          correct,
          previousPoints: decayedPoints,
          newPoints: decayedPoints,
          pointsChange: 0,
          previousTier: getTier(decayedPoints),
          newTier: getTier(decayedPoints),
          nextReview: rawNextReview.toISOString(),
          todayTotalReviews,
          message: "Ghi nhận lượt học, nhưng không cộng điểm SRS vì dùng gợi ý"
        },
      };
    }

    // 3. Tính điểm mới DỰA TRÊN ĐIỂM ĐÃ DECAY
    const { newPoints, pointsChange } = calculateAnswerPoints(
      decayedPoints,
      correct,
      currentStreak
    );

    // 4. Tính mốc next review mới (kèm nhân số interval cho Mastered)
    const { nextReview, newIntervalDays } = getNextReviewDate(newPoints, rawIntervalDays, now);

    // 5. GHI VÀO DB — Lần write DUY NHẤT
    const updatePath = `skills.${skill}`;
    await UserWordProgress.updateOne(
      { _id: progress._id },
      {
        $set: {
          [`${updatePath}.points`]: newPoints,
          [`${updatePath}.nextReview`]: nextReview,
          [`${updatePath}.intervalDays`]: newIntervalDays,
        },
      }
    );

    return {
      success: true,
      data: {
        wordId,
        skill,
        correct,
        previousPoints: decayedPoints,
        newPoints,
        pointsChange,
        previousTier: getTier(decayedPoints),
        newTier: getTier(newPoints),
        nextReview: nextReview.toISOString(),
        todayTotalReviews,
      },
    };
  } catch (error) {
    throw error;
  }
};

// ================================================================
// POST /api/progress/seed-demo — Tạo dữ liệu demo cho skill proficiency
// ================================================================
export const seedDemo = async (userId: string) => { 
  await dbConnect();
  try {
    // const userId = userId;
    const vocabularies = await Vocabulary.find({ userId }).limit(50);
    if (vocabularies.length === 0) {
      throw new Error(JSON.stringify({
        success: false,
        message: "No vocabularies found to seed",
      }));
    }

    const userObjId = new mongoose.Types.ObjectId(userId);

    let created = 0;
    let skipped = 0;

    for (const vocab of vocabularies) {
      // Check if progress already exists
      const existing = await UserWordProgress.findOne({
        userId: userObjId,
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
        userId: userObjId,
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

    return {
      success: true,
      message: `Seeded ${created} progress records (${skipped} already existed)`,
      data: { created, skipped },};
  } catch (error) {
    throw error;
  }
};

// ================================================================
// GET /api/progress/words — Danh sách từ vựng kèm điểm + filter
// ================================================================
export const getWords = async (payload: { tier?: string; search?: string; sort?: string; page?: string; limit?: string; skill?: string; deckId?: string }, userId: string) => {
  await dbConnect();
  try {
    const {
      tier,
      search,
      sort = "overall_desc",
      page = "1",
      limit = "20",
      skill = "all",
      deckId,
    } = payload as Record<string, string>;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));

    // Verify deck ownership if deckId is provided
    if (deckId) {
      if (!mongoose.Types.ObjectId.isValid(deckId)) {
        throw new Error(JSON.stringify({ success: false, message: "Invalid deckId" }));
      }
      const deck = await Deck.findOne({ _id: deckId, userId });
      if (!deck) {
        throw new Error(JSON.stringify({ success: false, message: "Deck not found or access denied" }));
      }
    }

    // Get all vocabularies
    const searchFilter: any = {};
    if (search) {
      searchFilter.word = { $regex: search, $options: "i" };
    }
    if (deckId) {
      searchFilter.deckIds = new mongoose.Types.ObjectId(deckId);
    }
    searchFilter.userId = userId;
    const allVocabs = await Vocabulary.find(searchFilter)
      .select("word pronunciation meanings imageUrl level type partOfSpeech topic")
      .lean();

    // Get all progress records
    const progresses = await UserWordProgress.find({ userId }).lean();
    const progressMap = new Map(
      progresses.map((p) => [p.wordId.toString(), p])
    );

    const now = new Date();

    // Build word list with proficiency (decay in-memory)
    let wordList = allVocabs.map((vocab) => {
      const progress = progressMap.get(vocab._id.toString());
      // Tính decay in-memory thay vì dùng điểm gốc từ DB
      const recall = progress ? getDecayedSkillPoints(progress.skills.recall, now) : 0;
      const listening = progress ? getDecayedSkillPoints(progress.skills.listening, now) : 0;
      const writing = progress ? getDecayedSkillPoints(progress.skills.writing, now) : 0;
      const pronunciation = progress ? getDecayedSkillPoints(progress.skills.pronunciation, now) : 0;
      const overall = Math.round((recall + listening + writing + pronunciation) / 4);

      const getTier = (pts: number) => {
        if (pts >= 80) return "mastered";
        if (pts >= 40) return "familiar";
        if (pts > 0) return "learning";
        return "not_started";
      };

      // Check if any skill is overdue (based on decayed points)
      const isDecaying = progress
        ? (new Date(progress.skills.recall?.nextReview) <= now && recall > 0) ||
          (new Date(progress.skills.listening?.nextReview) <= now && listening > 0) ||
          (new Date(progress.skills.writing.nextReview) <= now && writing > 0) ||
          (new Date(progress.skills.pronunciation.nextReview) <= now && pronunciation > 0)
        : false;

      return {
        wordId: vocab._id.toString(),
        word: vocab.word,
        pronunciation: vocab.pronunciation || "",
        meanings: vocab.meanings || [],
        imageUrl: vocab.imageUrl || "",
        level: vocab.level || "A1",
        type: vocab.type || "word",
        partOfSpeech: vocab.partOfSpeech || "",
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

    // Filter by tier
    if (tier && tier !== "all") {
      wordList = wordList.filter((w) => w.tier === tier);
    }

    // Sort (in-memory — sort dựa trên điểm đã decay)
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

    // Paginate (in-memory)
    const totalItems = wordList.length;
    const totalPages = Math.ceil(totalItems / limitNum);
    const startIdx = (pageNum - 1) * limitNum;
    const paginatedWords = wordList.slice(startIdx, startIdx + limitNum);

    // Tier summary
    const tierSummary = {
      mastered: wordList.filter((w) => w.tier === "mastered").length,
      familiar: wordList.filter((w) => w.tier === "familiar").length,
      learning: wordList.filter((w) => w.tier === "learning").length,
      not_started: wordList.filter((w) => w.tier === "not_started").length,
      total: totalItems,
    };

    return {
      success: true,
      data: {
        words: paginatedWords,
        pagination: { page: pageNum, totalPages, totalItems, limit: limitNum },
        tierSummary,
      },
    };
  } catch (error) {
    throw error;
  }
};

// ================================================================
// PATCH /api/progress/adjust — Tăng/giảm điểm thủ công (Lazy Evaluation)
// ================================================================
export const adjustProgress = async (payload: { wordId: string; skill: string; amount: number }, userId: string) => {
  await dbConnect();
  try {
    const { wordId, skill, amount } = payload;

    if (!wordId || !skill || typeof amount !== "number") {
      throw new Error(JSON.stringify({
        success: false,
        message: "Required: wordId (string), skill (string), amount (number, can be negative)",
      }));
    }

    const validSkills = ["recall", "listening", "writing", "pronunciation"];
    if (!validSkills.includes(skill)) {
      throw new Error(JSON.stringify({
        success: false,
        message: `Invalid skill. Must be one of: ${validSkills.join(", ")}`,
      }));
    }

    const userObjId = new mongoose.Types.ObjectId(userId);
    const wordObjId = new mongoose.Types.ObjectId(wordId);
    const now = new Date();

    let progress = await UserWordProgress.findOne({ userId: userObjId, wordId: wordObjId });

    if (!progress) {
      progress = await UserWordProgress.create({
        userId: userObjId,
        wordId: wordObjId,
        skills: {
          recall: { points: 0, nextReview: now, intervalDays: 0 },
          listening: { points: 0, nextReview: now, intervalDays: 0 },
          writing: { points: 0, nextReview: now, intervalDays: 0 },
          pronunciation: { points: 0, nextReview: now, intervalDays: 0 },
        },
      });
    }

    // Tính decay trước khi adjust
    const rawPoints = (progress.skills as any)[skill].points;
    const rawNextReview = (progress.skills as any)[skill].nextReview;
    const rawIntervalDays = (progress.skills as any)[skill].intervalDays || 0;
    const decayedPoints = getDecayedSkillPoints(
      { points: rawPoints, nextReview: rawNextReview },
      now
    );

    // Adjust dựa trên điểm đã decay
    const newPoints = Math.max(0, Math.min(100, decayedPoints + amount));
    const { nextReview, newIntervalDays } = getNextReviewDate(newPoints, rawIntervalDays, now);

    await UserWordProgress.updateOne(
      { _id: progress._id },
      {
        $set: {
          [`skills.${skill}.points`]: newPoints,
          [`skills.${skill}.nextReview`]: nextReview,
          [`skills.${skill}.intervalDays`]: newIntervalDays,
        },
      }
    );

    return {
      success: true,
      data: {
        wordId,
        skill,
        previousPoints: decayedPoints,
        newPoints,
        change: newPoints - decayedPoints,
        nextReview: nextReview.toISOString(),
      },
    };
  } catch (error) {
    throw error;
  }
};

// ================================================================
// DELETE /api/progress/clear — Xóa tiến độ (toàn bộ hoặc 1 từ)
// ================================================================
export const clearProgress = async (userId: string) => { 
  await dbConnect();
  try {
    // const userId = userId;
    const result = await UserWordProgress.deleteMany({
      userId,
    });
    return {
      success: true,
      message: `Cleared all progress: ${result.deletedCount} records deleted`,
      data: { deletedCount: result.deletedCount },};
  } catch (error) {
    throw error;
  }
};

export const clearProgressByWordId = async (payload: { wordId: string }, userId: string) => { 
  await dbConnect();
  try {
    // const userId = userId;
    const { wordId } = payload;
    const result = await UserWordProgress.deleteOne({
      userId,
      wordId: new mongoose.Types.ObjectId(wordId),
    });
    return {
      success: true,
      message: result.deletedCount > 0 ? "Progress cleared" : "No progress found",
      data: { deletedCount: result.deletedCount },};
  } catch (error) {
    throw error;
  }
};

