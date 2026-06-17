export interface DeckRef {
  _id: string
  name: string
  color: string
}

export interface DeckItem {
  _id: string
  name: string
  description: string
  color: string
  wordCount: number
  createdAt: string
}

export interface VocabularyItem {
  _id: string
  word: string
  type: 'word' | 'phrase'
  pronunciation: string
  meanings: string[]
  partOfSpeech: string
  examples: { en: string; vi: string }[]
  topic: string
  level: string
  synonyms: string[]
  antonyms: string[]
  note: string
  imageUrl: string
  deckIds: DeckRef[]
  createdAt: string
}

export interface FormData {
  word: string
  type: 'word' | 'phrase'
  pronunciation: string
  meanings: string
  partOfSpeech: string
  examples: { en: string; vi: string }[]
  topic: string
  level: string
  synonyms: string
  antonyms: string
  note: string
  imageUrl: string
  deckIds: string[]
}

export const emptyForm: FormData = {
  word: '', type: 'word', pronunciation: '', meanings: '',
  partOfSpeech: '', examples: [{ en: '', vi: '' }],
  topic: '', level: 'A1', synonyms: '', antonyms: '', note: '', imageUrl: '', deckIds: [],
}

export interface SkillStat {
  skill: string
  totalPoints: number
  avgPoints: number
  proficiencyPercent: number
  wordsStarted: number
  mastered: number
  familiar: number
  learning: number
  notStarted: number
  dueForReview: number
}

export interface RecentActivity {
  word: string
  pronunciation: string
  level: string
  skills: { recall: number; listening: number; writing: number; pronunciation: number }
  isDecaying: boolean
  updatedAt: string
}

export interface DecaySummary {
  decayedCount: number
  totalDecayedPoints: number
  appliedAt: string
}

export interface ProgressData {
  totalWords: number
  totalWordsWithProgress: number
  overallPercent: number
  skills: SkillStat[]
  recentActivity: RecentActivity[]
  decay: DecaySummary
}
