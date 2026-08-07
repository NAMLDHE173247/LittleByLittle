/**
 * Decay Calculator — Hệ thống trừ điểm tự động theo thời gian
 *
 * Mô phỏng Đường cong quên lãng (Forgetting Curve):
 * - Mỗi ngày trôi qua sau nextReview mà không ôn → trừ dần điểm
 * - Decay rate phụ thuộc vào tier hiện tại
 * - Mastered nhớ lâu (decay chậm), Learning quên nhanh (decay nhanh)
 */

// ===== DECAY RATES PER TIER =====
// Points trừ mỗi ngày quá hạn
const DECAY_RATES = {
  mastered: 2,   // 80-100 pts: nhớ lâu, quên chậm
  familiar: 4,   // 40-79 pts:  quen rồi nhưng dễ quên
  learning: 5,   // 1-39 pts:   mới học, quên nhanh nhất
} as const;

// ===== REVIEW INTERVALS =====
// Khoảng cách ôn tập tiếp theo dựa trên điểm
const REVIEW_INTERVALS = [
  { minPoints: 80, days: 14 },   // Mastered: ôn sau 14 ngày
  { minPoints: 60, days: 7 },    // High Familiar: ôn sau 7 ngày
  { minPoints: 40, days: 3 },    // Familiar: ôn sau 3 ngày
  { minPoints: 20, days: 1 },    // Learning: ôn sau 1 ngày
  { minPoints: 1, hours: 4 },    // Just started: ôn sau 4 giờ
] as const;

// ===== ANSWER POINTS =====
export const ANSWER_POINTS = {
  correct: 15,       // Điểm cộng khi đúng
  incorrect: -10,    // Điểm trừ khi sai
  streakBonus: 5,    // Bonus khi đúng liên tiếp (≥3 streak)
  maxPoints: 100,
  minPoints: 0,
};

/**
 * Lấy decay rate dựa trên tier hiện tại
 */
export function getDecayRate(points: number): number {
  if (points >= 80) return DECAY_RATES.mastered;
  if (points >= 40) return DECAY_RATES.familiar;
  if (points > 0) return DECAY_RATES.learning;
  return 0; // Không decay nếu đã 0
}

/**
 * Tính số ngày quá hạn (overdue days)
 * Trả về 0 nếu chưa đến hạn
 */
export function getOverdueDays(nextReview: Date, now: Date = new Date()): number {
  const diff = now.getTime() - nextReview.getTime();
  if (diff <= 0) return 0;
  return Math.floor(diff / (1000 * 60 * 60 * 24)); // Convert ms → days
}

/**
 * Tính điểm sau decay
 *
 * Công thức: decayedPoints = max(0, currentPoints - (daysOverdue × decayRate))
 *
 * Lưu ý: Decay rate được tính theo tier TẠI THỜI ĐIỂM bắt đầu decay,
 * không thay đổi khi điểm giảm qua tier mới trong cùng lần tính.
 */
export function calculateDecay(
  currentPoints: number,
  nextReview: Date,
  now: Date = new Date()
): { decayedPoints: number; pointsLost: number; daysOverdue: number } {
  const daysOverdue = getOverdueDays(nextReview, now);

  if (daysOverdue === 0 || currentPoints === 0) {
    return { decayedPoints: currentPoints, pointsLost: 0, daysOverdue: 0 };
  }

  const decayRate = getDecayRate(currentPoints);
  const totalDecay = daysOverdue * decayRate;
  const decayedPoints = Math.max(0, currentPoints - totalDecay);
  const pointsLost = currentPoints - decayedPoints;

  return { decayedPoints, pointsLost, daysOverdue };
}

/**
 * Tính nextReview mới dựa trên điểm hiện tại và khoảng thời gian ôn tập hiện tại
 */
export function getNextReviewDate(
  points: number,
  currentIntervalDays: number = 0,
  fromDate: Date = new Date()
): { nextReview: Date; newIntervalDays: number } {
  const result = new Date(fromDate);
  let newIntervalDays = 0;

  for (const interval of REVIEW_INTERVALS) {
    if (points >= interval.minPoints) {
      if ("days" in interval) {
        newIntervalDays = interval.days;
        
        // Multiplier logic for Mastered words
        if (points >= 80) { // Default is 14 days
          if (currentIntervalDays >= 14) {
             // Multiply by 2 for each consecutive correct answer while Mastered
             newIntervalDays = currentIntervalDays * 2;
             // Cap at 180 days (6 months)
             if (newIntervalDays > 180) newIntervalDays = 180;
          }
        }
        
        result.setDate(result.getDate() + newIntervalDays);
      } else if ("hours" in interval) {
        result.setHours(result.getHours() + interval.hours);
        newIntervalDays = 0; // Hours are considered 0 days for interval tracking
      }
      return { nextReview: result, newIntervalDays };
    }
  }

  // points === 0: review ngay lập tức
  return { nextReview: result, newIntervalDays: 0 };
}

/**
 * Apply decay cho 1 skill progress
 * Trả về object mới với points và nextReview đã cập nhật
 */
export function applyDecayToSkill(
  skillData: { points: number; nextReview: Date },
  now: Date = new Date()
): {
  points: number;
  nextReview: Date;
  pointsLost: number;
  daysOverdue: number;
  changed: boolean;
} {
  const { decayedPoints, pointsLost, daysOverdue } = calculateDecay(
    skillData.points,
    skillData.nextReview,
    now
  );

  if (pointsLost === 0) {
    return {
      points: skillData.points,
      nextReview: skillData.nextReview,
      pointsLost: 0,
      daysOverdue: 0,
      changed: false,
    };
  }

  // Khi đã decay, đặt nextReview = now để từ hiện lên trong "Due for review"
  const newNextReview = now;

  return {
    points: decayedPoints,
    nextReview: newNextReview,
    pointsLost,
    daysOverdue,
    changed: true,
  };
}

/**
 * Apply decay cho toàn bộ 4 skills của 1 progress document
 */
export function applyDecayToProgress(
  progress: {
    skills: {
      recall: { points: number; nextReview: Date };
      listening: { points: number; nextReview: Date };
      writing: { points: number; nextReview: Date };
      pronunciation: { points: number; nextReview: Date };
    };
  },
  now: Date = new Date()
): {
  skills: {
    recall: { points: number; nextReview: Date };
    listening: { points: number; nextReview: Date };
    writing: { points: number; nextReview: Date };
    pronunciation: { points: number; nextReview: Date };
  };
  totalPointsLost: number;
  changed: boolean;
} {
  const recall = applyDecayToSkill(progress.skills.recall, now);
  const listening = applyDecayToSkill(progress.skills.listening, now);
  const writing = applyDecayToSkill(progress.skills.writing, now);
  const pronunciation = applyDecayToSkill(progress.skills.pronunciation, now);

  const totalPointsLost =
    recall.pointsLost + listening.pointsLost + writing.pointsLost + pronunciation.pointsLost;

  return {
    skills: {
      recall: { points: recall.points, nextReview: recall.nextReview },
      listening: { points: listening.points, nextReview: listening.nextReview },
      writing: { points: writing.points, nextReview: writing.nextReview },
      pronunciation: {
        points: pronunciation.points,
        nextReview: pronunciation.nextReview,
      },
    },
    totalPointsLost,
    changed: recall.changed || listening.changed || writing.changed || pronunciation.changed,
  };
}

/**
 * Tính điểm mới sau khi user trả lời
 */
export function calculateAnswerPoints(
  currentPoints: number,
  correct: boolean,
  streak: number = 0
): { newPoints: number; pointsChange: number } {
  let change = 0;

  if (correct) {
    change = ANSWER_POINTS.correct;
    // Streak bonus: đúng liên tiếp ≥ 3 lần
    if (streak >= 3) {
      change += ANSWER_POINTS.streakBonus;
    }
  } else {
    // Penalty theo tier
    if (currentPoints >= 80) { // Mastered -> Learning hoặc Not Started
      change = -80;
    } else if (currentPoints >= 40) { // Familiar -> Learning hoặc Not Started
      change = -40;
    } else { // Learning -> giảm mạnh; về 0 nếu điểm hiện tại <= 20
      change = -20;
    }
  }

  const newPoints = Math.max(
    ANSWER_POINTS.minPoints,
    Math.min(ANSWER_POINTS.maxPoints, currentPoints + change)
  );

  return {
    newPoints,
    pointsChange: newPoints - currentPoints,
  };
}
