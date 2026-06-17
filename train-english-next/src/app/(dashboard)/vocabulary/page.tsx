"use client";
import React from 'react';
import { useGlobalData } from '@/components/providers/GlobalDataProvider';
import { useAuth } from '@/AuthContext';
import VocabularyPage from '@/components/features/Vocabulary/VocabularyPage';

export default function VocabularyRoute() {
  const {
    vocabularies, loading, error, metadata, decks, totalFiltered,
    searchQuery, setSearchQuery, filterCategory, setFilterCategory,
    filterLevel, setFilterLevel, filterTopic, setFilterTopic,
    filterPartOfSpeech, setFilterPartOfSpeech, filterDeck, setFilterDeck,
    currentPage, setCurrentPage, totalPagesState,
    sortField, sortDir, setSortField, setSortDir,
    selectedRows, isSelectionMode, setIsSelectionMode, setSelectedRows,
    openAddModal, openEditModal, setDetailVocab, setDeleteTarget,
    setShowImportModal, setImportResult, setImportError, setImportJsonText,
    setQuickDeckVocab, setQuickDeckIds, speak, getLevelColor
  } = useGlobalData();
  const { authHeaders } = useAuth();

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const getSortIcon = (field: string) => {
    if (sortField !== field) return '↕ ';
    return sortDir === 'asc' ? '↑ ' : '↓ ';
  };

  const toggleSelectAll = () => {
    if (selectedRows.length === vocabularies.length && vocabularies.length > 0) {
      setSelectedRows([]);
    } else {
      setSelectedRows(vocabularies.map((v: any) => v._id));
    }
  };

  const toggleSelectRow = (id: string) => {
    setSelectedRows((prev: string[]) =>
      prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
    );
  };

  return (
    <VocabularyPage
      data={{ vocabularies, loading, error, metadata, decks, totalFiltered }}
      filters={{ searchQuery, setSearchQuery, filterCategory, setFilterCategory, filterLevel, setFilterLevel, filterTopic, setFilterTopic, filterPartOfSpeech, setFilterPartOfSpeech, filterDeck, setFilterDeck }}
      pagination={{ currentPage, setCurrentPage, totalPagesState }}
      sorting={{ sortField, sortDir, handleSort, getSortIcon }}
      selection={{ selectedRows, isSelectionMode, setIsSelectionMode, toggleSelectAll, toggleSelectRow, setSelectedRows }}
      actions={{ openAddModal, openEditModal, setDetailVocab, setDeleteTarget, setShowImportModal, setImportResult, setImportError, setImportJsonText, setQuickDeckVocab, setQuickDeckIds, speak, getLevelColor, authHeaders }}
    />
  );
}
