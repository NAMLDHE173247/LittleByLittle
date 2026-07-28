"use client";

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/AuthContext';
import type { DeckItem, VocabularyItem, FormData, ProgressData } from '@/types';

export const emptyForm: FormData = {
  word: '',
  type: 'word',
  pronunciation: '',
  meanings: '',
  partOfSpeech: '',
  examples: [{ en: '', vi: '' }],
  topic: '',
  level: '',
  synonyms: '',
  antonyms: '',
  note: '',
  imageUrl: '',
  deckIds: [],
};


// Constants
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';
const API_URL = `${BASE_URL}/api/vocabulary`;
const PROGRESS_API_URL = `${BASE_URL}/api/progress`;
const DECK_API_URL = `${BASE_URL}/api/decks`;

export const GlobalDataContext = createContext<any>(null);

export const useGlobalData = () => {
  const context = useContext(GlobalDataContext);
  if (!context) {
    throw new Error('useGlobalData must be used within GlobalDataProvider');
  }
  return context;
};

export const GlobalDataProvider = ({ children }: { children: React.ReactNode }) => {
  const { authHeaders } = useAuth();
  
  // Theme and Layout State
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark';
    }
    return false;
  });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<string[]>(['single_practice']);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterLevel, setFilterLevel] = useState('');
  const [filterTopic, setFilterTopic] = useState('');
  const [filterPartOfSpeech, setFilterPartOfSpeech] = useState('');
  const [filterDeck, setFilterDeck] = useState('');

  // Pagination & Sorting
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [sortField, setSortField] = useState<string>('word');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  
  // Data State
  const [vocabularies, setVocabularies] = useState<VocabularyItem[]>([]);
  const [decks, setDecks] = useState<DeckItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [totalFiltered, setTotalFiltered] = useState(0);
  const [totalPagesState, setTotalPagesState] = useState(1);
  const [metadata, setMetadata] = useState<{
    total: number;
    totalWords: number;
    totalPhrases: number;
    uniqueTopics: string[];
    uniqueLevels: string[];
    uniquePartsOfSpeech: string[];
  }>({
    total: 0, totalWords: 0, totalPhrases: 0,
    uniqueTopics: [], uniqueLevels: [], uniquePartsOfSpeech: [],
  });

  // Modals & Forms State
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({ ...emptyForm });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  
  const [detailVocab, setDetailVocab] = useState<VocabularyItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; word: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  
  // Import
  const [showImportModal, setShowImportModal] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');
  const [importError, setImportError] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<any | null>(null);
  const [importCopied, setImportCopied] = useState(false);
  
  const [copied, setCopied] = useState(false);
  
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const vocabularyAbortRef = useRef<AbortController | null>(null);
  const vocabularyRequestIdRef = useRef(0);

  const [quickDeckVocab, setQuickDeckVocab] = useState<VocabularyItem | null>(null);
  const [quickDeckIds, setQuickDeckIds] = useState<string[]>([]);
  const [savingQuickDeck, setSavingQuickDeck] = useState(false);

  // Statistics
  const [progressData, setProgressData] = useState<ProgressData | null>(null);
  const [progressLoading, setProgressLoading] = useState(false);
  const [seedingDemo, setSeedingDemo] = useState(false);

  // Mastery
  const [showScoringOverview, setShowScoringOverview] = useState(false);
  const [masteryWords, setMasteryWords] = useState<any[]>([]);
  const [masteryLoading, setMasteryLoading] = useState(false);
  const [masteryTierFilter, setMasteryTierFilter] = useState('all');
  const [masterySearch, setMasterySearch] = useState('');
  const [masterySort, setMasterySort] = useState('overall_desc');
  const [masterySkillFilter, setMasterySkillFilter] = useState('all');
  const [masteryPage, setMasteryPage] = useState(1);
  const [masteryPagination, setMasteryPagination] = useState({ page: 1, totalPages: 1, totalItems: 0, limit: 15 });
  const [masteryTierSummary, setMasteryTierSummary] = useState({ mastered: 0, familiar: 0, learning: 0, not_started: 0, total: 0 });
  const [clearingProgress, setClearingProgress] = useState(false);

  // Loaders
  const fetchMetadata = async () => {
    try {
      const res = await fetch(`${API_URL}/metadata`, { headers: authHeaders() });
      const json = await res.json();
      if (json.success) setMetadata(json.data);
    } catch {}
  };

  const fetchDecks = async () => {
    try {
      const res = await fetch(DECK_API_URL, { headers: authHeaders() });
      const json = await res.json();
      if (json.success) setDecks(json.data);
    } catch {}
  };

  const fetchProgress = async () => {
    setProgressLoading(true);
    try {
      const res = await fetch(`${PROGRESS_API_URL}/stats`, { headers: authHeaders() });
      const json = await res.json();
      if (json.success) setProgressData(json.data);
    } catch {} finally { setProgressLoading(false); }
  };

  const fetchMasteryWords = async (tierOverride?: string, searchOverride?: string, sortOverride?: string, pageOverride?: number, skillOverride?: string) => {
    setMasteryLoading(true);
    try {
      const t = tierOverride ?? masteryTierFilter;
      const s = searchOverride ?? masterySearch;
      const so = sortOverride ?? masterySort;
      const p = pageOverride ?? masteryPage;
      const sk = skillOverride ?? masterySkillFilter;
      const params = new URLSearchParams({ tier: t, search: s, sort: so, page: String(p), limit: '15', skill: sk });
      const res = await fetch(`${PROGRESS_API_URL}/words?${params}`, { headers: authHeaders() });
      const json = await res.json();
      if (json.success) {
        setMasteryWords(json.data.words);
        setMasteryPagination(json.data.pagination);
        setMasteryTierSummary(json.data.tierSummary);
      }
    } catch {} finally { setMasteryLoading(false); }
  };

  const fetchVocabularies = async () => {
    if (searchQuery.trim() !== debouncedSearchQuery) return;

    const requestId = vocabularyRequestIdRef.current + 1;
    vocabularyRequestIdRef.current = requestId;
    vocabularyAbortRef.current?.abort();
    const controller = new AbortController();
    vocabularyAbortRef.current = controller;

    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(currentPage), limit: String(itemsPerPage), search: debouncedSearchQuery,
        type: filterCategory, level: filterLevel, topic: filterTopic, pos: filterPartOfSpeech,
        deck: filterDeck, sortBy: sortField, sortDir: sortDir
      });
      const res = await fetch(`${API_URL}?${params}`, { headers: authHeaders(), signal: controller.signal });
      const json = await res.json();
      if (requestId !== vocabularyRequestIdRef.current) return;

      if (json.success) {
        const nextTotalPages = json.pagination?.totalPages || 1;
        if (currentPage > nextTotalPages && nextTotalPages > 0) {
          setCurrentPage(nextTotalPages);
          return;
        }
        setVocabularies(json.data);
        setTotalPagesState(nextTotalPages);
        setTotalFiltered(json.pagination?.total || 0);
        setError('');
      } else {
        setError('Failed to fetch data');
      }
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      if (requestId !== vocabularyRequestIdRef.current) return;
      setError('Cannot connect to server');
    } finally {
      if (requestId === vocabularyRequestIdRef.current) {
        setLoading(false);
      }
    }
  };

  // Actions
  const toggleMenu = (key: string) => {
    setExpandedMenus(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const openAddModal = () => {
    setEditingId(null);
    setFormData({ ...emptyForm });
    setFormError('');
    setShowModal(true);
  };

  const openEditModal = (vocab: VocabularyItem) => {
    setEditingId(vocab._id);
    setFormData({
      word: vocab.word, type: vocab.type, pronunciation: vocab.pronunciation,
      meanings: vocab.meanings?.join(', ') || '', partOfSpeech: vocab.partOfSpeech,
      examples: vocab.examples?.length > 0 ? vocab.examples : [{ en: '', vi: '' }],
      topic: vocab.topic, level: vocab.level, synonyms: vocab.synonyms?.join(', ') || '',
      antonyms: vocab.antonyms?.join(', ') || '', note: vocab.note, imageUrl: vocab.imageUrl || '',
      deckIds: vocab.deckIds ? vocab.deckIds.map((d: any) => typeof d === 'string' ? d : d?._id).filter(Boolean) : [],
    });
    setFormError('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setFormData({ ...emptyForm });
    setFormError('');
  };

  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const speakTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const watchdogTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const requestIdRef = useRef<number>(0);
  const lastSpeakEndRef = useRef<number>(Date.now());
  const lastCancelTimeRef = useRef<number>(0);

  const SPEECH_DEBUG = process.env.NODE_ENV === 'development';

  const [ttsAccent, setTtsAccent] = useState<'en-US' | 'en-GB'>('en-US');
  const [ttsSettingsReady, setTtsSettingsReady] = useState(false);
  const [activeVoiceName, setActiveVoiceName] = useState<string>('');

  const loadVoices = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      voicesRef.current = window.speechSynthesis.getVoices();
    }
  }, []);

  // Hydrate TTS settings & set up voiceschanged listener
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('trainEnglish.ttsSettings.v1');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.accent === 'en-US' || parsed.accent === 'en-GB') {
            setTtsAccent(parsed.accent);
          }
        }
      } catch (e) {
        console.warn('Failed to parse TTS settings from localStorage, falling back to en-US');
      } finally {
        setTtsSettingsReady(true);
      }

      if ('speechSynthesis' in window) {
        loadVoices();
        window.speechSynthesis.onvoiceschanged = loadVoices;
      }
    }
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, [loadVoices]);

  const updateTtsAccent = useCallback((accent: 'en-US' | 'en-GB') => {
    if (accent !== 'en-US' && accent !== 'en-GB') return;
    setTtsAccent(accent);
    try {
      localStorage.setItem('trainEnglish.ttsSettings.v1', JSON.stringify({ accent }));
    } catch (e) {
      console.error('Failed to save TTS settings', e);
    }
  }, []);

  const cancelSpeech = useCallback((reason = 'manual-cancel') => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      requestIdRef.current += 1;
      lastCancelTimeRef.current = Date.now();
      if (SPEECH_DEBUG) console.log(`[TTS] Cancel Req ${requestIdRef.current - 1} | reason=${reason} | replacedBy=Req ${requestIdRef.current}`);
      if (speakTimeoutRef.current) clearTimeout(speakTimeoutRef.current);
      if (watchdogTimeoutRef.current) clearTimeout(watchdogTimeoutRef.current);
      window.speechSynthesis.cancel();
      currentUtteranceRef.current = null;
    }
  }, []);

  const stopSpeaking = cancelSpeech;

  const speak = useCallback((text: string, options?: { isRetry?: boolean, mode?: string, source?: string, ownerId?: string, requestKey?: string, cancelReason?: string }) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    
    const cleanText = text.trim();
    if (!cleanText) return;

    const isRetry = options?.isRetry || false;
    const mode = options?.mode || 'unknown';
    const source = options?.source || 'unknown';
    const ownerId = options?.ownerId || 'unknown';

    const requestTime = Date.now();
    const idleForMs = requestTime - lastSpeakEndRef.current;
    const cancelAgoMs = lastCancelTimeRef.current > 0 ? requestTime - lastCancelTimeRef.current : -1;

    let didCancel = false;

    if (!isRetry) {
      requestIdRef.current += 1;
      if (SPEECH_DEBUG) {
        console.log(`[TTS] Req ${requestIdRef.current} | source=${source} | mode=${mode} | owner=${ownerId} | idleForMs=${idleForMs} | cancelAgoMs=${cancelAgoMs} | text="${cleanText}"`);
      }
      if (speakTimeoutRef.current) clearTimeout(speakTimeoutRef.current);
      if (watchdogTimeoutRef.current) clearTimeout(watchdogTimeoutRef.current);
      
      if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
        window.speechSynthesis.cancel();
        didCancel = true;
      }
    } else {
      if (SPEECH_DEBUG) console.log(`[TTS] Req ${requestIdRef.current} | Retrying speech for text: "${cleanText}"`);
    }

    if (window.speechSynthesis.paused) {
      if (SPEECH_DEBUG) console.log(`[TTS] Req ${requestIdRef.current} | Resuming paused synthesis`);
      window.speechSynthesis.resume();
    }

    const currentReqId = requestIdRef.current;
    const delayMs = didCancel ? 100 : 0;

    speakTimeoutRef.current = setTimeout(() => {
      if (currentReqId !== requestIdRef.current) {
        if (SPEECH_DEBUG) console.log(`[TTS] Req ${currentReqId} | Ignored (replaced by a newer request)`);
        return;
      }

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = ttsAccent;
      utterance.rate = 0.9;
      utterance.pitch = 1;

      const voices = voicesRef.current.length > 0 ? voicesRef.current : window.speechSynthesis.getVoices();
      
      // Lọc voice đúng accent
      let matchedVoice = voices.find(v => v.lang === ttsAccent && (v.name.includes('Google') || v.localService));
      if (!matchedVoice) {
        matchedVoice = voices.find(v => v.lang === ttsAccent);
      }
      // Fallback 1: Bất kỳ voice tiếng Anh nào nếu không tìm thấy accent
      if (!matchedVoice) {
        matchedVoice = voices.find(v => v.lang.startsWith('en'));
      }
      
      if (matchedVoice) {
        utterance.voice = matchedVoice;
        setActiveVoiceName(matchedVoice.name);
      } else {
        setActiveVoiceName('');
      }

      if (SPEECH_DEBUG) {
        const v = utterance.voice;
        console.log(`[TTS] Req ${currentReqId} | Assigned voice: ${v?.name || 'none'} (${v?.lang || utterance.lang}) | localService=${v?.localService} | default=${v?.default} | voiceURI=${v?.voiceURI}`);
        console.log(`[TTS] Req ${currentReqId} | Calling window.speechSynthesis.speak()`);
      }

      let hasStarted = false;

      utterance.onstart = () => {
        const startLatencyMs = Date.now() - requestTime;
        if (SPEECH_DEBUG) console.log(`[TTS] Req ${currentReqId} | onstart event | startLatencyMs=${startLatencyMs}`);
        hasStarted = true;
        if (watchdogTimeoutRef.current) clearTimeout(watchdogTimeoutRef.current);
      };

      utterance.onend = () => {
        if (SPEECH_DEBUG) console.log(`[TTS] Req ${currentReqId} | onend event`);
        lastSpeakEndRef.current = Date.now();
        if (watchdogTimeoutRef.current) clearTimeout(watchdogTimeoutRef.current);
        if (currentUtteranceRef.current === utterance) {
          currentUtteranceRef.current = null;
        }
      };

      utterance.onerror = (e) => {
        if (SPEECH_DEBUG) console.log(`[TTS] Req ${currentReqId} | onerror event: ${e.error}`);
        if (watchdogTimeoutRef.current) clearTimeout(watchdogTimeoutRef.current);
        if (currentReqId !== requestIdRef.current) return; 
        if (e.error === 'interrupted' || e.error === 'canceled') return; 
        
        console.warn('SpeechSynthesis error:', e.error);
        if (!hasStarted && !isRetry) {
          if (SPEECH_DEBUG) console.log(`[TTS] Req ${currentReqId} | Triggering retry from onerror`);
          cancelSpeech('retry-from-error');
          speak(cleanText, { ...options, isRetry: true }); 
        }
      };

      currentUtteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);

      if (watchdogTimeoutRef.current) clearTimeout(watchdogTimeoutRef.current);
      watchdogTimeoutRef.current = setTimeout(() => {
        if (currentReqId !== requestIdRef.current) return;
        if (!hasStarted && !isRetry) {
          if (SPEECH_DEBUG) console.warn(`[TTS] Req ${currentReqId} | Watchdog triggered (timeout), retrying...`);
          cancelSpeech('watchdog-timeout');
          speak(cleanText, { ...options, isRetry: true });
        }
      }, 1500);

    }, delayMs);

  }, [cancelSpeech, ttsAccent]);

  const getLevelColor = (level: string) => {
    const colors: Record<string, string> = {
      A1: '#22c55e', A2: '#06b6d4', B1: '#3b82f6', B2: '#8b5cf6', C1: '#ec4899', C2: '#ef4444',
    };
    return colors[level] || '#94a3b8';
  };

  // Effects
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme', darkMode ? 'dark' : 'light');
      if (darkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, [darkMode]);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      loadVoices();
      window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
      return () => {
        window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
        cancelSpeech();
      };
    }
  }, [loadVoices, cancelSpeech]);

  useEffect(() => {
    fetchMetadata();
    fetchDecks();
    fetchProgress();
    fetchMasteryWords();
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearchQuery(searchQuery.trim());
    }, 400);
    return () => window.clearTimeout(timeoutId);
  }, [searchQuery]);

  useEffect(() => {
    fetchVocabularies();
  }, [currentPage, debouncedSearchQuery, filterCategory, filterLevel, filterTopic, filterPartOfSpeech, filterDeck, sortField, sortDir]);

  // Modals Save Action
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.word || !formData.meanings) {
      setFormError('Vui lòng điền các trường bắt buộc');
      return;
    }
    setSaving(true);
    setFormError('');

    const payload = {
      ...formData,
      meanings: formData.meanings.split(',').map(m => m.trim()).filter(Boolean),
      synonyms: formData.synonyms.split(',').map(s => s.trim()).filter(Boolean),
      antonyms: formData.antonyms.split(',').map(a => a.trim()).filter(Boolean),
      examples: formData.examples.filter(ex => ex.en.trim() || ex.vi.trim()),
    };

    try {
      const method = editingId ? 'PUT' : 'POST';
      const url = editingId ? `${API_URL}/${editingId}` : API_URL;
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders()
        },
        body: JSON.stringify(payload)
      });

      const json = await res.json();
      if (json.success) {
        closeModal();
        fetchVocabularies();
        fetchMetadata();
      } else {
        setFormError(json.message || 'Lỗi lưu từ vựng');
      }
    } catch (err) {
      setFormError('Lỗi kết nối máy chủ');
    } finally {
      setSaving(false);
    }
  };

  const value = {
    darkMode, setDarkMode,
    sidebarCollapsed, setSidebarCollapsed,
    expandedMenus, setExpandedMenus, toggleMenu,
    vocabularies, setVocabularies, loading, error,
    metadata, setMetadata,
    decks, setDecks,
    searchQuery, setSearchQuery, filterCategory, setFilterCategory,
    filterLevel, setFilterLevel, filterTopic, setFilterTopic,
    filterPartOfSpeech, setFilterPartOfSpeech, filterDeck, setFilterDeck,
    currentPage, setCurrentPage, totalPagesState, totalFiltered,
    sortField, setSortField, sortDir, setSortDir,
    showModal, setShowModal, editingId, setEditingId,
    formData, setFormData, formError, setFormError, saving, setSaving,
    detailVocab, setDetailVocab,
    deleteTarget, setDeleteTarget, deleting, setDeleting,
    showImportModal, setShowImportModal, importJsonText, setImportJsonText,
    importError, setImportError, isImporting, setIsImporting,
    importResult, setImportResult, importCopied, setImportCopied,
    copied, setCopied,
    selectedRows, setSelectedRows, isSelectionMode, setIsSelectionMode,
    quickDeckVocab, setQuickDeckVocab, quickDeckIds, setQuickDeckIds,
    savingQuickDeck, setSavingQuickDeck,
    progressData, setProgressData, progressLoading, setProgressLoading,
    seedingDemo, setSeedingDemo,
    showScoringOverview, setShowScoringOverview,
    masteryWords, setMasteryWords, masteryLoading, setMasteryLoading,
    masteryTierFilter, setMasteryTierFilter, masterySearch, setMasterySearch,
    masterySort, setMasterySort, masterySkillFilter, setMasterySkillFilter,
    masteryPage, setMasteryPage, masteryPagination, setMasteryPagination,
    masteryTierSummary, setMasteryTierSummary, clearingProgress, setClearingProgress,
    
    // Actions
    fetchMetadata, fetchDecks, fetchProgress, fetchMasteryWords, fetchVocabularies,
    openAddModal, openEditModal, closeModal, cancelSpeech, stopSpeaking, speak, updateTtsAccent, ttsAccent, ttsSettingsReady, activeVoiceName, getLevelColor, handleSave
  };

  return (
    <GlobalDataContext.Provider value={value}>
      {children}
    </GlobalDataContext.Provider>
  );
};
