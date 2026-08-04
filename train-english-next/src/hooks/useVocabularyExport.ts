import { useState } from 'react';
import { useAuth } from '@/AuthContext';
import type { ImageFilter } from '@/types';

export type VocabularyExportQuery = {
  search?: string;
  type?: string;
  level?: string;
  topic?: string;
  pos?: string;
  deck?: string;
  image?: ImageFilter;
};

export type ExportFormat = 'json' | 'txt' | 'csv';

export function useVocabularyExport() {
  const { authHeaders } = useAuth();
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');

  const fetchAllVocabs = async (query: VocabularyExportQuery): Promise<any[] | null> => {
    // Filter out empty strings/undefined
    const activeParams = Object.fromEntries(
      Object.entries(query).filter(([_, v]) => v !== undefined && v !== '')
    ) as Record<string, string>;

    const params = new URLSearchParams(activeParams);
    const res = await fetch(`/api/vocabulary/export?${params}`, { headers: authHeaders() });
    const json = await res.json();
    if (!json.success || !json.data) {
      setError(json.message || 'Không thể tải dữ liệu từ vựng!');
      return null;
    }
    return json.data;
  };

  const downloadFile = (content: string, filename: string, mime: string) => {
    // Prefix with BOM for UTF-8 correctly (specifically needed for CSV in Excel)
    const blob = new Blob(['\uFEFF' + content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const sanitizeFilename = (base: string) => {
    if (!base) return 'tu-vung-littlebylittle';
    // Remove invalid filename characters
    return base.replace(/[\\/:*?"<>|]/g, '').trim().replace(/\s+/g, '-') || 'bo-the';
  };

  const escapeCsvValue = (val: string) => {
    if (!val) return '""';
    
    // Prevent CSV Injection
    let safeVal = val;
    if (safeVal.startsWith('=') || safeVal.startsWith('+') || safeVal.startsWith('-') || safeVal.startsWith('@')) {
      safeVal = "'" + safeVal;
    }

    // Escape double quotes
    safeVal = safeVal.replace(/"/g, '""');

    // Always quote to handle commas and newlines
    return `"${safeVal}"`;
  };

  const exportToJson = (allVocabs: any[], filenameBase: string) => {
    const payload = allVocabs.map((v: any) => ({
      word: v.word || '',
      type: v.type || 'word',
      pronunciation: v.pronunciation || '',
      meanings: Array.isArray(v.meanings) ? v.meanings : [],
      partOfSpeech: v.partOfSpeech || '',
      examples: Array.isArray(v.examples)
        ? v.examples.map((ex: any) => ({ en: ex.en || '', vi: ex.vi || '' }))
        : [],
      topic: v.topic || '',
      level: v.level || '',
      synonyms: Array.isArray(v.synonyms) ? v.synonyms : [],
      antonyms: Array.isArray(v.antonyms) ? v.antonyms : [],
      note: v.note || '',
      imageUrl: (v.imageUrl && v.imageUrl.trim()) ? v.imageUrl.trim() : 'invalid',
    }));

    downloadFile(
      JSON.stringify(payload, null, 2),
      `${filenameBase}-${new Date().toISOString().split('T')[0]}.json`,
      'application/json;charset=utf-8'
    );
  };

  const exportToTxt = (allVocabs: any[], filenameBase: string) => {
    const now = new Date().toLocaleString('vi-VN');
    const separator = '═'.repeat(60);
    const thinSep = '─'.repeat(60);

    let txt = '';
    txt += `${separator}\n`;
    txt += `  📚 DANH SÁCH TỪ VỰNG - LittleByLittle\n`;
    txt += `  Xuất lúc: ${now}\n`;
    txt += `  Tổng: ${allVocabs.length} từ\n`;
    txt += `${separator}\n\n`;

    allVocabs.forEach((v: any, idx: number) => {
      txt += `${thinSep}\n`;
      txt += `  ${idx + 1}. ${v.word}`;
      if (v.pronunciation) txt += `  /${v.pronunciation}/`;
      txt += `\n`;
      txt += `${thinSep}\n`;

      if (v.meanings?.length > 0) {
        txt += `  Nghĩa:        ${v.meanings.join(', ')}\n`;
      }
      if (v.partOfSpeech) {
        txt += `  Từ loại:      ${v.partOfSpeech}\n`;
      }
      if (v.level) {
        txt += `  Cấp độ:       ${v.level}\n`;
      }
      if (v.type) {
        txt += `  Loại:         ${v.type === 'word' ? 'Từ đơn' : 'Cụm từ'}\n`;
      }
      if (v.topic) {
        txt += `  Chủ đề:       ${v.topic}\n`;
      }
      if (v.synonyms?.length > 0) {
        txt += `  Đồng nghĩa:  ${v.synonyms.join(', ')}\n`;
      }
      if (v.antonyms?.length > 0) {
        txt += `  Trái nghĩa:  ${v.antonyms.join(', ')}\n`;
      }
      if (v.examples?.length > 0) {
        txt += `  Ví dụ:\n`;
        v.examples.forEach((ex: any, i: number) => {
          txt += `    ${i + 1}) ${ex.en}\n`;
          if (ex.vi) txt += `       → ${ex.vi}\n`;
        });
      }
      if (v.note) {
        txt += `  Ghi chú:      ${v.note}\n`;
      }
      txt += `  Link ảnh:     ${(v.imageUrl && v.imageUrl.trim()) ? v.imageUrl.trim() : 'invalid'}\n`;
      txt += `\n`;
    });

    txt += `${separator}\n`;
    txt += `  Hết danh sách (${allVocabs.length} từ)\n`;
    txt += `${separator}\n`;

    downloadFile(
      txt,
      `${filenameBase}-${new Date().toISOString().split('T')[0]}.txt`,
      'text/plain;charset=utf-8'
    );
  };

  const exportToCsv = (allVocabs: any[], filenameBase: string) => {
    let csv = `Từ,Nghĩa\n`;

    allVocabs.forEach((v: any) => {
      const word = v.word || '';
      const meanings = Array.isArray(v.meanings) ? v.meanings.join('; ') : (v.meanings || '');
      csv += `${escapeCsvValue(word)},${escapeCsvValue(meanings)}\n`;
    });

    downloadFile(
      csv,
      `${filenameBase}-${new Date().toISOString().split('T')[0]}.csv`,
      'text/csv;charset=utf-8'
    );
  };

  const exportVocabularies = async (options: {
    format: ExportFormat;
    query: VocabularyExportQuery;
    filenameBase?: string;
  }) => {
    setExporting(true);
    setError('');
    try {
      const allVocabs = await fetchAllVocabs(options.query);
      if (!allVocabs) return; // Error is set in fetchAllVocabs

      if (allVocabs.length === 0) {
        setError('Không có từ vựng nào để xuất!');
        return;
      }

      const safeFilenameBase = sanitizeFilename(options.filenameBase || '');

      switch (options.format) {
        case 'json':
          exportToJson(allVocabs, safeFilenameBase);
          break;
        case 'txt':
          exportToTxt(allVocabs, safeFilenameBase);
          break;
        case 'csv':
          exportToCsv(allVocabs, safeFilenameBase);
          break;
      }
    } catch (err) {
      console.error(err);
      setError('Lỗi khi xuất dữ liệu!');
    } finally {
      setExporting(false);
    }
  };

  return {
    exportVocabularies,
    exporting,
    error,
    setError, // In case UI wants to dismiss error
  };
}
