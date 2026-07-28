export type QuestionType = 'multiple' | 'fill' | 'listen';
export type TranslationDirection = 'en2vi' | 'vi2en' | 'mixed';
export type SourceScope = 'all' | 'deck' | 'weak' | 'due';
export type SourceOrder = 'adaptive' | 'lowest_score' | 'overdue' | 'newest' | 'oldest' | 'random';
export type CombineStrategy = 'smart' | 'round_robin';

export interface PlannerWord {
  _id?: string;
  wordId?: string;
  word: string;
  meanings?: string[];
  createdAt?: string;
  deckIds?: Array<{ _id: string }>;
}

export interface PlannerProgress {
  wordId?: string;
  _id?: string;
  overall?: number;
  tier?: string;
  isDecaying?: boolean;
  skills?: {
    recall?: number | { points?: number; nextReview?: string };
    listening?: number | { points?: number; nextReview?: string };
    writing?: number | { points?: number; nextReview?: string };
    pronunciation?: number | { points?: number; nextReview?: string };
  };
}

export interface PlannerSettings {
  direction: TranslationDirection;
  questionTypes: QuestionType[];
  questionCount: number;
  shuffle: boolean;
  sourceScope: SourceScope;
  sourceOrder: SourceOrder;
  combineStrategy: CombineStrategy;
  ensureAllCandidatesOnce?: boolean;
}

export interface PlannedQuestion<TWord extends PlannerWord> {
  vocab: TWord;
  type: QuestionType;
  direction: Exclude<TranslationDirection, 'mixed'>;
  retryForWordId?: string;
  downgradedFrom?: QuestionType;
}

export interface SessionWordState {
  wordId: string;
  exposureCount: number;
  correctCount: number;
  wrongCount: number;
  retryCount: number;
  attemptedTypes: QuestionType[];
  lastSeenIndex: number;
  earliestRetryIndex?: number;
  needsReview: boolean;
}

export interface QuizSessionState<TWord extends PlannerWord> {
  candidates: TWord[];
  progressMap: Map<string, PlannerProgress>;
  settings: PlannerSettings;
  answeredCount: number;
  correctStreak: number;
  wrongStreak: number;
  recentWordIds: string[];
  recentQuestionTypes: QuestionType[];
  wordStates: Map<string, SessionWordState>;
  roundRobinIndex: number;
}

const MAX_RECENT_WORDS = 4;
const MAX_RECENT_TYPES = 3;
const RETRY_GAP = 3;
const MAX_WRONG_PER_WORD = 2;

export const getWordId = (word: PlannerWord): string => String(word._id || word.wordId || word.word);

const skillValue = (value: unknown): number => {
  const raw = typeof value === 'object' && value !== null && 'points' in value
    ? (value as { points?: unknown }).points
    : value;
  const num = Number(raw ?? 0);
  if (!Number.isFinite(num)) return 0;
  return Math.max(0, Math.min(100, Math.round(num)));
};

const getProgressId = (progress: PlannerProgress): string => String(progress.wordId || progress._id || '');

export const getSkillScore = (progress: PlannerProgress | undefined, type: QuestionType): number => {
  if (!progress) return 0;
  if (type === 'fill') return skillValue(progress.skills?.writing);
  if (type === 'listen') return skillValue(progress.skills?.listening);
  return skillValue(progress.skills?.recall);
};

export const getTier = (progress: PlannerProgress | undefined): string => {
  if (progress?.tier) return progress.tier;
  const overall = Number(progress?.overall ?? 0);
  if (overall >= 80) return 'mastered';
  if (overall >= 40) return 'familiar';
  if (overall > 0) return 'learning';
  return 'not_started';
};

const isDue = (progress: PlannerProgress | undefined): boolean => {
  if (!progress) return false;
  if (progress.isDecaying) return true;
  const now = Date.now();
  return Object.values(progress.skills || {}).some((skill) => {
    if (typeof skill !== 'object' || skill === null || !('nextReview' in skill)) return false;
    const points = Number((skill as { points?: unknown }).points ?? 0);
    const nextReview = (skill as { nextReview?: string }).nextReview;
    return points > 0 && Boolean(nextReview) && new Date(nextReview as string).getTime() <= now;
  });
};

const shuffleArray = <T,>(items: T[]): T[] => {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

export const normalizeSource = (sourceMode: string, hasDeckFilter: boolean): Pick<PlannerSettings, 'sourceScope' | 'sourceOrder'> => {
  if (sourceMode === 'weak') return { sourceScope: 'weak', sourceOrder: 'lowest_score' };
  if (sourceMode === 'due') return { sourceScope: 'due', sourceOrder: 'overdue' };
  if (sourceMode === 'deck') return { sourceScope: hasDeckFilter ? 'deck' : 'all', sourceOrder: 'adaptive' };
  if (sourceMode === 'lowest_score') return { sourceScope: 'weak', sourceOrder: 'lowest_score' };
  if (sourceMode === 'overdue') return { sourceScope: 'due', sourceOrder: 'overdue' };
  if (sourceMode === 'newest') return { sourceScope: 'all', sourceOrder: 'newest' };
  if (sourceMode === 'oldest') return { sourceScope: 'all', sourceOrder: 'oldest' };
  if (sourceMode === 'random') return { sourceScope: 'all', sourceOrder: 'random' };
  return { sourceScope: 'all', sourceOrder: 'adaptive' };
};

export function buildCandidatePool<TWord extends PlannerWord>(
  words: TWord[],
  progressMap: Map<string, PlannerProgress>,
  settings: Pick<PlannerSettings, 'sourceScope' | 'sourceOrder' | 'shuffle'>,
): TWord[] {
  let result = words.filter((word) => {
    const progress = progressMap.get(getWordId(word));
    if (settings.sourceScope === 'weak') return getTier(progress) === 'learning' || getTier(progress) === 'not_started' || Number(progress?.overall ?? 0) < 50;
    if (settings.sourceScope === 'due') return isDue(progress);
    return true;
  });

  result = [...result].sort((a, b) => {
    const progressA = progressMap.get(getWordId(a));
    const progressB = progressMap.get(getWordId(b));
    if (settings.sourceOrder === 'lowest_score' || settings.sourceOrder === 'adaptive') {
      const scoreDiff = Number(progressA?.overall ?? 0) - Number(progressB?.overall ?? 0);
      if (scoreDiff !== 0) return scoreDiff;
    }
    if (settings.sourceOrder === 'overdue') {
      if (isDue(progressA) !== isDue(progressB)) return isDue(progressA) ? -1 : 1;
      const scoreDiff = Number(progressA?.overall ?? 0) - Number(progressB?.overall ?? 0);
      if (scoreDiff !== 0) return scoreDiff;
    }
    if (settings.sourceOrder === 'newest') return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    if (settings.sourceOrder === 'oldest') return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
    return 0;
  });

  return settings.sourceOrder === 'random' || settings.shuffle ? shuffleArray(result) : result;
}

export function createSessionState<TWord extends PlannerWord>(
  candidates: TWord[],
  progressItems: PlannerProgress[],
  settings: PlannerSettings,
): QuizSessionState<TWord> {
  const progressMap = new Map<string, PlannerProgress>();
  progressItems.forEach((progress) => {
    const id = getProgressId(progress);
    if (id) progressMap.set(id, progress);
  });

  return {
    candidates: buildCandidatePool(candidates, progressMap, settings),
    progressMap,
    settings,
    answeredCount: 0,
    correctStreak: 0,
    wrongStreak: 0,
    recentWordIds: [],
    recentQuestionTypes: [],
    wordStates: new Map(),
    roundRobinIndex: 0,
  };
}

const canUseQuestionType = (word: PlannerWord, type: QuestionType): boolean => {
  if (!word.word || !word.meanings?.length) return false;
  if (type === 'listen') return Boolean(word.word);
  return true;
};

const chooseDirection = (type: QuestionType, direction: TranslationDirection, index: number): Exclude<TranslationDirection, 'mixed'> => {
  if (direction !== 'mixed') return direction;
  if (type === 'fill') return 'vi2en';
  if (type === 'listen') return 'en2vi';
  return index % 2 === 0 ? 'en2vi' : 'vi2en';
};

const chooseTypeForWord = <TWord extends PlannerWord>(
  word: TWord,
  session: QuizSessionState<TWord>,
  forcedType?: QuestionType,
): QuestionType | null => {
  const enabledTypes = session.settings.questionTypes.filter((type) => canUseQuestionType(word, type));
  if (forcedType && enabledTypes.includes(forcedType)) return forcedType;
  if (enabledTypes.length === 0) return null;
  if (enabledTypes.length === 1) return enabledTypes[0];
  if (session.settings.combineStrategy === 'round_robin') {
    return enabledTypes[session.roundRobinIndex % enabledTypes.length];
  }

  const wordId = getWordId(word);
  const progress = session.progressMap.get(wordId);
  const tier = getTier(progress);
  const recentSameTypePenalty = (type: QuestionType) => {
    const recent = session.recentQuestionTypes.slice(-2);
    return recent.length === 2 && recent.every((item) => item === type) ? 120 : 0;
  };

  return enabledTypes
    .map((type) => {
      let stageFit = 0;
      if (tier === 'not_started') stageFit = type === 'multiple' ? 45 : type === 'listen' ? 15 : -35;
      else if (tier === 'learning') stageFit = type === 'multiple' ? 12 : type === 'listen' ? 10 : 8;
      else if (tier === 'familiar') stageFit = type === 'fill' ? 32 : type === 'listen' ? 24 : 0;
      else stageFit = type === 'fill' ? 34 : type === 'listen' ? 28 : -8;

      const difficultyFit = session.wrongStreak >= 2 && type === 'multiple' ? 60 : 0;
      const fatiguePenalty = recentSameTypePenalty(type);
      const score = (100 - getSkillScore(progress, type)) + stageFit + difficultyFit - fatiguePenalty;
      return { type, score };
    })
    .sort((a, b) => b.score - a.score)[0]?.type ?? enabledTypes[0];
};

const scoreWord = <TWord extends PlannerWord>(
  word: TWord,
  session: QuizSessionState<TWord>,
  forcedType?: QuestionType,
): number => {
  const wordId = getWordId(word);
  const progress = session.progressMap.get(wordId);
  const state = session.wordStates.get(wordId);
  const tier = getTier(progress);
  const type = chooseTypeForWord(word, session, forcedType);
  if (!type) return -Infinity;

  const retryReady = state?.earliestRetryIndex !== undefined && state.earliestRetryIndex <= session.answeredCount;
  const skillDeficit = 100 - getSkillScore(progress, type);
  const dueBoost = isDue(progress) ? 28 : 0;
  const sessionErrorBoost = retryReady ? 90 : state?.wrongCount ? 35 : 0;
  const warmupBonus = session.answeredCount < 2 && (tier === 'familiar' || tier === 'learning') ? 45 : 0;
  const recoveryBonus = session.wrongStreak >= 2 && (tier === 'familiar' || tier === 'mastered') ? 42 : 0;
  const stageFitBonus = tier === 'not_started' && type === 'multiple' ? 24 : tier === 'mastered' && type !== 'multiple' ? 18 : 0;
  const recentRepeatPenalty = session.recentWordIds.includes(wordId) ? 160 : 0;
  const seenPenalty = (state?.exposureCount ?? 0) * 18;
  const exhaustedPenalty = state?.needsReview ? 220 : 0;

  return skillDeficit + dueBoost + sessionErrorBoost + warmupBonus + recoveryBonus + stageFitBonus - recentRepeatPenalty - seenPenalty - exhaustedPenalty;
};

const fallbackRetryType = (type: QuestionType, wrongCount: number): QuestionType => {
  if (type === 'fill') return 'multiple';
  if (type === 'listen' && wrongCount >= 2) return 'multiple';
  return type;
};

export function selectNextQuestion<TWord extends PlannerWord>(
  session: QuizSessionState<TWord>,
): { question: PlannedQuestion<TWord> | null; session: QuizSessionState<TWord> } {
  if (session.answeredCount >= session.settings.questionCount || session.candidates.length === 0) {
    return { question: null, session };
  }

  const retryCandidates = session.candidates.filter((word) => {
    const state = session.wordStates.get(getWordId(word));
    return state?.earliestRetryIndex !== undefined && state.earliestRetryIndex <= session.answeredCount && !state.needsReview;
  });
  const source = retryCandidates.length > 0 ? retryCandidates : session.candidates;

  let selectedWord: TWord | null = null;
  let selectedType: QuestionType | null = null;
  let bestScore = -Infinity;

  const unseenCandidates = session.candidates.filter(
    (word) => !session.wordStates.has(getWordId(word))
  );

  const evalSource = 
    session.settings.ensureAllCandidatesOnce && unseenCandidates.length > 0
      ? unseenCandidates
      : source;

  for (const word of evalSource) {
    const wordId = getWordId(word);
    const state = session.wordStates.get(wordId);
    const forcedType = state?.earliestRetryIndex !== undefined && state.earliestRetryIndex <= session.answeredCount
      ? fallbackRetryType(state.attemptedTypes.at(-1) || 'multiple', state.wrongCount)
      : undefined;
    const type = chooseTypeForWord(word, session, forcedType);
    const score = scoreWord(word, session, forcedType);
    if (type && score > bestScore) {
      selectedWord = word;
      selectedType = type;
      bestScore = score;
    }
  }

  if (!selectedWord || !selectedType) return { question: null, session };

  const wordId = getWordId(selectedWord);
  const state = session.wordStates.get(wordId);
  const nextSession = {
    ...session,
    roundRobinIndex: session.roundRobinIndex + 1,
  };

  return {
    question: {
      vocab: selectedWord,
      type: selectedType,
      direction: chooseDirection(selectedType, session.settings.direction, session.answeredCount),
      retryForWordId: state?.earliestRetryIndex !== undefined && state.earliestRetryIndex <= session.answeredCount ? wordId : undefined,
      downgradedFrom: state?.attemptedTypes.at(-1) !== selectedType ? state?.attemptedTypes.at(-1) : undefined,
    },
    session: nextSession,
  };
}

export function recordAnswer<TWord extends PlannerWord>(
  session: QuizSessionState<TWord>,
  question: PlannedQuestion<TWord>,
  isCorrect: boolean,
  hinted = false,
): QuizSessionState<TWord> {
  const wordId = getWordId(question.vocab);
  const prevState = session.wordStates.get(wordId) || {
    wordId,
    exposureCount: 0,
    correctCount: 0,
    wrongCount: 0,
    retryCount: 0,
    attemptedTypes: [],
    lastSeenIndex: -1,
    needsReview: false,
  };

  const countedCorrect = isCorrect && !hinted;
  const wrongCount = countedCorrect ? prevState.wrongCount : prevState.wrongCount + 1;
  const nextWordState: SessionWordState = {
    ...prevState,
    exposureCount: prevState.exposureCount + 1,
    correctCount: countedCorrect ? prevState.correctCount + 1 : prevState.correctCount,
    wrongCount,
    retryCount: countedCorrect ? prevState.retryCount : prevState.retryCount + 1,
    attemptedTypes: [...prevState.attemptedTypes, question.type],
    lastSeenIndex: session.answeredCount,
    earliestRetryIndex: countedCorrect || wrongCount >= MAX_WRONG_PER_WORD
      ? undefined
      : session.answeredCount + RETRY_GAP + 1,
    needsReview: wrongCount >= MAX_WRONG_PER_WORD,
  };

  const wordStates = new Map(session.wordStates);
  wordStates.set(wordId, nextWordState);

  return {
    ...session,
    answeredCount: session.answeredCount + 1,
    correctStreak: countedCorrect ? session.correctStreak + 1 : 0,
    wrongStreak: countedCorrect ? 0 : session.wrongStreak + 1,
    recentWordIds: [...session.recentWordIds, wordId].slice(-MAX_RECENT_WORDS),
    recentQuestionTypes: [...session.recentQuestionTypes, question.type].slice(-MAX_RECENT_TYPES),
    wordStates,
  };
}
