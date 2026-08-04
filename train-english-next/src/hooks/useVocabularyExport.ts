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
export type ExportContent = 'full' | 'word' | 'word-meaning';

export function useVocabularyExport() {
  const { authHeaders } = useAuth();
  const [exporting, setExporting] = useState(false);
  const [copyingWords, setCopyingWords] = useState(false);
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

  const exportToJson = (allVocabs: any[], filenameBase: string, content: ExportContent) => {
    if (content === 'word') {
      downloadFile(
        JSON.stringify(allVocabs.map((v: any) => v.word || ''), null, 2),
        `${filenameBase}-${new Date().toISOString().split('T')[0]}.json`,
        'application/json;charset=utf-8'
      );
      return;
    }

    if (content === 'word-meaning') {
      downloadFile(
        JSON.stringify(allVocabs.map((v: any) => ({
          word: v.word || '',
          meanings: Array.isArray(v.meanings) ? v.meanings : [],
        })), null, 2),
        `${filenameBase}-${new Date().toISOString().split('T')[0]}.json`,
        'application/json;charset=utf-8'
      );
      return;
    }

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

  const exportToTxt = (allVocabs: any[], filenameBase: string, content: ExportContent) => {
    if (content === 'word') {
      downloadFile(
        allVocabs.map((v: any) => v.word || '').join('\n'),
        `${filenameBase}-${new Date().toISOString().split('T')[0]}.txt`,
        'text/plain;charset=utf-8'
      );
      return;
    }

    if (content === 'word-meaning') {
      const rows = allVocabs.map((v: any) => {
        const meanings = Array.isArray(v.meanings) ? v.meanings.join('; ') : '';
        return `${v.word || ''}\t${meanings}`;
      });
      downloadFile(
        rows.join('\n'),
        `${filenameBase}-${new Date().toISOString().split('T')[0]}.txt`,
        'text/plain;charset=utf-8'
      );
      return;
    }

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

  const exportToCsv = (allVocabs: any[], filenameBase: string, content: ExportContent) => {
    let csv = '';

    if (content === 'word') {
      csv = `Từ\n`;
      allVocabs.forEach((v: any) => {
        csv += `${escapeCsvValue(v.word || '')}\n`;
      });
    } else if (content === 'word-meaning') {
      csv = `Từ,Nghĩa\n`;
      allVocabs.forEach((v: any) => {
        const meanings = Array.isArray(v.meanings) ? v.meanings.join('; ') : (v.meanings || '');
        csv += `${escapeCsvValue(v.word || '')},${escapeCsvValue(meanings)}\n`;
      });
    } else {
      csv = 'Từ,Nghĩa,Loại,Phiên âm,Từ loại,Ví dụ EN,Ví dụ VI,Chủ đề,Cấp độ,Đồng nghĩa,Trái nghĩa,Ghi chú,Link ảnh\n';
      allVocabs.forEach((v: any) => {
        const examples = Array.isArray(v.examples) ? v.examples : [];
        const values = [
          v.word || '',
          Array.isArray(v.meanings) ? v.meanings.join('; ') : '',
          v.type || '',
          v.pronunciation || '',
          v.partOfSpeech || '',
          examples.map((ex: any) => ex.en || '').filter(Boolean).join(' | '),
          examples.map((ex: any) => ex.vi || '').filter(Boolean).join(' | '),
          v.topic || '',
          v.level || '',
          Array.isArray(v.synonyms) ? v.synonyms.join('; ') : '',
          Array.isArray(v.antonyms) ? v.antonyms.join('; ') : '',
          v.note || '',
          v.imageUrl || '',
        ];
        csv += `${values.map(value => escapeCsvValue(String(value))).join(',')}\n`;
      });
    }

    downloadFile(
      csv,
      `${filenameBase}-${new Date().toISOString().split('T')[0]}.csv`,
      'text/csv;charset=utf-8'
    );
  };

  const exportVocabularies = async (options: {
    format: ExportFormat;
    content?: ExportContent;
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
      const exportContent = options.content || 'full';

      switch (options.format) {
        case 'json':
          exportToJson(allVocabs, safeFilenameBase, exportContent);
          break;
        case 'txt':
          exportToTxt(allVocabs, safeFilenameBase, exportContent);
          break;
        case 'csv':
          exportToCsv(allVocabs, safeFilenameBase, exportContent);
          break;
      }
    } catch (err) {
      console.error(err);
      setError('Lỗi khi xuất dữ liệu!');
    } finally {
      setExporting(false);
    }
  };

  const copyVocabularyWords = async (query: VocabularyExportQuery): Promise<boolean> => {
    setCopyingWords(true);
    setError('');

    try {
      const allVocabs = await fetchAllVocabs(query);
      if (!allVocabs) return false;

      const words = allVocabs
        .map(vocab => typeof vocab?.word === 'string' ? vocab.word.trim() : '')
        .filter(Boolean);

      if (words.length === 0) {
        setError('Không có từ vựng nào để sao chép!');
        return false;
      }

      await navigator.clipboard.writeText(words.join('\n'));
      return true;
    } catch (err) {
      console.error(err);
      setError('Không thể sao chép danh sách từ. Vui lòng thử lại!');
      return false;
    } finally {
      setCopyingWords(false);
    }
  };

  return {
    exportVocabularies,
    copyVocabularyWords,
    exporting,
    copyingWords,
    error,
    setError, // In case UI wants to dismiss error
  };
}
