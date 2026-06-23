"use client";

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/AuthContext';
import { GlobalDataProvider, useGlobalData } from '@/components/providers/GlobalDataProvider';
import Sidebar from '@/components/Sidebar/Sidebar';
import VocabularyModals from '@/components/features/Vocabulary/VocabularyModals';

// A wrapper to consume global data and render the layout
function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, logout, authHeaders } = useAuth();
  const globalData = useGlobalData();
  const {
    darkMode, setDarkMode, sidebarCollapsed, setSidebarCollapsed,
    expandedMenus, toggleMenu,
    showImportModal, importJsonText, importError, isImporting, importResult, importCopied,
    showModal, editingId, formError, formData, saving,
    deleteTarget, deleting, quickDeckVocab, quickDeckIds, savingQuickDeck,
    detailVocab, copied, decks,
    setShowImportModal, setImportJsonText, setImportError, setImportResult, setImportCopied,
    closeModal, setFormData, handleSave, addExample, updateExample, removeExample,
    setDeleteTarget, setQuickDeckVocab, setQuickDeckIds,
    setDetailVocab, speak, setCopied, getLevelColor, openEditModal
  } = globalData;

  const pathname = usePathname();
  // Map pathname to activeMenu for the Sidebar
  const activeMenu = pathname.replace('/', '') || 'vocabulary';
  
  // Dummy handlers for modals since we can't easily map everything from old code without them
  const handleImport = async () => {
    try {
      globalData.setIsImporting(true);
      globalData.setImportError('');
      globalData.setImportResult(null);

      const parsed = JSON.parse(importJsonText);
      if (!Array.isArray(parsed)) {
        throw new Error("Dữ liệu JSON phải là một mảng các từ vựng.");
      }

      const res = await fetch('/api/vocabulary/bulk', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...authHeaders()
        },
        body: JSON.stringify(parsed)
      });
      const result = await res.json();

      if (result.success) {
        globalData.setImportResult(result.data);
        globalData.fetchVocabularies();
        globalData.fetchMetadata();
      } else {
        globalData.setImportError(result.message || 'Import thất bại');
      }
    } catch (e: any) {
      globalData.setImportError(e.message || 'JSON không hợp lệ hoặc lỗi kết nối');
    } finally {
      globalData.setIsImporting(false);
    }
  };
  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      globalData.setDeleting(true);
      const res = await fetch(`/api/vocabulary/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: authHeaders()
      });
      const result = await res.json();
      if (result.success) {
        globalData.setDeleteTarget(null);
        globalData.fetchVocabularies();
        globalData.fetchMetadata();
      } else {
        alert(result.message || 'Xóa thất bại');
      }
    } catch (e) {
      alert('Lỗi kết nối');
    } finally {
      globalData.setDeleting(false);
    }
  };

  const handleDeleteSelected = async () => {
    if (!globalData.selectedRows || globalData.selectedRows.length === 0) return;
    if (!confirm(`Bạn có chắc chắn muốn xóa ${globalData.selectedRows.length} từ vựng đã chọn?`)) return;
    try {
      globalData.setDeleting(true);
      const res = await fetch('/api/vocabulary', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders()
        },
        body: JSON.stringify({ ids: globalData.selectedRows })
      });
      const result = await res.json();
      if (result.success) {
        globalData.setSelectedRows([]);
        globalData.setIsSelectionMode(false);
        globalData.fetchVocabularies();
        globalData.fetchMetadata();
      } else {
        alert(result.message || 'Xóa thất bại');
      }
    } catch (e) {
      alert('Lỗi kết nối');
    } finally {
      globalData.setDeleting(false);
    }
  };

  const handleClearAll = async () => {
    try {
      globalData.setDeleting(true);
      const res = await fetch('/api/vocabulary/clear-all', {
        method: 'DELETE',
        headers: authHeaders()
      });
      const result = await res.json();
      if (result.success) {
        globalData.setDeleteTarget(null);
        globalData.setSelectedRows([]);
        globalData.setIsSelectionMode(false);
        globalData.setCurrentPage(1);
        globalData.fetchVocabularies();
        globalData.fetchMetadata();
      } else {
        alert(result.message || 'Xóa toàn bộ thất bại');
      }
    } catch (e) {
      alert('Lỗi kết nối');
    } finally {
      globalData.setDeleting(false);
    }
  };

  const handleSaveQuickDeck = async () => {
    if (!globalData.quickDeckVocab) return;
    try {
      globalData.setSavingQuickDeck(true);
      const res = await fetch(`/api/vocabulary/${globalData.quickDeckVocab._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders()
        },
        body: JSON.stringify({ deckIds: globalData.quickDeckIds })
      });
      const result = await res.json();
      if (result.success) {
        globalData.setQuickDeckVocab(null);
        globalData.fetchVocabularies();
        globalData.fetchMetadata();
      } else {
        alert(result.message || 'Cập nhật bộ thẻ thất bại');
      }
    } catch (e) {
      alert('Lỗi kết nối');
    } finally {
      globalData.setSavingQuickDeck(false);
    }
  };

  return (
    <div className={`dashboard ${darkMode ? 'dark' : 'light'}`}>
      <Sidebar
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        sidebarCollapsed={sidebarCollapsed}
        setSidebarCollapsed={setSidebarCollapsed}
        activeMenu={activeMenu}
        setActiveMenu={(m) => {}} // Not needed anymore, Next.js Link handles it
        expandedMenus={expandedMenus}
        toggleMenu={toggleMenu}
        user={user}
        isAdmin={isAdmin}
        logout={logout}
      />
      <div className="main-area">
        <main className="content">
          {children}
        </main>
      </div>
      
      <VocabularyModals
        modalsState={{
          showImportModal, importJsonText, importError, isImporting, importResult, importCopied,
          showModal, editingId, formError, formData, saving,
          deleteTarget, deleting, quickDeckVocab, quickDeckIds, savingQuickDeck,
          detailVocab, copied, decks
        }}
        modalsActions={{
          setShowImportModal, setImportJsonText, setImportError, setImportResult, setImportCopied, handleImport,
          closeModal, setFormData, handleSave, addExample, updateExample, removeExample,
          setDeleteTarget, handleDelete, handleDeleteSelected, handleClearAll,
          setQuickDeckVocab, setQuickDeckIds, handleSaveQuickDeck,
          setDetailVocab, speak, setCopied, getLevelColor, openEditModal,
          authHeaders, fetchVocabularies: globalData.fetchVocabularies
        }}
      />
    </div>
  );
}

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>;
  }

  return (
    <GlobalDataProvider>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </GlobalDataProvider>
  );
}
