import React, { useState, useEffect } from 'react'
import './App.css'
import QuizPage from './QuizPage'
import { AuthProvider, useAuth } from './AuthContext'
import { LoginPage } from './AuthPages'

import {
  AcademicCapIcon,
  ChevronLeftIcon,
  ArrowTrendingDownIcon,
  ChevronRightIcon,
  BookOpenIcon,
  MoonIcon,
  SunIcon,
  DocumentTextIcon,
  ChatBubbleLeftRightIcon,
  TagIcon,
  MagnifyingGlassIcon,
  TrashIcon,
  SpeakerWaveIcon,
  EyeIcon,
  PencilSquareIcon,
  PlusIcon,
  LanguageIcon,
  LightBulbIcon,
  ArrowsRightLeftIcon,
  ArrowPathIcon,
  Cog6ToothIcon,
  BookmarkIcon,
  ClipboardDocumentIcon,
  CheckIcon,
  PhotoIcon,
  ArrowDownTrayIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
  RectangleStackIcon,
  SwatchIcon,
  ChartBarIcon,
  TrophyIcon,
  InformationCircleIcon,
  ChevronDownIcon,
  QuestionMarkCircleIcon,
  StarIcon,
  MicrophoneIcon,
} from '@heroicons/react/24/outline'

// Heroicons - Solid (for stat card accent icons)
import {
  BookOpenIcon as BookOpenSolidIcon,
} from '@heroicons/react/24/solid'

import PracticeFlow from './PracticeFlow'
import { ArrowRightStartOnRectangleIcon } from '@heroicons/react/24/outline'

const API_URL = 'http://localhost:5000/api/vocabulary'
const DECK_API_URL = 'http://localhost:5000/api/decks'
const PROGRESS_API_URL = 'http://localhost:5000/api/progress'

interface DeckRef {
  _id: string
  name: string
  color: string
}

interface DeckItem {
  _id: string
  name: string
  description: string
  color: string
  wordCount: number
  createdAt: string
}

interface VocabularyItem {
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

interface FormData {
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

const emptyForm: FormData = {
  word: '', type: 'word', pronunciation: '', meanings: '',
  partOfSpeech: '', examples: [{ en: '', vi: '' }],
  topic: '', level: 'A1', synonyms: '', antonyms: '', note: '', imageUrl: '', deckIds: [],
}

// ===== SKILL PROFICIENCY TYPES =====
interface SkillStat {
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

interface RecentActivity {
  word: string
  pronunciation: string
  level: string
  skills: { recall: number; listening: number; writing: number; pronunciation: number }
  isDecaying: boolean
  updatedAt: string
}

interface DecaySummary {
  decayedCount: number
  totalDecayedPoints: number
  appliedAt: string
}

interface ProgressData {
  totalWords: number
  totalWordsWithProgress: number
  overallPercent: number
  skills: SkillStat[]
  recentActivity: RecentActivity[]
  decay: DecaySummary
}

// ===== SIDEBAR MENU DATA =====
const menuItems = [
  { icon: <ChartBarIcon className="icon" />, label: 'Thống kê', key: 'statistics' },
  { icon: <AcademicCapIcon className="icon" />, label: 'Cày thông thạo', key: 'practice' },
  { icon: <TrophyIcon className="icon" />, label: 'Độ thành thạo', key: 'mastery' },
  {
    icon: <LightBulbIcon className="icon" />,
    label: 'Luyện tập đơn',
    key: 'single_practice',
    children: [
      { icon: <RectangleStackIcon className="icon" />, label: 'Thẻ ghi nhớ', key: 'flashcards' },
      { icon: <QuestionMarkCircleIcon className="icon" />, label: 'Quiz', key: 'quiz' },
    ]
  },
  { icon: <RectangleStackIcon className="icon" />, label: 'Bộ thẻ', key: 'decks' },
  { icon: <BookOpenIcon className="icon" />, label: 'Từ vựng', key: 'vocabulary' },
]

// ===== MAIN APP =====
function AppContent() {
  const { user, logout, isAdmin, authHeaders, loading: authLoading } = useAuth()
  const darkModeInit = localStorage.getItem('theme') === 'dark'

  // Show login page if not authenticated
  if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: darkModeInit ? '#0f172a' : '#f1f5f9' }}>
        <div style={{ textAlign: 'center', color: darkModeInit ? '#94a3b8' : '#64748b' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📚</div>
          <div>Đang tải...</div>
        </div>
      </div>
    )
  }

  if (!user) {
    return <LoginPage darkMode={darkModeInit} />
  }
  const [vocabularies, setVocabularies] = useState<VocabularyItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme')
    return saved === 'dark'
  })

  // Sidebar
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [activeMenu, setActiveMenu] = useState('statistics')
  const [expandedMenus, setExpandedMenus] = useState<string[]>(['single_practice'])

  const toggleMenu = (key: string) => {
    setExpandedMenus(prev => 
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    )
  }

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterLevel, setFilterLevel] = useState('')
  const [filterTopic, setFilterTopic] = useState('')
  const [filterPartOfSpeech, setFilterPartOfSpeech] = useState('')

  // Table
  const [selectedRows, setSelectedRows] = useState<string[]>([])
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [sortField, setSortField] = useState<string>('word')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [currentPage, setCurrentPage] = useState(1)
  const [detailVocab, setDetailVocab] = useState<VocabularyItem | null>(null)
  const itemsPerPage = 10
  const [totalFiltered, setTotalFiltered] = useState(0)
  const [totalPagesState, setTotalPagesState] = useState(1)
  const [metadata, setMetadata] = useState<{
    total: number;
    totalWords: number;
    totalPhrases: number;
    uniqueTopics: string[];
    uniqueLevels: string[];
    uniquePartsOfSpeech: string[];
  }>({
    total: 0,
    totalWords: 0,
    totalPhrases: 0,
    uniqueTopics: [],
    uniqueLevels: [],
    uniquePartsOfSpeech: [],
  })

  // CRUD Modal
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState<FormData>({ ...emptyForm })
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  // Import
  const [showImportModal, setShowImportModal] = useState(false)
  const [importJsonText, setImportJsonText] = useState('')
  const [importError, setImportError] = useState('')
  const [isImporting, setIsImporting] = useState(false)
  const [importResult, setImportResult] = useState<{inserted: number, skipped: number, skippedWords: string[], errors: string[], total: number} | null>(null)
  const [importCopied, setImportCopied] = useState(false)

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; word: string } | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Copy feedback
  const [copied, setCopied] = useState(false)

  // Decks
  const [decks, setDecks] = useState<DeckItem[]>([])
  const [showDeckModal, setShowDeckModal] = useState(false)
  const [editingDeck, setEditingDeck] = useState<DeckItem | null>(null)
  const [deckForm, setDeckForm] = useState({ name: '', description: '', color: '#3B82F6' })
  const [deckFormError, setDeckFormError] = useState('')
  const [savingDeck, setSavingDeck] = useState(false)
  const [deleteDeckTarget, setDeleteDeckTarget] = useState<DeckItem | null>(null)
  const [filterDeck, setFilterDeck] = useState('')

  // Quick Edit Deck
  const [quickDeckVocab, setQuickDeckVocab] = useState<VocabularyItem | null>(null)
  const [quickDeckIds, setQuickDeckIds] = useState<string[]>([])
  const [savingQuickDeck, setSavingQuickDeck] = useState(false)

  // Statistics (Skill Proficiency)
  const [progressData, setProgressData] = useState<ProgressData | null>(null)
  const [progressLoading, setProgressLoading] = useState(false)
  const [seedingDemo, setSeedingDemo] = useState(false)

  // Word Mastery
  const [showScoringOverview, setShowScoringOverview] = useState(false)
  const [masteryWords, setMasteryWords] = useState<any[]>([])
  const [masteryLoading, setMasteryLoading] = useState(false)
  const [masteryTierFilter, setMasteryTierFilter] = useState('all')
  const [masterySearch, setMasterySearch] = useState('')
  const [masterySort, setMasterySort] = useState('overall_desc')
  const [masterySkillFilter, setMasterySkillFilter] = useState('all')
  const [masteryPage, setMasteryPage] = useState(1)
  const [masteryPagination, setMasteryPagination] = useState({ page: 1, totalPages: 1, totalItems: 0, limit: 15 })
  const [masteryTierSummary, setMasteryTierSummary] = useState({ mastered: 0, familiar: 0, learning: 0, not_started: 0, total: 0 })
  const [clearingProgress, setClearingProgress] = useState(false)

  // Flash Cards
  const [fcIndex, setFcIndex] = useState(0)
  const [fcFlipped, setFcFlipped] = useState(false)
  const [fcShuffled, setFcShuffled] = useState(false)
  const [fcOrder, setFcOrder] = useState<number[]>([])
  const [fcAutoSpeak, setFcAutoSpeak] = useState(false)
  const [fcShowSettings, setFcShowSettings] = useState(false)
  const [fcFrontContent, setFcFrontContent] = useState<'term' | 'definition'>('term')
  const [fcImageDisplay, setFcImageDisplay] = useState<'definition' | 'term' | 'hidden' | 'blurred'>('term')
  const [fcImageSize, setFcImageSize] = useState<'small' | 'large'>('large')
  const [fcPronunciation, setFcPronunciation] = useState<'front' | 'back'>('front')
  const [fcShowStudyGuide, setFcShowStudyGuide] = useState(false)

  useEffect(() => {
    localStorage.setItem('theme', darkMode ? 'dark' : 'light')
  }, [darkMode])

  useEffect(() => {
    fetchMetadata()
    fetchDecks()
    fetchProgress()
    fetchMasteryWords()
  }, [])

  useEffect(() => {
    fetchVocabularies()
  }, [currentPage, searchQuery, filterCategory, filterLevel, filterTopic, filterPartOfSpeech, filterDeck, sortField, sortDir])

  const fetchMetadata = async () => {
    try {
      const res = await fetch(`${API_URL}/metadata`, { headers: authHeaders() })
      const json = await res.json()
      if (json.success) setMetadata(json.data)
    } catch { /* silent */ }
  }

  const fetchVocabularies = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: String(itemsPerPage),
        search: searchQuery,
        type: filterCategory,
        level: filterLevel,
        topic: filterTopic,
        pos: filterPartOfSpeech,
        deck: filterDeck,
        sortBy: sortField,
        sortDir: sortDir
      })
      const res = await fetch(`${API_URL}?${params}`, { headers: authHeaders() })
      const json = await res.json()
      if (json.success) {
        setVocabularies(json.data)
        setTotalPagesState(json.totalPages)
        setTotalFiltered(json.totalCount)
      } else {
        setError('Failed to fetch data')
      }
    } catch {
      setError('Cannot connect to server')
    } finally {
      setLoading(false)
    }
  }

  const fetchProgress = async () => {
    setProgressLoading(true)
    try {
      const res = await fetch(`${PROGRESS_API_URL}/stats`, { headers: authHeaders() })
      const json = await res.json()
      if (json.success) setProgressData(json.data)
    } catch { /* silent */ }
    finally { setProgressLoading(false) }
  }

  // Refetch stats when switching to statistics tab
  useEffect(() => {
    if (activeMenu === 'statistics' || activeMenu === 'practice') {
      fetch(`${PROGRESS_API_URL}/stats`, { headers: authHeaders() })
        .then(res => res.json())
        .then(json => {
          if (json.success) setProgressData(json.data)
        })
        .catch(err => console.error(err))
    }
  }, [activeMenu])

  const fetchMasteryWords = async (tierOverride?: string, searchOverride?: string, sortOverride?: string, pageOverride?: number, skillOverride?: string) => {
    setMasteryLoading(true)
    try {
      const t = tierOverride ?? masteryTierFilter
      const s = searchOverride ?? masterySearch
      const so = sortOverride ?? masterySort
      const p = pageOverride ?? masteryPage
      const sk = skillOverride ?? masterySkillFilter
      const params = new URLSearchParams({ tier: t, search: s, sort: so, page: String(p), limit: '15', skill: sk })
      const res = await fetch(`${PROGRESS_API_URL}/words?${params}`, { headers: authHeaders() })
      const json = await res.json()
      if (json.success) {
        setMasteryWords(json.data.words)
        setMasteryPagination(json.data.pagination)
        setMasteryTierSummary(json.data.tierSummary)
      }
    } catch { /* silent */ }
    finally { setMasteryLoading(false) }
  }

  const adjustPoints = async (wordId: string, skill: string, amount: number) => {
    try {
      await fetch(`${PROGRESS_API_URL}/adjust`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ wordId, skill, amount })
      })
      await fetchMasteryWords()
    } catch { /* silent */ }
  }

  const clearWordProgress = async (wordId: string) => {
    try {
      await fetch(`${PROGRESS_API_URL}/clear/${wordId}`, { method: 'DELETE', headers: authHeaders() })
      await fetchMasteryWords()
    } catch { /* silent */ }
  }

  const clearAllProgress = async () => {
    if (!confirm('Bạn có chắc muốn xóa TOÀN BỘ tiến độ học tập?')) return
    setClearingProgress(true)
    try {
      await fetch(`${PROGRESS_API_URL}/clear`, { method: 'DELETE', headers: authHeaders() })
      await fetchMasteryWords()
      await fetchProgress()
    } catch { /* silent */ }
    finally { setClearingProgress(false) }
  }

  // ===== FLASH CARDS HELPERS =====
  const fcCards = React.useMemo(() => {
    if (fcOrder.length > 0 && fcShuffled) {
      return fcOrder.map(i => vocabularies[i]).filter(Boolean)
    }
    return vocabularies
  }, [vocabularies, fcOrder, fcShuffled])

  const speakWord = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'en-US'
      utterance.rate = 0.85
      window.speechSynthesis.speak(utterance)
    }
  }

  const fcNext = () => {
    if (fcIndex < fcCards.length - 1) {
      const newIndex = fcIndex + 1
      setFcIndex(newIndex)
      setFcFlipped(false)
      if (fcAutoSpeak && fcCards[newIndex]) speakWord(fcCards[newIndex].word)
    }
  }

  const fcPrev = () => {
    if (fcIndex > 0) {
      const newIndex = fcIndex - 1
      setFcIndex(newIndex)
      setFcFlipped(false)
      if (fcAutoSpeak && fcCards[newIndex]) speakWord(fcCards[newIndex].word)
    }
  }

  const fcToggleShuffle = () => {
    if (fcShuffled) {
      setFcShuffled(false)
      setFcOrder([])
    } else {
      const order = vocabularies.map((_, i) => i)
      for (let i = order.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [order[i], order[j]] = [order[j], order[i]]
      }
      setFcOrder(order)
      setFcShuffled(true)
    }
    setFcIndex(0)
    setFcFlipped(false)
  }

  useEffect(() => {
    if (activeMenu !== 'flashcards') return
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return
      if (e.key === 'ArrowRight') { e.preventDefault(); fcNext() }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); fcPrev() }
      else if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); setFcFlipped(f => !f) }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [activeMenu, fcIndex, fcCards, fcAutoSpeak])

  const seedDemoData = async () => {
    setSeedingDemo(true)
    try {
      const res = await fetch(`${PROGRESS_API_URL}/seed-demo`, { method: 'POST', headers: authHeaders() })
      const json = await res.json()
      if (json.success) {
        await fetchProgress()
      }
    } catch { /* silent */ }
    finally { setSeedingDemo(false) }
  }

  const fetchDecks = async () => {
    try {
      const res = await fetch(DECK_API_URL, { headers: authHeaders() })
      const json = await res.json()
      if (json.success) setDecks(json.data)
    } catch { /* silent */ }
  }

  const handleSaveDeck = async () => {
    if (!deckForm.name.trim()) {
      setDeckFormError('Deck name is required')
      return
    }
    setSavingDeck(true)
    setDeckFormError('')
    try {
      const url = editingDeck ? `${DECK_API_URL}/${editingDeck._id}` : DECK_API_URL
      const method = editingDeck ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(deckForm),
      })
      const json = await res.json()
      if (json.success) {
        await fetchDecks()
        closeDeckModal()
      } else {
        setDeckFormError(json.message || 'Failed to save')
      }
    } catch {
      setDeckFormError('Network error')
    } finally {
      setSavingDeck(false)
    }
  }

  const handleDeleteDeck = async () => {
    if (!deleteDeckTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`${DECK_API_URL}/${deleteDeckTarget._id}`, { method: 'DELETE', headers: authHeaders() })
      const json = await res.json()
      if (json.success) {
        await fetchDecks()
        await fetchVocabularies()
        await fetchMetadata()
        setDeleteDeckTarget(null)
      }
    } catch { /* silent */ }
    finally { setDeleting(false) }
  }

  const handleSaveQuickDeck = async () => {
    if (!quickDeckVocab) return
    setSavingQuickDeck(true)
    try {
      const res = await fetch(`${API_URL}/${quickDeckVocab._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ deckIds: quickDeckIds })
      })
      const json = await res.json()
      if (json.success) {
        await fetchVocabularies()
        await fetchMetadata()
        setQuickDeckVocab(null)
      }
    } catch {
      // silent
    } finally {
      setSavingQuickDeck(false)
    }
  }

  const openDeckModal = (deck?: DeckItem) => {
    if (deck) {
      setEditingDeck(deck)
      setDeckForm({ name: deck.name, description: deck.description, color: deck.color })
    } else {
      setEditingDeck(null)
      setDeckForm({ name: '', description: '', color: '#3B82F6' })
    }
    setDeckFormError('')
    setShowDeckModal(true)
  }

  const closeDeckModal = () => {
    setShowDeckModal(false)
    setEditingDeck(null)
    setDeckForm({ name: '', description: '', color: '#3B82F6' })
    setDeckFormError('')
  }

  const handleSave = async () => {
    if (!formData.word.trim()) {
      setFormError('Word/phrase is required')
      return
    }
    if (!formData.meanings.trim()) {
      setFormError('At least one meaning is required')
      return
    }

    setSaving(true)
    setFormError('')

    const body = {
      ...formData,
      meanings: formData.meanings.split(',').map(s => s.trim()).filter(Boolean),
      synonyms: formData.synonyms ? formData.synonyms.split(',').map(s => s.trim()).filter(Boolean) : [],
      antonyms: formData.antonyms ? formData.antonyms.split(',').map(s => s.trim()).filter(Boolean) : [],
      examples: formData.examples.filter(ex => ex.en.trim() || ex.vi.trim()),
    }

    try {
      const url = editingId ? `${API_URL}/${editingId}` : API_URL
      const method = editingId ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(body),
      })
      const json = await res.json()

      if (json.success) {
        await fetchVocabularies()
        await fetchMetadata()
        await fetchDecks()
        closeModal()
      } else {
        setFormError(json.message || 'Failed to save')
      }
    } catch {
      setFormError('Network error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`${API_URL}/${deleteTarget.id}`, { method: 'DELETE', headers: authHeaders() })
      const json = await res.json()
      if (json.success) {
        await fetchVocabularies()
        await fetchMetadata()
        setSelectedRows(prev => prev.filter(id => id !== deleteTarget.id))
        setDeleteTarget(null)
      }
    } catch {
      // silent
    } finally {
      setDeleting(false)
    }
  }

  const handleImport = async () => {
    if (!importJsonText.trim()) {
      setImportError('Vui lòng dán dữ liệu JSON vào đây')
      return
    }
    setImportError('')
    setImportResult(null)
    setIsImporting(true)
    try {
      let parsedData = JSON.parse(importJsonText)
      // Unwrap markdown code blocks if present
      let cleanText = importJsonText.trim()
      if (cleanText.startsWith('```')) {
        cleanText = cleanText.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim()
        parsedData = JSON.parse(cleanText)
      }
      const res = await fetch(`${API_URL}/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(parsedData)
      })
      const json = await res.json()
      if (json.success) {
        await fetchVocabularies()
        await fetchMetadata()
        setImportResult(json.data)
        setImportJsonText('')
      } else {
        setImportError(json.message || 'Lỗi khi import dữ liệu')
      }
    } catch (e: any) {
      if (e instanceof SyntaxError) {
        // Try stripping markdown code blocks
        try {
          const cleanText = importJsonText.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim()
          const parsedData = JSON.parse(cleanText)
          const res = await fetch(`${API_URL}/bulk`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeaders() },
            body: JSON.stringify(parsedData)
          })
          const json = await res.json()
          if (json.success) {
            await fetchVocabularies()
            await fetchMetadata()
            setImportResult(json.data)
            setImportJsonText('')
          } else {
            setImportError(json.message || 'Lỗi khi import dữ liệu')
          }
        } catch {
          setImportError('Dữ liệu JSON không hợp lệ. Hãy đảm bảo dán đúng mảng JSON từ AI.')
        }
      } else {
        setImportError('Lỗi: ' + e.message)
      }
    } finally {
      setIsImporting(false)
    }
  }

  const handleDeleteSelected = async () => {
    if (selectedRows.length === 0) return
    setDeleting(true)
    try {
      const res = await fetch(API_URL, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ ids: selectedRows }),
      })
      const json = await res.json()
      if (json.success) {
        await fetchVocabularies()
        await fetchMetadata()
        setSelectedRows([])
      }
    } catch {
      // silent
    } finally {
      setDeleting(false)
    }
  }

  // ===== MODAL HELPERS =====
  const openAddModal = () => {
    setEditingId(null)
    setFormData({ ...emptyForm })
    setFormError('')
    setShowModal(true)
  }

  const openEditModal = (vocab: VocabularyItem) => {
    setEditingId(vocab._id)
    setFormData({
      word: vocab.word,
      type: vocab.type,
      pronunciation: vocab.pronunciation,
      meanings: vocab.meanings.join(', '),
      partOfSpeech: vocab.partOfSpeech,
      examples: vocab.examples.length > 0 ? vocab.examples : [{ en: '', vi: '' }],
      topic: vocab.topic,
      level: vocab.level,
      synonyms: vocab.synonyms.join(', '),
      antonyms: vocab.antonyms.join(', '),
      note: vocab.note,
      imageUrl: vocab.imageUrl || '',
      deckIds: vocab.deckIds ? vocab.deckIds.map(d => d._id) : [],
    })
    setFormError('')
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingId(null)
    setFormData({ ...emptyForm })
    setFormError('')
  }

  const addExample = () => {
    setFormData(prev => ({
      ...prev,
      examples: [...prev.examples, { en: '', vi: '' }],
    }))
  }

  const removeExample = (idx: number) => {
    setFormData(prev => ({
      ...prev,
      examples: prev.examples.filter((_, i) => i !== idx),
    }))
  }

  const updateExample = (idx: number, field: 'en' | 'vi', value: string) => {
    setFormData(prev => ({
      ...prev,
      examples: prev.examples.map((ex, i) => i === idx ? { ...ex, [field]: value } : ex),
    }))
  }

  // ===== FILTERING & SORTING =====
  // Client-side filtering removed. Data is fetched via API.

  // ===== TABLE HANDLERS =====
  const toggleSelectAll = () => {
    if (selectedRows.length === vocabularies.length && vocabularies.length > 0) {
      setSelectedRows([])
    } else {
      setSelectedRows(vocabularies.map(v => v._id))
    }
  }

  const toggleSelectRow = (id: string) => {
    setSelectedRows(prev =>
      prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
    )
  }

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  // ===== HELPERS =====
  const speak = (text: string) => {
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'en-US'
    utterance.rate = 0.9
    utterance.pitch = 1
    const voices = window.speechSynthesis.getVoices()
    const enVoice = voices.find(v => v.lang.startsWith('en') && v.name.includes('Google'))
      || voices.find(v => v.lang.startsWith('en-US'))
      || voices.find(v => v.lang.startsWith('en'))
    if (enVoice) utterance.voice = enVoice
    window.speechSynthesis.speak(utterance)
  }

  const getLevelColor = (level: string) => {
    const colors: Record<string, string> = {
      A1: '#22c55e', A2: '#06b6d4',
      B1: '#3b82f6', B2: '#8b5cf6',
      C1: '#ec4899', C2: '#ef4444',
    }
    return colors[level] || '#94a3b8'
  }



  const getSortIcon = (field: string) => {
    if (sortField !== field) return '⇕'
    return sortDir === 'asc' ? '↑' : '↓'
  }

  return (
    <div className={`dashboard ${darkMode ? 'dark' : 'light'}`}>
      {/* ===== SIDEBAR ===== */}
      <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <span className="brand-icon"><AcademicCapIcon className="icon icon-brand" /></span>
            {!sidebarCollapsed && <span className="brand-text">LittleByLittle</span>}
          </div>
        </div>

        <nav className="sidebar-nav">
          {menuItems.map(item => {
            const hasChildren = item.children && item.children.length > 0;
            const isExpanded = expandedMenus.includes(item.key);
            const isChildActive = hasChildren && item.children!.some(child => child.key === activeMenu);

            return (
              <div key={item.key} className="nav-group">
                <button
                  className={`nav-item ${!hasChildren && activeMenu === item.key ? 'active' : ''} ${isChildActive ? 'active' : ''}`}
                  onClick={() => {
                    if (hasChildren) {
                      toggleMenu(item.key);
                    } else {
                      setActiveMenu(item.key);
                    }
                  }}
                  title={sidebarCollapsed ? item.label : undefined}
                >
                  <span className="nav-icon">{item.icon}</span>
                  {!sidebarCollapsed && (
                    <span className="nav-label">{item.label}</span>
                  )}
                  {!sidebarCollapsed && hasChildren && (
                    <span className={`nav-arrow ${isExpanded ? 'open' : ''}`}>
                      <ChevronRightIcon className="icon" style={{ width: 14, height: 14 }} />
                    </span>
                  )}
                </button>
                {!sidebarCollapsed && hasChildren && (
                  <div className={`nav-children ${isExpanded ? 'expanded' : ''}`}>
                    {item.children!.map(child => (
                      <button
                        key={child.key}
                        className={`nav-child ${activeMenu === child.key ? 'active' : ''}`}
                        onClick={() => setActiveMenu(child.key)}
                      >
                        {child.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          <div className="nav-group" style={{ marginTop: 'auto' }}>
            <button
              className="nav-item"
              onClick={() => setDarkMode(!darkMode)}
              title={sidebarCollapsed ? (darkMode ? 'Chế độ sáng' : 'Chế độ tối') : undefined}
            >
              <span className="nav-icon">{darkMode ? <SunIcon className="icon" /> : <MoonIcon className="icon" />}</span>
              {!sidebarCollapsed && (
                <span className="nav-label">{darkMode ? 'Chế độ sáng' : 'Chế độ tối'}</span>
              )}
            </button>
          </div>
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user" title={sidebarCollapsed ? (user?.name || 'User') : undefined}>
            <div className="avatar-circle">
              <img src={`https://api.dicebear.com/7.x/notionists/svg?seed=${user?.name || 'User'}&backgroundColor=4ade80`} alt="avatar" style={{width: '100%', height: '100%', borderRadius: '50%'}} />
            </div>
            {!sidebarCollapsed && (
              <>
                <div className="user-info">
                  <span className="user-name">{user?.name || 'User'}</span>
                  <span className="user-plan">{user?.role === 'admin' ? 'Admin' : 'User'}</span>
                </div>
                <button className="user-settings-btn" title="Đăng xuất" onClick={logout} style={{color: '#ef4444'}}>
                  <ArrowRightStartOnRectangleIcon className="icon" />
                </button>
              </>
            )}
          </div>
          <button
            className="sidebar-toggle"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            title={sidebarCollapsed ? 'Mở rộng' : 'Thu gọn'}
          >
            {sidebarCollapsed ? <ChevronRightIcon className="icon" /> : <ChevronLeftIcon className="icon" />}
          </button>
        </div>
      </aside>

      {/* ===== MAIN AREA ===== */}
      <div className="main-area">
        {/* CONTENT */}
        <main className="content">
          {activeMenu === 'practice' ? (
            <PracticeFlow onExit={() => setActiveMenu('vocabulary')} />
          ) : activeMenu === 'vocabulary' ? (
          <>
          <div className="page-header">
            <div>
              <h1 className="page-title">Từ vựng</h1>
              <p className="page-subtitle">Quản lý bộ sưu tập từ vựng của bạn</p>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn-import" onClick={() => { setShowImportModal(true); setImportResult(null); setImportError(''); setImportJsonText('') }}>
                <ArrowDownTrayIcon className="icon icon-inline" /> Import từ vựng
              </button>
              <button className="btn-primary" onClick={openAddModal}>
                <PlusIcon className="icon icon-inline" /> Thêm từ mới
              </button>
            </div>
          </div>

          {/* STATS CARDS */}
          <div className="stats-row">
            <div className="stat-card">
              <div className="stat-icon blue"><DocumentTextIcon className="icon" /></div>
              <div className="stat-info">
                <span className="stat-number">{metadata.total}</span>
                <span className="stat-label">Tổng số từ</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon green"><BookOpenSolidIcon className="icon" /></div>
              <div className="stat-info">
                <span className="stat-number">{metadata.totalWords}</span>
                <span className="stat-label">Từ đơn</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon purple"><ChatBubbleLeftRightIcon className="icon" /></div>
              <div className="stat-info">
                <span className="stat-number">{metadata.totalPhrases}</span>
                <span className="stat-label">Cụm từ</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon orange"><TagIcon className="icon" /></div>
              <div className="stat-info">
                <span className="stat-number">{metadata.uniqueTopics.length}</span>
                <span className="stat-label">Chủ đề</span>
              </div>
            </div>
          </div>

          {/* FILTER CARD */}
          <div className="card filter-card">
            <div className="filter-row">
              <div className="search-box">
                <span className="search-icon"><MagnifyingGlassIcon className="icon" /></span>
                <input
                  type="text"
                  placeholder="Tìm từ hoặc nghĩa..."
                  value={searchQuery}
                  onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1) }}
                />
              </div>
              <div className="filter-group">
                <select
                  value={filterCategory}
                  onChange={e => { setFilterCategory(e.target.value); setCurrentPage(1) }}
                >
                  <option value="">Tất cả loại</option>
                  <option value="word">Từ</option>
                  <option value="phrase">Cụm từ</option>
                </select>
                <select
                  value={filterLevel}
                  onChange={e => { setFilterLevel(e.target.value); setCurrentPage(1) }}
                >
                  <option value="">Tất cả cấp độ</option>
                  {metadata.uniqueLevels.sort().map(l => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
                <select
                  value={filterTopic}
                  onChange={e => { setFilterTopic(e.target.value); setCurrentPage(1) }}
                >
                  <option value="">Tất cả chủ đề</option>
                  {metadata.uniqueTopics.sort().map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <select
                  value={filterPartOfSpeech}
                  onChange={e => { setFilterPartOfSpeech(e.target.value); setCurrentPage(1) }}
                >
                  <option value="">Tất cả từ loại</option>
                  {metadata.uniquePartsOfSpeech.sort().map(p => (
                    <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                  ))}
                </select>
                <select
                  value={filterDeck}
                  onChange={e => { setFilterDeck(e.target.value); setCurrentPage(1) }}
                >
                  <option value="">Tất cả bộ thẻ</option>
                  {decks.map(d => (
                    <option key={d._id} value={d._id}>{d.name}</option>
                  ))}
                </select>
                {selectedRows.length > 0 && (
                  <button className="btn-danger-outline" onClick={() => {
                    setDeleteTarget({ id: '__bulk__', word: `${selectedRows.length} items` })
                  }}>
                    <TrashIcon className="icon icon-inline" /> Xóa ({selectedRows.length})
                  </button>
                )}
                <button
                  className="btn-outline"
                  onClick={() => { setSearchQuery(''); setFilterCategory(''); setFilterLevel(''); setFilterTopic(''); setFilterPartOfSpeech(''); setFilterDeck(''); setCurrentPage(1) }}
                >
                  <XMarkIcon className="icon icon-inline" /> Xóa bộ lọc
                </button>
              </div>
            </div>
          </div>

          {/* TABLE CARD */}
          <div className="card table-card">
            {loading ? (
              <div className="loading-state">
                <div className="spinner"></div>
                <p>Đang tải dữ liệu...</p>
              </div>
            ) : error ? (
              <div className="error-state">
                <ExclamationTriangleIcon className="icon icon-inline" /> {error}
              </div>
            ) : (
              <>
                <div className="table-header-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span className="result-count">
                      Hiển thị <strong>{vocabularies.length}</strong> / <strong>{totalFiltered}</strong> kết quả
                      {selectedRows.length > 0 && (
                        <span className="selected-count"> · Đã chọn {selectedRows.length}</span>
                      )}
                    </span>
                    <button 
                      className={`btn-outline ${isSelectionMode ? 'active' : ''}`} 
                      style={{ padding: '4px 10px', fontSize: '12px', background: isSelectionMode ? 'var(--accent-light)' : 'transparent', borderColor: isSelectionMode ? 'var(--accent)' : 'var(--border)' }}
                      onClick={() => {
                        if (isSelectionMode) setSelectedRows([])
                        setIsSelectionMode(!isSelectionMode)
                      }}
                    >
                      <CheckIcon className="icon icon-inline" style={{ width: 14, height: 14 }} /> 
                      {isSelectionMode ? 'Hủy chọn' : 'Chọn nhiều'}
                    </button>
                  </div>
                  <div className="page-buttons">
                    <button
                      className="page-btn"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(1)}
                    >
                      ««
                    </button>
                    <button
                      className="page-btn"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(p => p - 1)}
                    >
                      ‹
                    </button>
                    {Array.from({ length: totalPagesState }, (_, i) => i + 1)
                      .filter(p => p === 1 || p === totalPagesState || Math.abs(p - currentPage) <= 1)
                      .map((p, idx, arr) => (
                        <React.Fragment key={`page-${p}`}>
                          {idx > 0 && arr[idx - 1] !== p - 1 && (
                            <span className="page-ellipsis">…</span>
                          )}
                          <button
                            className={`page-btn ${currentPage === p ? 'active' : ''}`}
                            onClick={() => setCurrentPage(p)}
                          >
                            {p}
                          </button>
                        </React.Fragment>
                      ))}
                    <button
                      className="page-btn"
                      disabled={currentPage === totalPagesState}
                      onClick={() => setCurrentPage(p => p + 1)}
                    >
                      ›
                    </button>
                    <button
                      className="page-btn"
                      disabled={currentPage === totalPagesState}
                      onClick={() => setCurrentPage(totalPagesState)}
                    >
                      »»
                    </button>
                  </div>
                </div>

                <div className="table-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr>
                        {isSelectionMode && (
                          <th className="col-check">
                            <input
                              type="checkbox"
                              checked={vocabularies.length > 0 && selectedRows.length === vocabularies.length}
                              onChange={toggleSelectAll}
                            />
                          </th>
                        )}
                        <th className="col-img">Ảnh</th>
                        <th className="col-sortable" onClick={() => handleSort('word')}>
                          Từ / Cụm từ <span className="sort-icon">{getSortIcon('word')}</span>
                        </th>
                        <th className="col-audio"><SpeakerWaveIcon className="icon icon-sm" /></th>
                        <th>Phát âm</th>
                        <th className="col-meanings">Nghĩa</th>
                        <th className="col-sortable" onClick={() => handleSort('partOfSpeech')}>
                          Từ loại <span className="sort-icon">{getSortIcon('partOfSpeech')}</span>
                        </th>
                        <th className="col-sortable" onClick={() => handleSort('topic')}>
                          Chủ đề <span className="sort-icon">{getSortIcon('topic')}</span>
                        </th>
                        <th className="col-sortable" onClick={() => handleSort('level')}>
                          Cấp độ <span className="sort-icon">{getSortIcon('level')}</span>
                        </th>
                        <th>Bộ thẻ</th>
                        <th>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vocabularies.length === 0 ? (
                        <tr>
                          <td colSpan={11} className="empty-state">
                            Không tìm thấy từ vựng phù hợp với bộ lọc.
                          </td>
                        </tr>
                      ) : vocabularies.map((vocab) => (
                          <tr
                          key={vocab._id}
                          className={`data-row ${selectedRows.includes(vocab._id) ? 'selected' : ''}`}
                        >
                            {isSelectionMode && (
                              <td className="col-check">
                                <input
                                  type="checkbox"
                                  checked={selectedRows.includes(vocab._id)}
                                  onChange={() => toggleSelectRow(vocab._id)}
                                />
                              </td>
                            )}
                            <td className="col-img">
                              {vocab.imageUrl ? (
                                <img
                                  className="table-thumb"
                                  src={vocab.imageUrl}
                                  alt={vocab.word}
                                  onError={e => (e.currentTarget.src = '')}
                                />
                              ) : (
                                <span className="table-thumb-empty"><PhotoIcon className="icon" /></span>
                              )}
                            </td>
                            <td className="col-word" onClick={() => setDetailVocab(vocab)}>
                              <span className="word-text">{vocab.word}</span>
                            </td>
                            <td className="col-audio">
                              <button
                                className="speak-btn"
                                onClick={(e) => { e.stopPropagation(); speak(vocab.word) }}
                                title="Nghe"
                              >
                                <SpeakerWaveIcon className="icon" />
                              </button>
                            </td>
                            <td className="col-pron">{vocab.pronunciation}</td>
                            <td className="col-meanings">
                              {vocab.meanings.map((m, i) => (
                                <span key={i} className="meaning-chip">{m}</span>
                              ))}
                            </td>
                            <td>
                              <span className="badge badge-pos">{vocab.partOfSpeech}</span>
                            </td>
                            <td>
                              <span className="badge badge-topic">{vocab.topic}</span>
                            </td>
                            <td>
                              <span
                                className="badge badge-level"
                                style={{ backgroundColor: getLevelColor(vocab.level) }}
                              >
                                {vocab.level}
                              </span>
                            </td>
                            <td className="col-decks">
                              {vocab.deckIds && vocab.deckIds.length > 0 ? (
                                <div className="deck-badges">
                                  {vocab.deckIds.map(d => (
                                    <span
                                      key={d._id}
                                      className="badge badge-deck"
                                      style={{ backgroundColor: d.color + '20', color: d.color, borderColor: d.color + '40' }}
                                    >
                                      {d.name}
                                    </span>
                                  ))}
                                  <button
                                    className="quick-edit-deck-btn"
                                    onClick={(e) => { e.stopPropagation(); setQuickDeckVocab(vocab); setQuickDeckIds(vocab.deckIds.map(d => d._id)) }}
                                    title="Sửa nhanh bộ thẻ"
                                  >
                                    <PencilSquareIcon className="icon" style={{ width: 14, height: 14 }} />
                                  </button>
                                </div>
                              ) : (
                                <div className="deck-badges">
                                  <span className="text-muted">—</span>
                                  <button
                                    className="quick-edit-deck-btn"
                                    onClick={(e) => { e.stopPropagation(); setQuickDeckVocab(vocab); setQuickDeckIds([]) }}
                                    title="Thêm bộ thẻ"
                                  >
                                    <PlusIcon className="icon" style={{ width: 14, height: 14 }} />
                                  </button>
                                </div>
                              )}
                            </td>
                            <td className="col-actions">
                              <button
                                className="action-btn"
                                title="Xem chi tiết"
                                onClick={() => setDetailVocab(vocab)}
                              >
                                <EyeIcon className="icon" />
                              </button>
                              <button
                                className="action-btn"
                                title="Sửa"
                                onClick={() => openEditModal(vocab)}
                              >
                                <PencilSquareIcon className="icon" />
                              </button>
                              <button
                                className="action-btn delete"
                                title="Xóa"
                                onClick={() => setDeleteTarget({ id: vocab._id, word: vocab.word })}
                              >
                                <TrashIcon className="icon" />
                              </button>
                            </td>
                          </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

              </>
            )}
          </div>
          </>
          ) : activeMenu === 'decks' ? (
          <>
          {/* ===== DECKS PAGE ===== */}
          <div className="page-header">
            <div>
              <h1 className="page-title">Bộ thẻ</h1>
              <p className="page-subtitle">Sắp xếp từ vựng theo bộ thẻ học tập</p>
            </div>
            <button className="btn-primary" onClick={() => openDeckModal()}>
              <PlusIcon className="icon icon-inline" /> Tạo bộ thẻ
            </button>
          </div>

          <div className="deck-grid">
            {decks.length === 0 ? (
              <div className="deck-empty">
                <RectangleStackIcon className="icon" style={{ width: 48, height: 48, opacity: 0.3 }} />
                <p>Chưa có bộ thẻ nào. Tạo bộ thẻ đầu tiên để sắp xếp từ vựng!</p>
              </div>
            ) : (
              decks.map(deck => (
                <div key={deck._id} className="deck-card" style={{ borderTopColor: deck.color }}>
                  <div className="deck-card-header">
                    <div className="deck-card-color" style={{ backgroundColor: deck.color }} />
                    <h3 className="deck-card-name">{deck.name}</h3>
                  </div>
                  {deck.description && (
                    <p className="deck-card-desc">{deck.description}</p>
                  )}
                  <div className="deck-card-stats">
                    <span className="deck-card-count">{deck.wordCount} từ</span>
                  </div>
                  <div className="deck-card-actions">
                    <button className="btn-outline btn-sm" onClick={() => openDeckModal(deck)}>
                      <PencilSquareIcon className="icon icon-inline" /> Sửa
                    </button>
                    <button className="btn-danger-sm" onClick={() => setDeleteDeckTarget(deck)}>
                      <TrashIcon className="icon icon-inline" /> Xóa
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
          </>
          ) : activeMenu === 'statistics' ? (
          <>
          {/* ===== STATISTICS PAGE ===== */}
          <div className="page-header">
            <div>
              <h1 className="page-title">Thống kê</h1>
              <p className="page-subtitle">Thống kê tổng quan về Recall, Listening, Writing & Pronunciation</p>
            </div>
            <button className="btn-primary" onClick={seedDemoData} disabled={seedingDemo}>
              {seedingDemo ? (
                <><span className="spinner-sm"></span> Đang tạo...</>
              ) : (
                <><PlusIcon className="icon icon-inline" /> Tạo dữ liệu mẫu</>
              )}
            </button>
          </div>

          {progressLoading ? (
            <div className="loading-state">
              <div className="spinner"></div>
                <p>Đang tải dữ liệu...</p>
            </div>
          ) : progressData ? (
            <>
            {/* Decay Alert Banner */}
            {progressData.decay && progressData.decay.decayedCount > 0 && (
              <div className="decay-alert-banner">
                <div className="decay-alert-left">
                  <ArrowTrendingDownIcon className="icon" />
                  <div className="decay-alert-text">
                    <strong>⚠ {progressData.decay.decayedCount} từ đang mất điểm</strong>
                    <span>Tổng cộng <strong>−{progressData.decay.totalDecayedPoints} điểm</strong> bị trừ do chưa ôn tập đúng hạn</span>
                  </div>
                </div>
                <div className="decay-alert-right">
                  <span className="decay-alert-time">Cập nhật: {new Date(progressData.decay.appliedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            )}

            {/* Overall Proficiency */}
            <div className="proficiency-overview">
              <div className="proficiency-overall-card">
                <div className="overall-ring-container">
                  <svg className="overall-ring" viewBox="0 0 160 160">
                    <defs>
                      <linearGradient id="overallGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#818CF8" />
                        <stop offset="50%" stopColor="#6366F1" />
                        <stop offset="100%" stopColor="#4F46E5" />
                      </linearGradient>
                    </defs>
                    <circle className="ring-bg" cx="80" cy="80" r="70" />
                    <circle
                      className="ring-progress ring-animate"
                      cx="80" cy="80" r="70"
                      stroke="url(#overallGrad)"
                      strokeDasharray={`${2 * Math.PI * 70}`}
                      strokeDashoffset={`${2 * Math.PI * 70 * (1 - progressData.overallPercent / 100)}`}
                    />
                  </svg>
                  <div className="overall-ring-label">
                    <span className="overall-percent">{progressData.overallPercent}%</span>
                    <span className="overall-text">Tổng quan</span>
                  </div>
                </div>
                <div className="overall-info">
                  <h3>Độ thành thạo tổng</h3>
                  <p className="overall-desc">Tổng hợp mức thành thạo các kỹ năng và từ vựng</p>
                  <div className="overall-meta">
                    <div className="overall-meta-item">
                      <span className="meta-value">{progressData.totalWords}</span>
                      <span className="meta-label">Tổng số từ</span>
                    </div>
                    <div className="overall-meta-item">
                      <span className="meta-value">{progressData.totalWordsWithProgress}</span>
                      <span className="meta-label">Đã học</span>
                    </div>
                    <div className="overall-meta-item">
                      <span className="meta-value">
                        {progressData.skills.reduce((s, sk) => s + sk.dueForReview, 0)}
                      </span>
                      <span className="meta-label">Cần ôn tập</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Decay Breakdown Card */}
            {progressData.decay && progressData.decay.decayedCount > 0 && (
              <div className="decay-breakdown-card">
                <div className="decay-breakdown-header">
                  <ArrowTrendingDownIcon className="icon" />
                  <h3>Chi tiết giảm điểm</h3>
                </div>
                <div className="decay-breakdown-stats">
                  <div className="decay-stat-item">
                    <span className="decay-stat-value">{progressData.decay.decayedCount}</span>
                    <span className="decay-stat-label">Từ bị decay</span>
                  </div>
                  <div className="decay-stat-item">
                    <span className="decay-stat-value decay-negative">−{progressData.decay.totalDecayedPoints}</span>
                    <span className="decay-stat-label">Điểm bị trừ</span>
                  </div>
                  <div className="decay-stat-item">
                    <span className="decay-stat-value">{progressData.skills.reduce((s, sk) => s + sk.dueForReview, 0)}</span>
                    <span className="decay-stat-label">Cần ôn tập</span>
                  </div>
                  <div className="decay-stat-item">
                    <span className="decay-stat-value decay-warning">
                      {progressData.skills.reduce((s, sk) => {
                        // Count words near tier boundary (within 10 pts of dropping)
                        return s + sk.familiar // words at 40-79 that could drop to learning
                      }, 0)}
                    </span>
                    <span className="decay-stat-label">Sắp rớt tier</span>
                  </div>
                </div>
              </div>
            )}

            {/* Per-Skill Cards */}
            <div className="proficiency-skills-grid">
              {progressData.skills.map((sk) => {
                const skillConfig: Record<string, { color: string; gradient: string; icon: React.ReactNode; label: string }> = {
                  recall: {
                    color: '#3B82F6',
                    gradient: 'linear-gradient(135deg, #3B82F6, #2563EB)',
                    icon: <EyeIcon className="icon" />,
                    label: 'Nhớ lại (Recall)',
                  },
                  listening: {
                    color: '#10B981',
                    gradient: 'linear-gradient(135deg, #10B981, #059669)',
                    icon: <SpeakerWaveIcon className="icon" />,
                    label: 'Nghe hiểu',
                  },
                  writing: {
                    color: '#8B5CF6',
                    gradient: 'linear-gradient(135deg, #8B5CF6, #7C3AED)',
                    icon: <PencilSquareIcon className="icon" />,
                    label: 'Viết',
                  },
                  pronunciation: {
                    color: '#F59E0B',
                    gradient: 'linear-gradient(135deg, #F59E0B, #D97706)',
                    icon: <SpeakerWaveIcon className="icon" />,
                    label: 'Phát âm',
                  },
                }
                const cfg = skillConfig[sk.skill]
                const circumference = 2 * Math.PI * 54
                const offset = circumference * (1 - sk.proficiencyPercent / 100)

                return (
                  <div key={sk.skill} className="skill-proficiency-card">
                    <div className="skill-card-top">
                      <div className="skill-ring-container">
                        <svg className="skill-ring" viewBox="0 0 120 120">
                          <circle className="ring-bg" cx="60" cy="60" r="54" />
                          <circle
                            className="ring-progress ring-animate"
                            cx="60" cy="60" r="54"
                            stroke={cfg.color}
                            strokeDasharray={circumference}
                            strokeDashoffset={offset}
                          />
                        </svg>
                        <div className="skill-ring-label">
                          <span className="skill-percent" style={{ color: cfg.color }}>
                            {sk.proficiencyPercent}%
                          </span>
                        </div>
                      </div>
                      <div className="skill-card-info">
                        <div className="skill-name-row">
                          <span className="skill-icon-circle" style={{ background: cfg.gradient }}>
                            {cfg.icon}
                          </span>
                          <h3 className="skill-name">{cfg.label}</h3>
                        </div>
                        <p className="skill-subtitle">
                          {sk.wordsStarted} / {sk.wordsStarted + sk.notStarted} từ đã bắt đầu
                        </p>
                        {sk.dueForReview > 0 && (
                          <span className="skill-due-badge">
                            {sk.dueForReview} cần ôn tập
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Tier Breakdown */}
                    <div className="skill-tiers">
                      <div className="tier-row">
                        <div className="tier-dot" style={{ background: '#22C55E' }} />
                        <span className="tier-label">Thành thạo</span>
                        <span className="tier-bar-container">
                          <span
                            className="tier-bar tier-bar-animate"
                            style={{
                              width: `${(sk.wordsStarted + sk.notStarted) > 0 ? (sk.mastered / (sk.wordsStarted + sk.notStarted)) * 100 : 0}%`,
                              background: '#22C55E',
                            }}
                          />
                        </span>
                        <span className="tier-count">{sk.mastered}</span>
                      </div>
                      <div className="tier-row">
                        <div className="tier-dot" style={{ background: '#3B82F6' }} />
                        <span className="tier-label">Quen thuộc</span>
                        <span className="tier-bar-container">
                          <span
                            className="tier-bar tier-bar-animate"
                            style={{
                              width: `${(sk.wordsStarted + sk.notStarted) > 0 ? (sk.familiar / (sk.wordsStarted + sk.notStarted)) * 100 : 0}%`,
                              background: '#3B82F6',
                            }}
                          />
                        </span>
                        <span className="tier-count">{sk.familiar}</span>
                      </div>
                      <div className="tier-row">
                        <div className="tier-dot" style={{ background: '#F59E0B' }} />
                        <span className="tier-label">Đang học</span>
                        <span className="tier-bar-container">
                          <span
                            className="tier-bar tier-bar-animate"
                            style={{
                              width: `${(sk.wordsStarted + sk.notStarted) > 0 ? (sk.learning / (sk.wordsStarted + sk.notStarted)) * 100 : 0}%`,
                              background: '#F59E0B',
                            }}
                          />
                        </span>
                        <span className="tier-count">{sk.learning}</span>
                      </div>
                      <div className="tier-row">
                        <div className="tier-dot" style={{ background: 'var(--text-muted)' }} />
                        <span className="tier-label">Chưa bắt đầu</span>
                        <span className="tier-bar-container">
                          <span
                            className="tier-bar tier-bar-animate"
                            style={{
                              width: `${(sk.wordsStarted + sk.notStarted) > 0 ? (sk.notStarted / (sk.wordsStarted + sk.notStarted)) * 100 : 0}%`,
                              background: 'var(--text-muted)',
                            }}
                          />
                        </span>
                        <span className="tier-count">{sk.notStarted}</span>
                      </div>
                    </div>

                    <div className="skill-avg">
                      <TrophyIcon className="icon icon-inline" style={{ color: cfg.color }} />
                      Điểm TB: <strong>{sk.avgPoints}</strong> / 100
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Recent Activity */}
            {progressData.recentActivity.length > 0 && (
              <div className="card proficiency-recent-card">
                <div className="proficiency-recent-header">
                  <h3><BookOpenIcon className="icon icon-inline" /> Hoạt động gần đây</h3>
                </div>
                <div className="proficiency-recent-list">
                  {progressData.recentActivity.map((act, idx) => (
                    <div key={idx} className={`recent-activity-row ${act.isDecaying ? 'decaying' : ''}`}>
                      <div className="recent-word-info">
                        <span className="recent-word">{act.word}</span>
                        {act.pronunciation && <span className="recent-pron">{act.pronunciation}</span>}
                        <span
                          className="badge badge-level"
                          style={{ backgroundColor: getLevelColor(act.level), fontSize: '10px', padding: '1px 6px' }}
                        >
                          {act.level}
                        </span>
                        {act.isDecaying && (
                          <span className="badge badge-decaying">
                            <ArrowTrendingDownIcon className="icon" /> Đang giảm
                          </span>
                        )}
                      </div>
                      <div className="recent-skill-bars">
                        <div className="mini-skill" title={`Reading: ${act.skills.reading}`}>
                          <span className="mini-skill-label">R</span>
                          <span className="mini-skill-track">
                            <span className="mini-skill-fill" style={{ width: `${act.skills.reading}%`, background: '#3B82F6' }} />
                          </span>
                          <span className="mini-skill-val">{act.skills.reading}</span>
                        </div>
                        <div className="mini-skill" title={`Writing: ${act.skills.writing}`}>
                          <span className="mini-skill-label">W</span>
                          <span className="mini-skill-track">
                            <span className="mini-skill-fill" style={{ width: `${act.skills.writing}%`, background: '#8B5CF6' }} />
                          </span>
                          <span className="mini-skill-val">{act.skills.writing}</span>
                        </div>
                        <div className="mini-skill" title={`Pronunciation: ${act.skills.pronunciation}`}>
                          <span className="mini-skill-label">P</span>
                          <span className="mini-skill-track">
                            <span className="mini-skill-fill" style={{ width: `${act.skills.pronunciation}%`, background: '#F59E0B' }} />
                          </span>
                          <span className="mini-skill-val">{act.skills.pronunciation}</span>
                        </div>
                      </div>
                      <span className="recent-time">
                        {new Date(act.updatedAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            </>
          ) : (
            <div className="proficiency-empty">
              <TrophyIcon className="icon" style={{ width: 48, height: 48, opacity: 0.3 }} />
              <p>Chưa có dữ liệu.</p>
              <p className="text-muted" style={{ fontSize: 13 }}>Bắt đầu học hoặc tạo dữ liệu mẫu để xem thống kê.</p>
              <button className="btn-primary" style={{ marginTop: 12 }} onClick={seedDemoData} disabled={seedingDemo}>
                {seedingDemo ? 'Đang tạo...' : 'Tạo dữ liệu mẫu'}
              </button>
            </div>
          )}
          </>
          ) : activeMenu === 'mastery' ? (
          <>
          {/* ===== WORD MASTERY PAGE ===== */}
          <div className="page-header">
            <div>
              <h1 className="page-title">Độ thành thạo</h1>
              <p className="page-subtitle">Độ thành thạo từng từ vựng theo kỹ năng</p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="btn-secondary"
                onClick={clearAllProgress}
                disabled={clearingProgress}
                title="Xóa toàn bộ tiến độ"
              >
                {clearingProgress ? 'Đang xóa...' : <><TrashIcon className="icon icon-inline" /> Xóa tất cả</>}
              </button>
              <button className="btn-primary" onClick={seedDemoData} disabled={seedingDemo}>
                {seedingDemo ? 'Đang tạo...' : <><PlusIcon className="icon icon-inline" /> Tạo dữ liệu mẫu</>}
              </button>
            </div>
          </div>

          {/* Scoring Overview (moved here) */}
          <div className="scoring-overview-card">
            <button
              className={`scoring-overview-toggle ${showScoringOverview ? 'open' : ''}`}
              onClick={() => setShowScoringOverview(!showScoringOverview)}
            >
              <div className="scoring-toggle-left">
                <InformationCircleIcon className="icon" />
                <span>Phương pháp tính điểm — Spaced Repetition Scoring</span>
              </div>
              <ChevronDownIcon className={`icon scoring-chevron ${showScoringOverview ? 'rotated' : ''}`} />
            </button>

            <div className={`scoring-overview-body ${showScoringOverview ? 'expanded' : ''}`}>
              <div className="scoring-overview-content">
                <div className="scoring-intro">
                  <p>
                    Hệ thống sử dụng <strong>Spaced Repetition</strong> (Lặp lại ngắt quãng). Từ vựng sẽ bị trừ điểm mỗi ngày nếu không ôn tập.
                    Xem chi tiết decay rate ở bảng dưới.
                  </p>
                </div>
                <div className="scoring-grid">
                  <div className="scoring-section">
                    <div className="scoring-section-header">
                      <ChartBarIcon className="icon" />
                      <h4>Hệ thống điểm (0 — 100)</h4>
                    </div>
                    <div className="scoring-formula">
                      <div className="formula-row">
                        <span className="formula-icon correct">✓</span>
                        <span>Trả lời đúng: <strong>+15 điểm</strong></span>
                      </div>
                      <div className="formula-row">
                        <span className="formula-icon wrong">✗</span>
                        <span>Trả lời sai: <strong>−10 điểm</strong></span>
                      </div>
                      <div className="formula-row">
                        <span className="formula-icon streak">🔥</span>
                        <span>Streak bonus: <strong>+5</strong> khi đúng 3+ lần liên tiếp</span>
                      </div>
                    </div>
                  </div>
                  <div className="scoring-section">
                    <div className="scoring-section-header">
                      <TrophyIcon className="icon" />
                      <h4>Decay Rate theo cấp độ</h4>
                    </div>
                    <div className="scoring-tiers-list">
                      <div className="scoring-tier-item">
                        <div className="tier-indicator" style={{ background: '#22C55E' }} />
                        <div className="tier-info">
                          <strong>Mastered (80–100)</strong>
                          <span className="tier-decay-rate tier-decay-low">🔻 −2 điểm/ngày</span>
                        </div>
                      </div>
                      <div className="scoring-tier-item">
                        <div className="tier-indicator" style={{ background: '#3B82F6' }} />
                        <div className="tier-info">
                          <strong>Familiar (40–79)</strong>
                          <span className="tier-decay-rate tier-decay-med">🔻 −4 điểm/ngày</span>
                        </div>
                      </div>
                      <div className="scoring-tier-item">
                        <div className="tier-indicator" style={{ background: '#F59E0B' }} />
                        <div className="tier-info">
                          <strong>Learning (1–39)</strong>
                          <span className="tier-decay-rate tier-decay-high">🔻 −5 điểm/ngày</span>
                        </div>
                      </div>
                      <div className="scoring-tier-item">
                        <div className="tier-indicator" style={{ background: 'var(--text-muted)' }} />
                        <div className="tier-info">
                          <strong>Not Started (0)</strong>
                          <span className="tier-decay-rate tier-decay-none">Không bị trừ</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tier Filter Chips */}
          <div className="mastery-filters">
            <div className="mastery-filter-row">
              <div className="mastery-search-box">
                <MagnifyingGlassIcon className="icon" />
                <input
                  type="text"
                  placeholder="Tìm từ vựng..."
                  value={masterySearch}
                  onChange={(e) => {
                    setMasterySearch(e.target.value)
                    setMasteryPage(1)
                    fetchMasteryWords(masteryTierFilter, e.target.value, masterySort, 1)
                  }}
                />
              </div>
              <div className="mastery-tier-chips">
                {[
                  { key: 'all', label: `Tất cả (${masteryTierSummary.total})`, color: 'var(--accent)' },
                  { key: 'mastered', label: `Thành thạo (${masteryTierSummary.mastered})`, color: '#22C55E' },
                  { key: 'familiar', label: `Quen thuộc (${masteryTierSummary.familiar})`, color: '#3B82F6' },
                  { key: 'learning', label: `Đang học (${masteryTierSummary.learning})`, color: '#F59E0B' },
                  { key: 'not_started', label: `Chưa bắt đầu (${masteryTierSummary.not_started})`, color: 'var(--text-muted)' },
                ].map(chip => (
                  <button
                    key={chip.key}
                    className={`mastery-chip ${masteryTierFilter === chip.key ? 'active' : ''}`}
                    style={masteryTierFilter === chip.key ? { borderColor: chip.color, background: chip.color + '18' } : {}}
                    onClick={() => {
                      setMasteryTierFilter(chip.key)
                      setMasteryPage(1)
                      fetchMasteryWords(chip.key, masterySearch, masterySort, 1)
                    }}
                  >
                    <span className="chip-dot" style={{ background: chip.color }} />
                    {chip.label}
                  </button>
                ))}
              </div>
              <select
                className="mastery-skill-select"
                value={masterySkillFilter}
                onChange={(e) => {
                  setMasterySkillFilter(e.target.value)
                  setMasteryPage(1)
                  fetchMasteryWords(masteryTierFilter, masterySearch, masterySort, 1, e.target.value)
                }}
              >
                <option value="all">🎯 All Skills</option>
                <option value="recall">🧠 Recall</option>
                <option value="writing">✍️ Writing</option>
                <option value="pronunciation">🔊 Pronunciation</option>
              </select>
              <select
                className="mastery-sort-select"
                value={masterySort}
                onChange={(e) => {
                  setMasterySort(e.target.value)
                  setMasteryPage(1)
                  fetchMasteryWords(masteryTierFilter, masterySearch, e.target.value, 1)
                }}
              >
                <option value="overall_desc">Overall ↓</option>
                <option value="overall_asc">Overall ↑</option>
                <option value="word_asc">A → Z</option>
                <option value="word_desc">Z → A</option>
                <option value="recall_desc">Recall ↓</option>
                <option value="listening_desc">Listening ↓</option>
                <option value="writing_desc">Writing ↓</option>
                <option value="pronunciation_desc">Pronunciation ↓</option>
              </select>
              {(masterySearch || masteryTierFilter !== 'all' || masterySkillFilter !== 'all' || masterySort !== 'overall_desc') && (
                <button
                  className="mastery-clear-filter-btn"
                  onClick={() => {
                    setMasterySearch('')
                    setMasteryTierFilter('all')
                    setMasterySkillFilter('all')
                    setMasterySort('overall_desc')
                    setMasteryPage(1)
                    fetchMasteryWords('all', '', 'overall_desc', 1, 'all')
                  }}
                  title="Xóa bộ lọc"
                >
                  <XMarkIcon className="icon" /> Clear
                </button>
              )}
            </div>
          </div>

          {/* Word Proficiency Table */}
          {masteryLoading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Đang tải dữ liệu...</p>
            </div>
          ) : masteryWords.length > 0 ? (
            <div className="card mastery-table-card">
              <div className="mastery-table-wrapper">
                <table className="mastery-table">
                  <thead>
                    <tr>
                      <th className="col-word">Từ vựng</th>
                      <th className="col-level">Level</th>
                      <th className="col-skill">Recall</th>
                      <th className="col-skill">Listening</th>
                      <th className="col-skill">Writing</th>
                      <th className="col-skill">Pronunciation</th>
                      <th className="col-overall">Overall</th>
                      <th className="col-status">Status</th>
                      <th className="col-actions">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {masteryWords.map((w) => {
                      const tierConfig: Record<string, { label: string; color: string; bg: string }> = {
                        mastered: { label: 'Mastered', color: '#22C55E', bg: 'rgba(34,197,94,0.1)' },
                        familiar: { label: 'Familiar', color: '#3B82F6', bg: 'rgba(59,130,246,0.1)' },
                        learning: { label: 'Learning', color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' },
                        not_started: { label: 'Not Started', color: 'var(--text-muted)', bg: 'var(--bg-input)' },
                      }
                      const tc = tierConfig[w.tier] || tierConfig.not_started
                      const skillColor = (pts: number) => pts >= 80 ? '#22C55E' : pts >= 40 ? '#3B82F6' : pts > 0 ? '#F59E0B' : 'var(--text-muted)'

                      return (
                        <tr key={w.wordId} className={w.isDecaying ? 'row-decaying' : ''}>
                          <td className="col-word">
                            <div className="mastery-word-cell">
                              <span className="mastery-word-name">{w.word}</span>
                              {w.pronunciation && <span className="mastery-word-pron">{w.pronunciation}</span>}
                            </div>
                          </td>
                          <td className="col-level">
                            <span className="badge badge-level" style={{ backgroundColor: getLevelColor(w.level), fontSize: '10px', padding: '2px 6px' }}>
                              {w.level}
                            </span>
                          </td>
                          {(['recall', 'listening', 'writing', 'pronunciation'] as const).map(skill => (
                            <td key={skill} className="col-skill">
                              <div className="mastery-skill-cell">
                                <div className="mastery-skill-bar">
                                  <div className="mastery-skill-fill" style={{ width: `${w.skills[skill]}%`, background: skillColor(w.skills[skill]) }} />
                                </div>
                                <span className="mastery-skill-val" style={{ color: skillColor(w.skills[skill]) }}>{w.skills[skill]}</span>
                                <div className="mastery-adjust-btns">
                                  <button title="+10" onClick={() => adjustPoints(w.wordId, skill, 10)} className="adj-btn adj-up">+</button>
                                  <button title="-10" onClick={() => adjustPoints(w.wordId, skill, -10)} className="adj-btn adj-down">−</button>
                                </div>
                              </div>
                            </td>
                          ))}
                          <td className="col-overall">
                            <span className="mastery-overall-val" style={{ color: skillColor(w.overall) }}>{w.overall}</span>
                          </td>
                          <td className="col-status">
                            <span className="mastery-tier-badge" style={{ color: tc.color, background: tc.bg, borderColor: tc.color + '33' }}>
                              {tc.label}
                            </span>
                          </td>
                          <td className="col-actions">
                            <button
                              className="mastery-clear-btn"
                              title="Xóa tiến độ từ này"
                              onClick={() => clearWordProgress(w.wordId)}
                            >
                              <TrashIcon className="icon" />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {masteryPagination.totalPages > 1 && (
                <div className="mastery-pagination">
                  <button
                    disabled={masteryPage <= 1}
                    onClick={() => { setMasteryPage(masteryPage - 1); fetchMasteryWords(undefined, undefined, undefined, masteryPage - 1) }}
                    className="mastery-page-btn"
                  >
                    <ChevronLeftIcon className="icon" />
                  </button>
                  <span className="mastery-page-info">
                    Trang {masteryPagination.page} / {masteryPagination.totalPages}
                    <span className="mastery-page-total"> ({masteryPagination.totalItems} từ)</span>
                  </span>
                  <button
                    disabled={masteryPage >= masteryPagination.totalPages}
                    onClick={() => { setMasteryPage(masteryPage + 1); fetchMasteryWords(undefined, undefined, undefined, masteryPage + 1) }}
                    className="mastery-page-btn"
                  >
                    <ChevronRightIcon className="icon" />
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="proficiency-empty">
              <TrophyIcon className="icon" style={{ width: 48, height: 48, opacity: 0.3 }} />
              <p>Chưa có dữ liệu.</p>
              <p className="text-muted" style={{ fontSize: 13 }}>Tạo demo data hoặc bắt đầu học để xem độ thành thạo.</p>
            </div>
          )}
          </>
          ) : activeMenu === 'flashcards' ? (
          <>
          {/* ===== FLASH CARDS PAGE ===== */}
          {vocabularies.length > 0 ? (() => {
            const card = fcCards[fcIndex]
            if (!card) return null
            const frontText = fcFrontContent === 'term' ? card.word : card.meanings.join(', ')
            const backText = fcFrontContent === 'term' ? card.meanings.join(', ') : card.word
            const frontSub = fcPronunciation === 'front' ? card.pronunciation : ''
            const backSub = fcPronunciation === 'back' ? card.pronunciation : ''
            const flipHint = fcFrontContent === 'term' ? 'Nhấn để xem định nghĩa' : 'Nhấn để xem thuật ngữ'
            const backHint = fcFrontContent === 'term' ? 'Nhấn để xem thuật ngữ' : 'Nhấn để xem định nghĩa'
            const showImageOnFront = fcImageDisplay === 'term'
            const showImageOnBack = fcImageDisplay === 'definition'
            const isImageBlurred = fcImageDisplay === 'blurred'
            const isImageHidden = fcImageDisplay === 'hidden'
            const imgSizeClass = fcImageSize === 'large' ? 'fc-back-image fc-image-large' : 'fc-back-image'

            return (
              <div className="fc-page">
                {/* Card Area */}
                <div className="fc-card-area">
                  <div
                    className={`fc-card-container ${fcFlipped ? 'flipped' : ''}`}
                    onClick={() => setFcFlipped(f => !f)}
                  >
                    {/* Front */}
                    <div className="fc-card fc-card-front">
                      <button
                        className="fc-settings-btn"
                        onClick={(e) => { e.stopPropagation(); setFcShowSettings(s => !s) }}
                      >
                        <Cog6ToothIcon className="icon" />
                      </button>
                      {fcShowSettings && (
                        <div className="fc-settings-dropdown" onClick={e => e.stopPropagation()}>
                          <div className="fc-settings-group">
                            <span className="fc-settings-label">Mặt trước thẻ</span>
                            <label className="fc-settings-option">
                              <input type="radio" name="fcFront" checked={fcFrontContent === 'term'} onChange={() => setFcFrontContent('term')} />
                              Hiển thị thuật ngữ
                            </label>
                            <label className="fc-settings-option">
                              <input type="radio" name="fcFront" checked={fcFrontContent === 'definition'} onChange={() => setFcFrontContent('definition')} />
                              Hiển thị định nghĩa
                            </label>
                          </div>
                          <div className="fc-settings-divider" />
                          <div className="fc-settings-group">
                            <span className="fc-settings-label">Cách hiển thị ảnh</span>
                            <label className="fc-settings-option">
                              <input type="radio" name="fcImage" checked={fcImageDisplay === 'definition'} onChange={() => setFcImageDisplay('definition')} />
                              Hiển thị ảnh ở phần định nghĩa
                            </label>
                            <label className="fc-settings-option">
                              <input type="radio" name="fcImage" checked={fcImageDisplay === 'term'} onChange={() => setFcImageDisplay('term')} />
                              Hiển thị ảnh ở phần thuật ngữ
                            </label>
                            <label className="fc-settings-option">
                              <input type="checkbox" checked={fcImageDisplay === 'hidden'} onChange={() => setFcImageDisplay(fcImageDisplay === 'hidden' ? 'definition' : 'hidden')} />
                              Ẩn ảnh
                            </label>
                            <label className="fc-settings-option">
                              <input type="checkbox" checked={fcImageDisplay === 'blurred'} onChange={() => setFcImageDisplay(fcImageDisplay === 'blurred' ? 'definition' : 'blurred')} />
                              Che mờ ảnh
                            </label>
                          </div>
                          <div className="fc-settings-divider" />
                          <div className="fc-settings-group">
                            <span className="fc-settings-label">Kích thước ảnh</span>
                            <label className="fc-settings-option">
                              <input type="radio" name="fcImgSize" checked={fcImageSize === 'small'} onChange={() => setFcImageSize('small')} />
                              Nhỏ
                            </label>
                            <label className="fc-settings-option">
                              <input type="radio" name="fcImgSize" checked={fcImageSize === 'large'} onChange={() => setFcImageSize('large')} />
                              Lớn
                            </label>
                          </div>
                          <div className="fc-settings-divider" />
                          <div className="fc-settings-group">
                            <span className="fc-settings-label">Cách phát âm</span>
                            <label className="fc-settings-option">
                              <input type="radio" name="fcPron" checked={fcPronunciation === 'front'} onChange={() => setFcPronunciation('front')} />
                              Hiển thị mặt trước
                            </label>
                            <label className="fc-settings-option">
                              <input type="radio" name="fcPron" checked={fcPronunciation === 'back'} onChange={() => setFcPronunciation('back')} />
                              Hiển thị mặt sau
                            </label>
                          </div>
                        </div>
                      )}
                      <div className="fc-confetti">
                        <span className="fc-dot" style={{ background: '#F59E0B', width: 10, height: 10 }} />
                        <span className="fc-dot" style={{ background: '#EF4444', width: 7, height: 7 }} />
                        <span className="fc-dot" style={{ background: '#3B82F6', width: 8, height: 8 }} />
                        <span className="fc-dot" style={{ background: '#22C55E', width: 6, height: 6 }} />
                        <span className="fc-dot" style={{ background: '#A855F7', width: 9, height: 9 }} />
                        <span className="fc-dot" style={{ background: '#06B6D4', width: 5, height: 5 }} />
                        <span className="fc-dot" style={{ background: '#F97316', width: 7, height: 7 }} />
                      </div>
                      <div className="fc-card-content">
                        {showImageOnFront && card.imageUrl && !isImageHidden && (
                          <div className={`fc-image-wrapper ${isImageBlurred ? 'fc-image-blurred' : ''}`}>
                            <img src={card.imageUrl} alt="" className={imgSizeClass} />
                          </div>
                        )}
                        <span className="fc-main-text">{frontText}</span>
                        {frontSub && <span className="fc-sub-text">{frontSub}</span>}
                        <span className="fc-hint-text">{flipHint}</span>
                      </div>
                      <div className="fc-card-bottom">
                        <label className="fc-auto-toggle" onClick={e => e.stopPropagation()} title="Tự động phát âm khi chuyển thẻ">
                          <input type="checkbox" checked={fcAutoSpeak} onChange={() => setFcAutoSpeak(a => !a)} />
                          <span className="fc-toggle-track"><span className="fc-toggle-thumb" /></span>
                        </label>
                        <button className="fc-speak-btn" onClick={(e) => { e.stopPropagation(); speakWord(card.word) }} title="Phát âm">
                          <SpeakerWaveIcon className="icon" />
                        </button>
                      </div>
                    </div>

                    {/* Back */}
                    <div className="fc-card fc-card-back">
                      <button
                        className="fc-settings-btn"
                        onClick={(e) => { e.stopPropagation(); setFcShowSettings(s => !s) }}
                      >
                        <Cog6ToothIcon className="icon" />
                      </button>
                      <div className="fc-confetti">
                        <span className="fc-dot" style={{ background: '#3B82F6', width: 10, height: 10 }} />
                        <span className="fc-dot" style={{ background: '#22C55E', width: 8, height: 8 }} />
                        <span className="fc-dot" style={{ background: '#F59E0B', width: 6, height: 6 }} />
                        <span className="fc-dot" style={{ background: '#EF4444', width: 9, height: 9 }} />
                        <span className="fc-dot" style={{ background: '#A855F7', width: 7, height: 7 }} />
                      </div>
                      <div className="fc-card-content">
                        {showImageOnBack && card.imageUrl && !isImageHidden && (
                          <div className={`fc-image-wrapper ${isImageBlurred ? 'fc-image-blurred' : ''}`}>
                            <img src={card.imageUrl} alt="" className={imgSizeClass} />
                          </div>
                        )}
                        {isImageBlurred && card.imageUrl && !showImageOnFront && !showImageOnBack && (
                          <div className="fc-image-wrapper fc-image-blurred">
                            <img src={card.imageUrl} alt="" className={imgSizeClass} />
                          </div>
                        )}
                        <span className="fc-main-text">{backText}</span>
                        {backSub && <span className="fc-sub-text">{backSub}</span>}
                        <span className="fc-hint-text">{backHint}</span>
                      </div>
                      <div className="fc-card-bottom">
                        <label className="fc-auto-toggle" onClick={e => e.stopPropagation()} title="Tự động phát âm khi chuyển thẻ">
                          <input type="checkbox" checked={fcAutoSpeak} onChange={() => setFcAutoSpeak(a => !a)} />
                          <span className="fc-toggle-track"><span className="fc-toggle-thumb" /></span>
                        </label>
                        <button className="fc-speak-btn" onClick={(e) => { e.stopPropagation(); speakWord(card.word) }}>
                          <SpeakerWaveIcon className="icon" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Keyboard Hints */}
                <p className="fc-keyboard-hint">
                  {'Phím tắt: '}<kbd>{'←'}</kbd>{' '}<kbd>{'→'}</kbd>{' để chuyển thẻ · '}<kbd>Space</kbd>{' / '}<kbd>Enter</kbd>{' hoặc click để lật thẻ'}
                </p>

                {/* Navigation */}
                <div className="fc-nav">
                  <button
                    className={`fc-nav-btn ${fcShuffled ? 'fc-shuffle-active' : ''}`}
                    onClick={fcToggleShuffle}
                    title={fcShuffled ? 'Tắt trộn' : 'Trộn thẻ'}
                  >
                    <ArrowsRightLeftIcon className="icon" />
                  </button>
                  <div className="fc-nav-center">
                    <button className="fc-nav-arrow" onClick={fcPrev} disabled={fcIndex <= 0}>
                      <ChevronLeftIcon className="icon" />
                    </button>
                    <span className="fc-nav-counter">
                      {'Thẻ ' + (fcIndex + 1) + ' / ' + fcCards.length}
                    </span>
                    <button className="fc-nav-arrow" onClick={fcNext} disabled={fcIndex >= fcCards.length - 1}>
                      <ChevronRightIcon className="icon" />
                    </button>
                  </div>
                  <button className="fc-nav-btn" onClick={() => { setFcIndex(0); setFcFlipped(false) }} title="Về đầu">
                    <ArrowPathIcon className="icon" />
                  </button>
                </div>

                {/* Progress Bar */}
                <div className="fc-progress-bar">
                  <div className="fc-progress-fill" style={{ width: `${((fcIndex + 1) / fcCards.length) * 100}%` }} />
                </div>

                {/* Study Guide Link */}
                <div className="fc-study-guide-link">
                  <button className="fc-guide-btn" onClick={() => setFcShowStudyGuide(g => !g)}>
                    <InformationCircleIcon className="icon" />
                    {fcShowStudyGuide ? 'Ẩn hướng dẫn cách học' : 'Xem hướng dẫn cách học'}
                  </button>
                </div>

                {/* Study Guide Content */}
                {fcShowStudyGuide && (
                  <div className="fc-study-guide">
                    <div className="fc-guide-card">
                      <h3 className="fc-guide-title">📚 Hướng dẫn học Flash Cards hiệu quả</h3>
                      <div className="fc-guide-steps">
                        <div className="fc-guide-step">
                          <span className="fc-guide-num">1</span>
                          <div>
                            <strong>Nhìn mặt trước</strong>
                            <p>Đọc thuật ngữ/định nghĩa và cố gắng nhớ lại nghĩa trước khi lật thẻ.</p>
                          </div>
                        </div>
                        <div className="fc-guide-step">
                          <span className="fc-guide-num">2</span>
                          <div>
                            <strong>Lật thẻ kiểm tra</strong>
                            <p>Nhấn vào thẻ hoặc dùng phím Space/Enter để xem đáp án.</p>
                          </div>
                        </div>
                        <div className="fc-guide-step">
                          <span className="fc-guide-num">3</span>
                          <div>
                            <strong>Nghe phát âm</strong>
                            <p>Bật toggle tự động phát âm hoặc nhấn nút loa để luyện nghe.</p>
                          </div>
                        </div>
                        <div className="fc-guide-step">
                          <span className="fc-guide-num">4</span>
                          <div>
                            <strong>Trộn thẻ</strong>
                            <p>Dùng nút trộn để học ngẫu nhiên, tránh ghi nhớ theo thứ tự.</p>
                          </div>
                        </div>
                      </div>
                      <div className="fc-guide-tip">
                        💡 <strong>Mẹo:</strong> Học 10-15 thẻ mỗi lần, lặp lại 3-5 lần trong ngày để ghi nhớ tốt nhất.
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })() : (
            <div className="proficiency-empty">
              <RectangleStackIcon className="icon" style={{ width: 48, height: 48, opacity: 0.3 }} />
              <p>{'Chưa có từ vựng nào.'}</p>
              <p className="text-muted" style={{ fontSize: 13 }}>{'Thêm từ vựng ở trang Từ vựng để bắt đầu học với Thẻ ghi nhớ.'}</p>
            </div>
          )}
          </>
          ) : null}

          {activeMenu === 'quiz' ? (
            <QuizPage
              vocabularies={vocabularies}
              decks={decks}
              onExit={() => setActiveMenu('vocabulary')}
              onEditWord={openEditModal}
              speak={speak}
            />
          ) : null}
        </main>
      </div>

      {/* ===== IMPORT MODAL ===== */}
      {showImportModal && (
        <div className="modal-overlay" onClick={() => setShowImportModal(false)}>
          <div className="modal import-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2><ArrowDownTrayIcon className="icon icon-inline" /> Import từ vựng qua AI</h2>
              <button className="modal-close" onClick={() => setShowImportModal(false)}><XMarkIcon className="icon" /></button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Step 1: Prompt Template */}
              <div className="import-step">
                <div className="import-step-header">
                  <span className="import-step-number">1</span>
                  <span className="import-step-title">Copy câu lệnh mẫu gửi cho AI (ChatGPT / Claude / Gemini)</span>
                </div>
                <div className="import-prompt-box">
                  <pre className="import-prompt-text">{`Đóng vai là một chuyên gia tiếng Anh, hãy tạo cho tôi 10 từ vựng tiếng Anh chủ đề [CHỦ ĐỀ] trình độ [A1/A2/B1/B2/C1/C2] theo định dạng JSON array chuẩn như sau. Bạn chỉ trả về mảng JSON, không giải thích gì thêm:\n[\n  {\n    "word": "từ vựng",\n    "type": "word",\n    "pronunciation": "/phiên âm IPA/",\n    "meanings": ["nghĩa 1", "nghĩa 2"],\n    "partOfSpeech": "noun/verb/adjective/adverb",\n    "examples": [{ "en": "câu ví dụ tiếng Anh", "vi": "dịch nghĩa tiếng Việt" }],\n    "topic": "chủ đề",\n    "level": "A1",\n    "synonyms": ["từ đồng nghĩa"],\n    "antonyms": ["từ trái nghĩa"],\n    "note": "ghi chú hoặc mẹo nhớ"\n  }\n]`}</pre>
                  <button
                    className={`btn-copy-prompt ${importCopied ? 'copied' : ''}`}
                    onClick={() => {
                      navigator.clipboard.writeText(`Đóng vai là một chuyên gia tiếng Anh, hãy tạo cho tôi 10 từ vựng tiếng Anh chủ đề [CHỦ ĐỀ] trình độ [A1/A2/B1/B2/C1/C2] theo định dạng JSON array chuẩn như sau. Bạn chỉ trả về mảng JSON, không giải thích gì thêm:\n[\n  {\n    "word": "từ vựng",\n    "type": "word",\n    "pronunciation": "/phiên âm IPA/",\n    "meanings": ["nghĩa 1", "nghĩa 2"],\n    "partOfSpeech": "noun/verb/adjective/adverb",\n    "examples": [{ "en": "câu ví dụ tiếng Anh", "vi": "dịch nghĩa tiếng Việt" }],\n    "topic": "chủ đề",\n    "level": "A1",\n    "synonyms": ["từ đồng nghĩa"],\n    "antonyms": ["từ trái nghĩa"],\n    "note": "ghi chú hoặc mẹo nhớ"\n  }\n]`)
                      setImportCopied(true)
                      setTimeout(() => setImportCopied(false), 2500)
                    }}
                  >
                    {importCopied
                      ? <><CheckIcon className="icon icon-inline" /> Đã copy!</>
                      : <><ClipboardDocumentIcon className="icon icon-inline" /> Copy Prompt</>
                    }
                  </button>
                </div>
              </div>

              {/* Step 2: Paste JSON */}
              <div className="import-step">
                <div className="import-step-header">
                  <span className="import-step-number">2</span>
                  <span className="import-step-title">Dán (paste) dữ liệu JSON mà AI trả về vào đây</span>
                </div>
                <textarea
                  className="import-textarea"
                  placeholder={`[\n  {\n    "word": "example",\n    "meanings": ["ví dụ"],\n    ...\n  }\n]`}
                  value={importJsonText}
                  onChange={e => { setImportJsonText(e.target.value); setImportError(''); setImportResult(null) }}
                  rows={10}
                />
                {importError && (
                  <div className="import-error">
                    <ExclamationTriangleIcon className="icon icon-inline" /> {importError}
                  </div>
                )}
              </div>

              {/* Result */}
              {importResult && (
                <div className="import-result">
                  <div className="import-result-header">
                    <CheckIcon className="icon icon-inline" /> Kết quả Import
                  </div>
                  <div className="import-result-stats">
                    <div className="import-stat success">
                      <span className="import-stat-value">{importResult.inserted}</span>
                      <span className="import-stat-label">Đã thêm</span>
                    </div>
                    <div className="import-stat warning">
                      <span className="import-stat-value">{importResult.skipped}</span>
                      <span className="import-stat-label">Bỏ qua (trùng)</span>
                    </div>
                    <div className="import-stat error">
                      <span className="import-stat-value">{importResult.errors.length}</span>
                      <span className="import-stat-label">Lỗi</span>
                    </div>
                  </div>
                  {importResult.skippedWords.length > 0 && (
                    <div className="import-result-detail">
                      <span className="import-detail-label">Từ bị trùng:</span>
                      <span className="import-detail-words">{importResult.skippedWords.join(', ')}</span>
                    </div>
                  )}
                  {importResult.errors.length > 0 && (
                    <div className="import-result-detail errors">
                      <span className="import-detail-label">Chi tiết lỗi:</span>
                      {importResult.errors.map((err, i) => (
                        <span key={i} className="import-error-item">{err}</span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn-outline" onClick={() => setShowImportModal(false)}>Đóng</button>
              <button className="btn-primary" onClick={handleImport} disabled={isImporting || !importJsonText.trim()}>
                {isImporting ? <><span className="spinner-sm"></span> Đang import...</> : <><ArrowDownTrayIcon className="icon icon-inline" /> Import Dữ Liệu</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== ADD/EDIT MODAL ===== */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingId ? <><PencilSquareIcon className="icon icon-inline" /> Sửa từ vựng</> : <><PlusIcon className="icon icon-inline" /> Thêm từ vựng mới</>}</h2>
              <button className="modal-close" onClick={closeModal}><XMarkIcon className="icon" /></button>
            </div>

            <div className="modal-body">
              {formError && <div className="form-error">{formError}</div>}

              <div className="form-grid">
                <div className="form-group full">
                  <label>Từ / Cụm từ <span className="required">*</span></label>
                  <input
                    type="text"
                    value={formData.word}
                    onChange={e => setFormData(prev => ({ ...prev, word: e.target.value }))}
                    placeholder="e.g. accomplish, break the ice"
                  />
                </div>

                <div className="form-group">
                  <label>Loại</label>
                  <select
                    value={formData.type}
                    onChange={e => setFormData(prev => ({ ...prev, type: e.target.value as 'word' | 'phrase' }))}
                  >
                    <option value="word">Từ</option>
                    <option value="phrase">Cụm từ</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Cấp độ</label>
                  <select
                    value={formData.level}
                    onChange={e => setFormData(prev => ({ ...prev, level: e.target.value }))}
                  >
                    {['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map(l => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Phát âm</label>
                  <input
                    type="text"
                    value={formData.pronunciation}
                    onChange={e => setFormData(prev => ({ ...prev, pronunciation: e.target.value }))}
                    placeholder="e.g. /əˈkɒm.plɪʃ/"
                  />
                </div>

                <div className="form-group">
                  <label>Từ loại</label>
                  <select
                    value={formData.partOfSpeech}
                    onChange={e => setFormData(prev => ({ ...prev, partOfSpeech: e.target.value }))}
                  >
                    <option value="">Chọn...</option>
                    <option value="noun">Danh từ</option>
                    <option value="verb">Động từ</option>
                    <option value="adjective">Tính từ</option>
                    <option value="adverb">Trạng từ</option>
                    <option value="preposition">Giới từ</option>
                    <option value="phrasal verb">Cụm động từ</option>
                    <option value="idiom">Thành ngữ</option>
                    <option value="conjunction">Liên từ</option>
                  </select>
                </div>

                <div className="form-group full">
                  <label>Nghĩa (Tiếng Việt) <span className="required">*</span></label>
                  <input
                    type="text"
                    value={formData.meanings}
                    onChange={e => setFormData(prev => ({ ...prev, meanings: e.target.value }))}
                    placeholder="Cách nhau bằng dấu phẩy: hoàn thành, đạt được"
                  />
                </div>

                <div className="form-group">
                  <label>Chủ đề</label>
                  <input
                    type="text"
                    value={formData.topic}
                    onChange={e => setFormData(prev => ({ ...prev, topic: e.target.value }))}
                    placeholder="e.g. daily life, business"
                  />
                </div>

                <div className="form-group">
                  <label>Từ đồng nghĩa</label>
                  <input
                    type="text"
                    value={formData.synonyms}
                    onChange={e => setFormData(prev => ({ ...prev, synonyms: e.target.value }))}
                    placeholder="Cách nhau bằng dấu phẩy"
                  />
                </div>

                <div className="form-group">
                  <label>Từ trái nghĩa</label>
                  <input
                    type="text"
                    value={formData.antonyms}
                    onChange={e => setFormData(prev => ({ ...prev, antonyms: e.target.value }))}
                    placeholder="Cách nhau bằng dấu phẩy"
                  />
                </div>

                <div className="form-group full">
                  <label>Ghi chú</label>
                  <textarea
                    value={formData.note}
                    onChange={e => setFormData(prev => ({ ...prev, note: e.target.value }))}
                    placeholder="Mẹo, ngữ cảnh sử dụng..."
                    rows={2}
                  />
                </div>

                <div className="form-group full">
                  <label>Đường dẫn ảnh</label>
                  <input
                    type="text"
                    value={formData.imageUrl}
                    onChange={e => setFormData(prev => ({ ...prev, imageUrl: e.target.value }))}
                    placeholder="https://example.com/image.jpg"
                  />
                  {formData.imageUrl && (
                    <div className="image-preview">
                      <img src={formData.imageUrl} alt="Preview" onError={e => (e.currentTarget.style.display = 'none')} />
                    </div>
                  )}
                </div>

                {/* Deck Assignment */}
                {decks.length > 0 && (
                  <div className="form-group full">
                    <label><RectangleStackIcon className="icon icon-inline" /> Gán vào bộ thẻ</label>
                    <div className="deck-checkbox-list">
                      {decks.map(deck => (
                        <label key={deck._id} className="deck-checkbox-item">
                          <input
                            type="checkbox"
                            checked={formData.deckIds.includes(deck._id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData(prev => ({ ...prev, deckIds: [...prev.deckIds, deck._id] }))
                              } else {
                                setFormData(prev => ({ ...prev, deckIds: prev.deckIds.filter(id => id !== deck._id) }))
                              }
                            }}
                          />
                          <span className="deck-checkbox-color" style={{ backgroundColor: deck.color }} />
                          <span>{deck.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Examples */}
              <div className="form-examples">
                <div className="examples-header">
                  <label><LightBulbIcon className="icon icon-inline" /> Ví dụ</label>
                  <button className="btn-outline btn-sm" onClick={addExample}>+ Thêm ví dụ</button>
                </div>
                {formData.examples.map((ex, idx) => (
                  <div key={idx} className="example-row">
                    <div className="example-inputs">
                      <input
                        type="text"
                        value={ex.en}
                        onChange={e => updateExample(idx, 'en', e.target.value)}
                        placeholder="Câu tiếng Anh..."
                      />
                      <input
                        type="text"
                        value={ex.vi}
                        onChange={e => updateExample(idx, 'vi', e.target.value)}
                        placeholder="Bản dịch tiếng Việt..."
                      />
                    </div>
                    {formData.examples.length > 1 && (
                      <button className="btn-remove-ex" onClick={() => removeExample(idx)}><XMarkIcon className="icon" /></button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-outline" onClick={closeModal}>Hủy</button>
              <button className="btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Đang lưu...' : editingId ? 'Cập nhật' : 'Tạo'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== DELETE CONFIRMATION ===== */}
      {deleteTarget && (
        <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2><TrashIcon className="icon icon-inline" /> Xác nhận xóa</h2>
              <button className="modal-close" onClick={() => setDeleteTarget(null)}><XMarkIcon className="icon" /></button>
            </div>
            <div className="modal-body">
              <p className="delete-msg">
                Bạn có chắc muốn xóa{' '}
                <strong>{deleteTarget.word}</strong>?
                Hành động này không thể hoàn tác.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn-outline" onClick={() => setDeleteTarget(null)}>Hủy</button>
              <button
                className="btn-danger"
                onClick={deleteTarget.id === '__bulk__' ? handleDeleteSelected : handleDelete}
                disabled={deleting}
              >
                {deleting ? 'Đang xóa...' : 'Xóa'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== QUICK DECK EDIT MODAL ===== */}
      {quickDeckVocab && (
        <div className="modal-overlay" onClick={() => setQuickDeckVocab(null)}>
          <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2><RectangleStackIcon className="icon icon-inline" /> Chọn bộ thẻ cho từ</h2>
              <button className="modal-close" onClick={() => setQuickDeckVocab(null)}><XMarkIcon className="icon" /></button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: '16px' }}>
                Từ vựng: <strong>{quickDeckVocab.word}</strong>
              </p>
              {decks.length === 0 ? (
                <p className="text-muted">Chưa có bộ thẻ nào được tạo.</p>
              ) : (
                <div className="deck-checkbox-list">
                  {decks.map(deck => (
                    <label key={deck._id} className="deck-checkbox-item">
                      <input
                        type="checkbox"
                        checked={quickDeckIds.includes(deck._id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setQuickDeckIds(prev => [...prev, deck._id])
                          } else {
                            setQuickDeckIds(prev => prev.filter(id => id !== deck._id))
                          }
                        }}
                      />
                      <span className="deck-checkbox-color" style={{ backgroundColor: deck.color }} />
                      <span>{deck.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn-outline" onClick={() => setQuickDeckVocab(null)}>Hủy</button>
              <button className="btn-primary" onClick={handleSaveQuickDeck} disabled={savingQuickDeck}>
                {savingQuickDeck ? 'Đang lưu...' : 'Lưu'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== DETAIL POPUP ===== */}
      {detailVocab && (
        <div className="modal-overlay" onClick={() => setDetailVocab(null)}>
          <div className="modal modal-detail" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2><BookOpenIcon className="icon icon-inline" /> Chi tiết từ vựng</h2>
              <button className="modal-close" onClick={() => setDetailVocab(null)}><XMarkIcon className="icon" /></button>
            </div>

            <div className="modal-body">
              {/* Image */}
              {detailVocab.imageUrl && (
                <div className="detail-image">
                  <img
                    src={detailVocab.imageUrl}
                    alt={detailVocab.word}
                    onError={e => (e.currentTarget.style.display = 'none')}
                  />
                </div>
              )}

              {/* Word Header */}
              <div className="detail-word-header">
                <div className="detail-word-row">
                  <h3 className="detail-word">{detailVocab.word}</h3>
                  <button
                    className="speak-btn detail-speak"
                    onClick={() => speak(detailVocab.word)}
                    title="Nghe"
                  >
                    <SpeakerWaveIcon className="icon" />
                  </button>
                  <button
                    className={`copy-btn ${copied ? 'copied' : ''}`}
                    onClick={() => {
                      navigator.clipboard.writeText(detailVocab.word)
                      setCopied(true)
                      setTimeout(() => setCopied(false), 2000)
                    }}
                    title="Sao chép"
                  >
                    {copied ? <CheckIcon className="icon" /> : <ClipboardDocumentIcon className="icon" />}
                  </button>
                </div>
                {detailVocab.pronunciation && (
                  <span className="detail-pron">{detailVocab.pronunciation}</span>
                )}
                <div className="detail-badges">
                  <span className={`badge badge-type-${detailVocab.type}`}>{detailVocab.type}</span>
                  {detailVocab.partOfSpeech && <span className="badge badge-pos">{detailVocab.partOfSpeech}</span>}
                  <span className="badge badge-level" style={{ backgroundColor: getLevelColor(detailVocab.level) }}>{detailVocab.level}</span>
                  {detailVocab.topic && <span className="badge badge-topic">{detailVocab.topic}</span>}
                </div>
              </div>

              {/* Meanings */}
              <div className="detail-section">
                <h4><LanguageIcon className="icon icon-inline" /> Nghĩa</h4>
                <ul className="detail-meanings-list">
                  {detailVocab.meanings.map((m, i) => (
                    <li key={i}>{m}</li>
                  ))}
                </ul>
              </div>

              {/* Examples */}
              {detailVocab.examples.length > 0 && (
                <div className="detail-section">
                  <h4><LightBulbIcon className="icon icon-inline" /> Ví dụ</h4>
                  {detailVocab.examples.map((ex, i) => (
                    <div key={i} className="example-block">
                      <p className="ex-en"><span className="flag-label">EN</span> {ex.en}</p>
                      <p className="ex-vi"><span className="flag-label vi">VI</span> {ex.vi}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Synonyms & Antonyms */}
              {(detailVocab.synonyms.length > 0 || detailVocab.antonyms.length > 0) && (
                <div className="detail-tags-row">
                  {detailVocab.synonyms.length > 0 && (
                    <div className="detail-section">
                      <h4><ArrowsRightLeftIcon className="icon icon-inline" /> Từ đồng nghĩa</h4>
                      <div className="chip-list">
                        {detailVocab.synonyms.map((s, i) => (
                          <span key={i} className="chip chip-syn">{s}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {detailVocab.antonyms.length > 0 && (
                    <div className="detail-section">
                      <h4><ArrowPathIcon className="icon icon-inline" /> Từ trái nghĩa</h4>
                      <div className="chip-list">
                        {detailVocab.antonyms.map((a, i) => (
                          <span key={i} className="chip chip-ant">{a}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Note */}
              {detailVocab.note && (
                <div className="detail-section">
                  <h4><BookmarkIcon className="icon icon-inline" /> Ghi chú</h4>
                  <p className="note-box">{detailVocab.note}</p>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn-outline" onClick={() => {
                openEditModal(detailVocab)
                setDetailVocab(null)
              }}>
                <PencilSquareIcon className="icon icon-inline" /> Sửa
              </button>
              <button className="btn-danger" onClick={() => {
                setDeleteTarget({ id: detailVocab._id, word: detailVocab.word })
                setDetailVocab(null)
              }}>
                <TrashIcon className="icon icon-inline" /> Xóa
              </button>
              <button className="btn-primary" onClick={() => setDetailVocab(null)}>Đóng</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== DECK CRUD MODAL ===== */}
      {showDeckModal && (
        <div className="modal-overlay" onClick={closeDeckModal}>
          <div className="modal modal-deck" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingDeck ? <><PencilSquareIcon className="icon icon-inline" /> Sửa bộ thẻ</> : <><PlusIcon className="icon icon-inline" /> Tạo bộ thẻ mới</>}</h2>
              <button className="modal-close" onClick={closeDeckModal}><XMarkIcon className="icon" /></button>
            </div>

            {deckFormError && (
              <div className="form-error">
                <ExclamationTriangleIcon className="icon icon-inline" /> {deckFormError}
              </div>
            )}

            <div className="modal-body">
              <div className="form-group full">
                <label>Tên bộ thẻ <span className="required">*</span></label>
                <input
                  type="text"
                  value={deckForm.name}
                  onChange={e => setDeckForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. IELTS Vocabulary, Business English"
                />
              </div>

              <div className="form-group full">
                <label>Mô tả</label>
                <textarea
                  value={deckForm.description}
                  onChange={e => setDeckForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Bộ thẻ này về chủ đề gì?"
                  rows={2}
                />
              </div>

              <div className="form-group full">
                <label><SwatchIcon className="icon icon-inline" /> Màu sắc</label>
                <div className="color-picker-row">
                  {['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'].map(c => (
                    <button
                      key={c}
                      className={`color-swatch ${deckForm.color === c ? 'active' : ''}`}
                      style={{ backgroundColor: c }}
                      onClick={() => setDeckForm(prev => ({ ...prev, color: c }))}
                      type="button"
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-outline" onClick={closeDeckModal}>Hủy</button>
              <button className="btn-primary" onClick={handleSaveDeck} disabled={savingDeck}>
                {savingDeck ? 'Đang lưu...' : editingDeck ? 'Cập nhật' : 'Tạo bộ thẻ'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== DECK DELETE CONFIRM ===== */}
      {deleteDeckTarget && (
        <div className="modal-overlay" onClick={() => setDeleteDeckTarget(null)}>
          <div className="modal modal-confirm" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2><ExclamationTriangleIcon className="icon icon-inline" /> Xóa bộ thẻ</h2>
              <button className="modal-close" onClick={() => setDeleteDeckTarget(null)}><XMarkIcon className="icon" /></button>
            </div>
            <div className="modal-body">
              <p>
                Bạn có chắc muốn xóa bộ thẻ <strong>"{deleteDeckTarget.name}"</strong>?
              </p>
              <p className="text-muted" style={{ fontSize: '13px', marginTop: '4px' }}>
                Các từ vựng trong bộ thẻ sẽ không bị xóa, chỉ nhóm bộ thẻ bị gỡ bỏ.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn-outline" onClick={() => setDeleteDeckTarget(null)}>Hủy</button>
              <button className="btn-danger" onClick={handleDeleteDeck} disabled={deleting}>
                {deleting ? 'Đang xóa...' : 'Xóa bộ thẻ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}
// Quiz module refactored to QuizPage.tsx
