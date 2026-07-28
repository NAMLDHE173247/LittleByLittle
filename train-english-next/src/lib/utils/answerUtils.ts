/** Dùng để SO SÁNH — không hiển thị */
export function normalizeForComparison(s: string): string {
  return s
    .normalize('NFKC')                    // Unicode chuẩn hóa trước
    .trim()
    .toLowerCase()
    .replace(/[‘’‛`´]/g, "'")            // smart single quote → thẳng
    .replace(/[“”„‟]/g, '"')            // smart double quote → thẳng
    .replace(/\s+/g, ' ')               // nhiều khoảng trắng → 1
}

/** Dùng để HIỂN THỊ — giữ nguyên format gốc */
export function formatForDisplay(s: string): string {
  return s.trim()
}

export function levenshtein(a: string, b: string): number {
  const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null))
  for (let i = 0; i <= a.length; i++) matrix[0][i] = i
  for (let j = 0; j <= b.length; j++) matrix[j][0] = j
  for (let j = 1; j <= b.length; j++) {
    for (let i = 1; i <= a.length; i++) {
      const indicator = a[i - 1] === b[j - 1] ? 0 : 1
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1, // insertion
        matrix[j - 1][i] + 1, // deletion
        matrix[j - 1][i - 1] + indicator // substitution
      )
    }
  }
  return matrix[b.length][a.length]
}

export function expandValidAnswers(validAnswers: string[]): string[] {
  const expanded = new Set<string>()
  for (const ans of validAnswers) {
    expanded.add(ans) // Keep the original
    const parts = ans.split(/[,;\/]/)
    if (parts.length > 1) {
      for (const part of parts) {
        const trimmed = part.trim()
        if (trimmed) expanded.add(trimmed)
      }
    }
  }
  return Array.from(expanded)
}

export function checkAnswer(input: string, validAnswers: string[]): {
  isCorrect: boolean
  isNearMiss: boolean
  nearMissTarget?: string
} {
  const expandedAnswers = expandValidAnswers(validAnswers)
  
  const cleanInput = input.replace(/[.,;!?]+$/, '')
  const normInput = normalizeForComparison(cleanInput)
  
  const normValidAnswers = expandedAnswers.map(a => normalizeForComparison(a.replace(/[.,;!?]+$/, '')))

  if (normValidAnswers.includes(normInput)) {
    return { isCorrect: true, isNearMiss: false }
  }

  const minDist = Math.min(...normValidAnswers.map(a => levenshtein(normInput, a)))
  const shortestValidLen = Math.min(...normValidAnswers.map(a => a.length))
  const isNearMiss = shortestValidLen >= 4 && minDist === 1

  // Find which target the near miss was for, if any
  let nearMissTarget: string | undefined
  if (isNearMiss) {
    const targetIdx = normValidAnswers.findIndex(a => levenshtein(normInput, a) === 1)
    if (targetIdx !== -1) {
      nearMissTarget = validAnswers[targetIdx]
    } else {
      nearMissTarget = validAnswers[0]
    }
  }

  return {
    isCorrect: false,
    isNearMiss,
    nearMissTarget
  }
}
