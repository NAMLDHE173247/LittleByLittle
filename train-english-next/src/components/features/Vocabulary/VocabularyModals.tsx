import React, { useState, useEffect } from 'react'
import {
  ArrowDownTrayIcon, PlusIcon, XMarkIcon, CheckIcon, ClipboardDocumentIcon,
  ExclamationTriangleIcon, PencilSquareIcon, RectangleStackIcon, LightBulbIcon,
  TrashIcon, BookOpenIcon, SpeakerWaveIcon, LanguageIcon, ArrowsRightLeftIcon,
  ArrowPathIcon, BookmarkIcon, PhotoIcon
} from '@heroicons/react/24/outline'
import './VocabularyPage.css'

export interface VocabularyModalsProps {
  modalsState: any;
  modalsActions: any;
}

export default function VocabularyModals({ modalsState, modalsActions }: VocabularyModalsProps) {
  const {
    showImportModal, importJsonText, importError, isImporting, importResult, importCopied,
    showModal, editingId, formError, formData, saving,
    deleteTarget, deleting,
    quickDeckVocab, quickDeckIds, savingQuickDeck,
    detailVocab, copied, decks, selectedImportDeckIds
  } = modalsState;

  const {
    setShowImportModal, setImportJsonText, setImportError, setImportResult, setImportCopied, handleImport,
    closeModal, setFormData, handleSave, addExample, updateExample, removeExample,
    setDeleteTarget, handleDelete, handleDeleteSelected, handleClearAll,
    setQuickDeckVocab, setQuickDeckIds, handleSaveQuickDeck,
    setDetailVocab, speak, setCopied, getLevelColor, openEditModal,
    authHeaders, fetchVocabularies, setSelectedImportDeckIds
  } = modalsActions;

  // State for inline image editing in detail view
  const [detailImageUrl, setDetailImageUrl] = useState<string>('');
  const [isEditingDetailImage, setIsEditingDetailImage] = useState(false);
  const [savingDetailImage, setSavingDetailImage] = useState(false);

  // Import mode: 'basic' (không ảnh) | 'full' (kèm imageUrl)
  const [importMode, setImportMode] = useState<'basic' | 'full'>('basic');
  const [showImportDeckSelection, setShowImportDeckSelection] = useState(false);
  const [importDeckSearch, setImportDeckSearch] = useState('');
  
  // States for JSON parsing
  const [isPromptOpen, setIsPromptOpen] = useState(false);
  const [parsedWordsCount, setParsedWordsCount] = useState<number | null>(null);
  const [parseStatus, setParseStatus] = useState<'empty' | 'invalid_json' | 'not_array' | 'empty_array' | 'success'>('empty');
  const [previewWords, setPreviewWords] = useState<string[]>([]);
  const [meaningsCopied, setMeaningsCopied] = useState(false);

  useEffect(() => {
    if (!importJsonText || !importJsonText.trim()) {
      setParseStatus('empty');
      setParsedWordsCount(null);
      setPreviewWords([]);
      return;
    }

    const timer = setTimeout(() => {
      try {
        const parsed = JSON.parse(importJsonText);
        if (!Array.isArray(parsed)) {
          setParseStatus('not_array');
          setParsedWordsCount(null);
          setPreviewWords([]);
        } else if (parsed.length === 0) {
          setParseStatus('empty_array');
          setParsedWordsCount(0);
          setPreviewWords([]);
        } else {
          setParseStatus('success');
          setParsedWordsCount(parsed.length);
          setPreviewWords(parsed.slice(0, 5).map((w: any) => w.word || 'unknown'));
        }
      } catch (e) {
        setParseStatus('invalid_json');
        setParsedWordsCount(null);
        setPreviewWords([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [importJsonText]);

  const IMPORT_PROMPT_BASIC = `Từ nội dung dưới đây, hãy trích xuất tất cả các từ vựng và cụm từ tiếng Anh quan trọng, phù hợp với chủ đề "[CHỦ ĐỀ]" và trình độ "[TRÌNH ĐỘ]".
Chỉ trả về một JSON array hợp lệ. Không dùng Markdown, không thêm giải thích, tiêu đề hoặc bất kỳ nội dung nào ngoài JSON.
NỘI DUNG:
[NỘI DUNG CẦN TRÍCH XUẤT]
Mỗi mục phải có cấu trúc sau:
[
{
"word": "từ hoặc cụm từ tiếng Anh",
"type": "word | phrase | phrasal_verb | collocation",
"pronunciation": "/phiên âm IPA/",
"meanings": [
"nghĩa tiếng Việt chính xác trong ngữ cảnh",
"nghĩa tiếng Việt bổ sung nếu thực sự cần thiết"
],
"partOfSpeech": "noun | verb | adjective | adverb | noun phrase | verb phrase | adjective phrase | phrasal verb",
"examples": [
{
"en": "câu ví dụ tiếng Anh tự nhiên, đúng ngữ pháp và có chứa từ hoặc cụm từ đang học",
"vi": "bản dịch tiếng Việt chính xác của câu ví dụ tiếng Anh"
}
],
"topic": "[CHỦ ĐỀ]",
"level": "[TRÌNH ĐỘ]",
"synonyms": [
"từ hoặc cụm từ đồng nghĩa phù hợp với ngữ cảnh"
],
"antonyms": [
"từ hoặc cụm từ trái nghĩa phù hợp với ngữ cảnh"
],
"note": "ghi chú ngắn gọn về cách dùng, cấu trúc, giới từ đi kèm, lỗi thường gặp hoặc mẹo ghi nhớ"
}
]
YÊU CẦU:
Ưu tiên các từ và cụm từ quan trọng đối với việc đọc hiểu, viết và giao tiếp ở trình độ đã cho.
Trích xuất cả:
từ đơn;
cụm danh từ;
cụm động từ;
phrasal verb;
collocation;
từ nối và cụm học thuật quan trọng.
Giữ nguyên các cụm từ có ý nghĩa hoàn chỉnh. Không tự ý tách một cụm thành nhiều từ riêng nếu việc tách làm mất nghĩa hoặc cách dùng.
Ví dụ:
giữ "the combined effect" là một cụm;
giữ "play a crucial role in" là một cụm;
giữ "contribute to" là một cụm;
giữ "as a result" là một cụm.
Không trích xuất:
từ quá cơ bản không có giá trị học tập;
tên riêng;
số liệu;
từ bị lặp;
từ không có ý nghĩa rõ ràng khi đứng riêng;
các biến thể ngữ pháp không cần thiết của cùng một từ.
Nếu một từ xuất hiện ở dạng số nhiều, chia thì hoặc biến đổi, hãy đưa về dạng từ điển phù hợp, trừ khi đó là một cụm cố định.
Nghĩa tiếng Việt phải dựa trên đúng ngữ cảnh của nội dung, không liệt kê quá nhiều nghĩa không liên quan.
Mỗi câu ví dụ phải:
có chứa chính xác từ hoặc cụm từ đang học;
tự nhiên và đúng ngữ pháp;
phù hợp với trình độ "[TRÌNH ĐỘ]";
liên quan đến chủ đề "[CHỦ ĐỀ]";
có bản dịch tiếng Việt tương ứng.
Trường "pronunciation" phải dùng IPA chuẩn:
dùng phát âm Anh-Anh hoặc Anh-Mỹ nhất quán;
với cụm từ, cung cấp phiên âm cho toàn bộ cụm;
không tự tạo phiên âm nếu không chắc chắn.
Trường "synonyms" và "antonyms":
chỉ thêm từ thực sự phù hợp với nghĩa trong ngữ cảnh;
không thêm từ gần nghĩa nhưng khác cách sử dụng;
nếu không có từ phù hợp, trả về mảng rỗng [].
Trường "note" nên ưu tiên một hoặc nội dung sau:
cấu trúc thường dùng;
giới từ đi kèm;
collocation;
sự khác biệt với từ dễ nhầm;
lỗi người học thường mắc;
mẹo ghi nhớ ngắn gọn.
Không để thiếu bất kỳ trường nào.
Không sử dụng giá trị null.
Không thêm dấu phẩy thừa ở phần tử cuối.
Không đặt JSON trong dấu \`\`\`.
Kết quả phải là JSON hợp lệ và có thể parse trực tiếp.`;

  const IMPORT_PROMPT_FULL = `Từ nội dung dưới đây, hãy trích xuất tất cả các từ vựng và cụm từ tiếng Anh quan trọng, phù hợp với chủ đề "[CHỦ ĐỀ]" và trình độ "[TRÌNH ĐỘ]". Với mỗi từ, hãy thêm trường "imageUrl" là một đường dẫn ảnh minh họa hợp lệ (URL công khai trực tiếp tới file ảnh .jpg/.png). Không được tự bịa hoặc đoán imageUrl. Nếu không xác minh được URL ảnh công khai hợp lệ thì trả về "imageUrl": "".
Chỉ trả về một JSON array hợp lệ. Không dùng Markdown, không thêm giải thích, tiêu đề hoặc bất kỳ nội dung nào ngoài JSON.
NỘI DUNG:
[NỘI DUNG CẦN TRÍCH XUẤT]
Mỗi mục phải có cấu trúc sau:
[
{
"word": "từ hoặc cụm từ tiếng Anh",
"type": "word | phrase | phrasal_verb | collocation",
"pronunciation": "/phiên âm IPA/",
"meanings": [
"nghĩa tiếng Việt chính xác trong ngữ cảnh",
"nghĩa tiếng Việt bổ sung nếu thực sự cần thiết"
],
"partOfSpeech": "noun | verb | adjective | adverb | noun phrase | verb phrase | adjective phrase | phrasal verb",
"examples": [
{
"en": "câu ví dụ tiếng Anh tự nhiên, đúng ngữ pháp và có chứa từ hoặc cụm từ đang học",
"vi": "bản dịch tiếng Việt chính xác của câu ví dụ tiếng Anh"
}
],
"topic": "[CHỦ ĐỀ]",
"level": "[TRÌNH ĐỘ]",
"synonyms": [
"từ hoặc cụm từ đồng nghĩa phù hợp với ngữ cảnh"
],
"antonyms": [
"từ hoặc cụm từ trái nghĩa phù hợp với ngữ cảnh"
],
"note": "ghi chú ngắn gọn về cách dùng, cấu trúc, giới từ đi kèm, lỗi thường gặp hoặc mẹo ghi nhớ",
"imageUrl": "https://.../anh-minh-hoa.jpg"
}
]
YÊU CẦU:
Ưu tiên các từ và cụm từ quan trọng đối với việc đọc hiểu, viết và giao tiếp ở trình độ đã cho.
Trích xuất cả:
từ đơn;
cụm danh từ;
cụm động từ;
phrasal verb;
collocation;
từ nối và cụm học thuật quan trọng.
Giữ nguyên các cụm từ có ý nghĩa hoàn chỉnh. Không tự ý tách một cụm thành nhiều từ riêng nếu việc tách làm mất nghĩa hoặc cách dùng.
Ví dụ:
giữ "the combined effect" là một cụm;
giữ "play a crucial role in" là một cụm;
giữ "contribute to" là một cụm;
giữ "as a result" là một cụm.
Không trích xuất:
từ quá cơ bản không có giá trị học tập;
tên riêng;
số liệu;
từ bị lặp;
từ không có ý nghĩa rõ ràng khi đứng riêng;
các biến thể ngữ pháp không cần thiết của cùng một từ.
Nếu một từ xuất hiện ở dạng số nhiều, chia thì hoặc biến đổi, hãy đưa về dạng từ điển phù hợp, trừ khi đó là một cụm cố định.
Nghĩa tiếng Việt phải dựa trên đúng ngữ cảnh của nội dung, không liệt kê quá nhiều nghĩa không liên quan.
Mỗi câu ví dụ phải:
có chứa chính xác từ hoặc cụm từ đang học;
tự nhiên và đúng ngữ pháp;
phù hợp với trình độ "[TRÌNH ĐỘ]";
liên quan đến chủ đề "[CHỦ ĐỀ]";
có bản dịch tiếng Việt tương ứng.
Trường "pronunciation" phải dùng IPA chuẩn:
dùng phát âm Anh-Anh hoặc Anh-Mỹ nhất quán;
với cụm từ, cung cấp phiên âm cho toàn bộ cụm;
không tự tạo phiên âm nếu không chắc chắn.
Trường "synonyms" và "antonyms":
chỉ thêm từ thực sự phù hợp với nghĩa trong ngữ cảnh;
không thêm từ gần nghĩa nhưng khác cách sử dụng;
nếu không có từ phù hợp, trả về mảng rỗng [].
Trường "note" nên ưu tiên một hoặc nội dung sau:
cấu trúc thường dùng;
giới từ đi kèm;
collocation;
sự khác biệt với từ dễ nhầm;
lỗi người học thường mắc;
mẹo ghi nhớ ngắn gọn.
Không để thiếu bất kỳ trường nào.
Không sử dụng giá trị null.
Không thêm dấu phẩy thừa ở phần tử cuối.
Không đặt JSON trong dấu \`\`\`.
Kết quả phải là JSON hợp lệ và có thể parse trực tiếp.`;

  const activePrompt = importMode === 'full' ? IMPORT_PROMPT_FULL : IMPORT_PROMPT_BASIC;

  const basicPlaceholder = `[\n  {\n    "word": "example",\n    "meanings": ["ví dụ"],\n    ...\n  }\n]`;
  const fullPlaceholder = `[\n  {\n    "word": "example",\n    "meanings": ["ví dụ"],\n    "imageUrl": "https://.../anh.jpg",\n    ...\n  }\n]`;

  const closeImportModal = () => {
    setShowImportModal(false);
    setImportMode('basic');
    setShowImportDeckSelection(false);
    setImportDeckSearch('');
    setIsPromptOpen(false);
    if (setSelectedImportDeckIds) setSelectedImportDeckIds([]);
  };

  return (
    <>
      {/* ===== IMPORT MODAL ===== */}
      {showImportModal && (
        <div className="modal-overlay" onClick={closeImportModal}>
          <div className="modal import-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2><ArrowDownTrayIcon className="icon icon-inline" /> Import từ vựng qua AI</h2>
              <button className="modal-close" onClick={closeImportModal}><XMarkIcon className="icon" /></button>
            </div>

            <div className="import-mode-bar">
              <div className="import-tabs">
                <button
                  type="button"
                  className={`import-tab ${importMode === 'basic' ? 'active' : ''}`}
                  onClick={() => setImportMode('basic')}
                >
                  Import cơ bản
                  <span className="import-tab-tooltip">
                    Chỉ import thông tin chữ (nghĩa, phát âm, ví dụ, ghi chú...). Phù hợp khi dán nhanh kết quả từ AI mà không cần ảnh.
                  </span>
                </button>
                <button
                  type="button"
                  className={`import-tab ${importMode === 'full' ? 'active' : ''}`}
                  onClick={() => setImportMode('full')}
                >
                  Import đầy đủ (kèm ảnh)
                  <span className="import-tab-tooltip">
                    Import từ vựng kèm đường dẫn ảnh minh họa (imageUrl). Phù hợp khi muốn mỗi từ có hình ảnh trực quan.
                  </span>
                </button>
              </div>
              <div className="import-mode-hint">
                {importMode === 'full'
                  ? 'Chế độ đầy đủ: mỗi từ sẽ có thêm trường "imageUrl" chứa link ảnh minh họa.'
                  : 'Chế độ cơ bản: import nhanh, không bao gồm ảnh minh họa. Hover tab để xem hướng dẫn.'}
              </div>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="import-step">
                <div 
                  className="import-accordion-header"
                  onClick={() => setIsPromptOpen(!isPromptOpen)}
                >
                  <div className="import-step-header">
                    <span className="import-step-number">1</span>
                    <span className="import-step-title">Copy câu lệnh mẫu gửi cho AI (ChatGPT / Claude / Gemini)</span>
                  </div>
                  <div className="import-accordion-toggle">
                    {isPromptOpen ? 'Thu gọn' : 'Hiển thị prompt'}
                    <svg className={`import-accordion-icon ${isPromptOpen ? 'open' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
                {isPromptOpen && (
                  <div className="import-accordion-content import-prompt-box">
                    <pre className="import-prompt-text">{activePrompt}</pre>
                    <button
                      className={`btn-copy-prompt ${importCopied ? 'copied' : ''}`}
                      onClick={() => {
                        navigator.clipboard.writeText(activePrompt)
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
                )}
              </div>

              {/* Step 2: Paste JSON */}
              <div className="import-step">
                <div className="import-textarea-header">
                  <div className="import-step-header">
                    <span className="import-step-number">2</span>
                    <span className="import-step-title">Dán (paste) dữ liệu JSON mà AI trả về vào đây</span>
                  </div>
                  {parseStatus === 'success' && <div className="import-parse-status success"><CheckIcon className="icon icon-inline"/> Đã nhận {parsedWordsCount} từ vựng</div>}
                  {parseStatus === 'invalid_json' && <div className="import-parse-status error"><ExclamationTriangleIcon className="icon icon-inline"/> JSON không hợp lệ</div>}
                  {parseStatus === 'not_array' && <div className="import-parse-status error"><ExclamationTriangleIcon className="icon icon-inline"/> Dữ liệu phải là mảng (Array)</div>}
                  {parseStatus === 'empty_array' && <div className="import-parse-status neutral">Danh sách chưa có từ vựng</div>}
                </div>
                <textarea
                  className="import-textarea"
                  style={{ marginTop: '12px' }}
                  placeholder={importMode === 'full' ? fullPlaceholder : basicPlaceholder}
                  value={importJsonText}
                  onChange={e => { setImportJsonText(e.target.value); setImportError(''); setImportResult(null) }}
                />
                {parseStatus === 'success' && previewWords.length > 0 && (
                  <div className="import-preview-area">
                    <span style={{ fontWeight: 500 }}>Xem trước {Math.min(5, parsedWordsCount || 0)} từ đầu tiên:</span>
                    <div className="import-preview-tags">
                      {previewWords.map((w, idx) => <span key={idx} className="import-preview-tag">{w}</span>)}
                      {(parsedWordsCount || 0) > 5 && <span className="import-preview-tag">...</span>}
                    </div>
                    <span className="import-preview-total">Tổng: {parsedWordsCount} từ</span>
                  </div>
                )}
                {importError && (
                  <div className="import-error">
                    <ExclamationTriangleIcon className="icon icon-inline" /> {importError}
                  </div>
                )}
              </div>

              {/* Step 3: Deck Selection */}
              <div className="import-step">
                <div 
                  className="import-accordion-header"
                  onClick={() => setShowImportDeckSelection(!showImportDeckSelection)}
                >
                  <div className="import-step-header">
                    <span className="import-step-number">3</span>
                    <span className="import-step-title">Thêm vào bộ thẻ — Không bắt buộc</span>
                  </div>
                  <div className="import-accordion-toggle">
                    {showImportDeckSelection ? 'Thu gọn' : 'Mở rộng'}
                    <svg className={`import-accordion-icon ${showImportDeckSelection ? 'open' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {showImportDeckSelection && (
                  <div className="import-accordion-content">
                    {decks.length === 0 ? (
                      <p className="text-muted" style={{ margin: 0, padding: '12px', background: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                        Chưa có bộ thẻ nào. Bạn vẫn có thể import từ vựng vào kho chung.
                      </p>
                    ) : (
                      <>
                        <div style={{ display: 'flex', gap: '12px', marginBottom: '8px', alignItems: 'center' }}>
                          <input
                            type="text"
                            className="search-input"
                            placeholder="Tìm kiếm bộ thẻ..."
                            value={importDeckSearch}
                            onChange={e => setImportDeckSearch(e.target.value)}
                            style={{ flex: 1, padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border)' }}
                          />
                          <button 
                            className="btn-outline btn-sm"
                            style={{ border: 'none', background: 'transparent' }}
                            onClick={() => {
                              const filteredDeckIds = decks.filter((d: any) => d.name.toLowerCase().includes(importDeckSearch.toLowerCase())).map((d: any) => d._id);
                              const newSelected = [...new Set([...(selectedImportDeckIds || []), ...filteredDeckIds])];
                              if (setSelectedImportDeckIds) setSelectedImportDeckIds(newSelected);
                            }}
                          >
                            ☐ Chọn tất cả
                          </button>
                          <button 
                            className="btn-outline btn-sm"
                            style={{ border: 'none', background: 'transparent' }}
                            onClick={() => {
                              if (setSelectedImportDeckIds) setSelectedImportDeckIds([]);
                            }}
                          >
                            <TrashIcon className="icon icon-inline" /> Bỏ chọn tất cả
                          </button>
                        </div>
                        
                        <div className="deck-grid">
                          {decks.filter((d: any) => d.name.toLowerCase().includes(importDeckSearch.toLowerCase())).map((deck: any) => {
                            const isSelected = selectedImportDeckIds?.includes(deck._id) || false;
                            return (
                              <label key={deck._id} className={`deck-card ${isSelected ? 'selected' : ''}`}>
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={(e) => {
                                    if (!setSelectedImportDeckIds) return;
                                    if (e.target.checked) {
                                      setSelectedImportDeckIds([...(selectedImportDeckIds || []), deck._id]);
                                    } else {
                                      setSelectedImportDeckIds((selectedImportDeckIds || []).filter((id: string) => id !== deck._id));
                                    }
                                  }}
                                />
                                <div className="deck-card-content">
                                  <div className="deck-card-title">
                                    <span className="deck-card-color" style={{ backgroundColor: deck.color || '#ccc' }} />
                                    {deck.name}
                                  </div>
                                  {deck.vocabularyCount !== undefined && deck.vocabularyCount !== null && (
                                    <div className="deck-card-count">{deck.vocabularyCount} từ vựng</div>
                                  )}
                                </div>
                              </label>
                            );
                          })}
                        </div>
                        
                        {(selectedImportDeckIds || []).length > 0 && (
                          <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px dashed var(--border)' }}>
                            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Đã chọn {(selectedImportDeckIds || []).length}/{decks.length} bộ thẻ:</div>
                            <div className="selected-summary-tags">
                              {(selectedImportDeckIds || []).slice(0, 3).map((id: string) => {
                                const d = decks.find((x: any) => x._id === id);
                                if (!d) return null;
                                return (
                                  <span key={id} className="selected-deck-tag">
                                    {d.name}
                                    <span 
                                      className="selected-deck-tag-remove"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        if (setSelectedImportDeckIds) {
                                          setSelectedImportDeckIds((selectedImportDeckIds || []).filter((x: string) => x !== id));
                                        }
                                      }}
                                    >
                                      <XMarkIcon className="icon" />
                                    </span>
                                  </span>
                                );
                              })}
                              {(selectedImportDeckIds || []).length > 3 && (
                                <span className="selected-deck-tag" style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)' }}>
                                  +{(selectedImportDeckIds || []).length - 3}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Result */}
              {importResult && (
                 <div className="import-result">
                  <div className="import-result-header">
                    <CheckIcon className="icon icon-inline" /> Kết quả Import
                  </div>
                  <div className="import-result-stats" style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
                    <div className="import-stat success">
                      <span className="import-stat-value">{importResult.createdCount || 0}</span>
                      <span className="import-stat-label">Đã tạo mới</span>
                    </div>
                    <div className="import-stat warning">
                      <span className="import-stat-value">{importResult.existingCount || 0}</span>
                      <span className="import-stat-label">Đã tồn tại</span>
                    </div>
                    <div className="import-stat" style={{ backgroundColor: 'var(--bg-primary)', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <span className="import-stat-value" style={{ color: 'var(--primary-color)', fontSize: '1.25rem', fontWeight: 'bold' }}>{importResult.updatedVocabularyCount || 0}</span>
                      <span className="import-stat-label" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Từ cũ được gán thẻ mới</span>
                    </div>
                    <div className="import-stat error">
                      <span className="import-stat-value">{importResult.invalidCount || 0}</span>
                      <span className="import-stat-label">Lỗi (không hợp lệ)</span>
                    </div>
                  </div>
                  <div className="import-result-detail">
                    <span className="import-detail-label">Bỏ qua (trùng lặp trong JSON):</span> {importResult.duplicateInRequestCount || 0} từ
                  </div>
                  <div className="import-result-detail">
                    <span className="import-detail-label">Đã chọn:</span> {importResult.selectedDeckCount || 0} bộ thẻ
                  </div>
                  
                  {importResult.errors && importResult.errors.length > 0 && (
                    <div className="import-result-detail errors" style={{ marginTop: '12px' }}>
                      <span className="import-detail-label">Chi tiết lỗi:</span>
                      {importResult.errors.map((err: string, i: number) => (
                        <span key={i} className="import-error-item">{err}</span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="modal-footer" style={{ justifyContent: 'space-between', borderTop: '1px solid var(--border)' }}>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                {parseStatus === 'success' && <><CheckIcon className="icon icon-inline" style={{ color: '#10B981' }}/> {parsedWordsCount} từ vựng sẵn sàng để import</>}
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button className="btn-outline" onClick={closeImportModal}>Đóng</button>
                <button className="btn-primary" onClick={handleImport} disabled={isImporting || parseStatus !== 'success'}>
                  {isImporting ? <><span className="spinner-sm"></span> Đang import...</> : <><ArrowDownTrayIcon className="icon icon-inline" /> Import Dữ Liệu</>}
                </button>
              </div>
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
                    onChange={e => setFormData((prev: any) => ({ ...prev, word: e.target.value }))}
                    placeholder="e.g. accomplish, break the ice"
                  />
                </div>

                <div className="form-group">
                  <label>Loại</label>
                  <select
                    value={formData.type}
                    onChange={e => setFormData((prev: any) => ({ ...prev, type: e.target.value as 'word' | 'phrase' }))}
                  >
                    <option value="word">Từ</option>
                    <option value="phrase">Cụm từ</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Cấp độ</label>
                  <select
                    value={formData.level}
                    onChange={e => setFormData((prev: any) => ({ ...prev, level: e.target.value }))}
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
                    onChange={e => setFormData((prev: any) => ({ ...prev, pronunciation: e.target.value }))}
                    placeholder="e.g. /əˈkɒm.plɪʃ/"
                  />
                </div>

                <div className="form-group">
                  <label>Từ loại</label>
                  <select
                    value={formData.partOfSpeech}
                    onChange={e => setFormData((prev: any) => ({ ...prev, partOfSpeech: e.target.value }))}
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
                    onChange={e => setFormData((prev: any) => ({ ...prev, meanings: e.target.value }))}
                    placeholder="Cách nhau bằng dấu phẩy: hoàn thành, đạt được"
                  />
                </div>

                <div className="form-group">
                  <label>Chủ đề</label>
                  <input
                    type="text"
                    value={formData.topic}
                    onChange={e => setFormData((prev: any) => ({ ...prev, topic: e.target.value }))}
                    placeholder="e.g. daily life, business"
                  />
                </div>

                <div className="form-group">
                  <label>Từ đồng nghĩa</label>
                  <input
                    type="text"
                    value={formData.synonyms}
                    onChange={e => setFormData((prev: any) => ({ ...prev, synonyms: e.target.value }))}
                    placeholder="Cách nhau bằng dấu phẩy"
                  />
                </div>

                <div className="form-group">
                  <label>Từ trái nghĩa</label>
                  <input
                    type="text"
                    value={formData.antonyms}
                    onChange={e => setFormData((prev: any) => ({ ...prev, antonyms: e.target.value }))}
                    placeholder="Cách nhau bằng dấu phẩy"
                  />
                </div>

                <div className="form-group full">
                  <label>Ghi chú</label>
                  <textarea
                    value={formData.note}
                    onChange={e => setFormData((prev: any) => ({ ...prev, note: e.target.value }))}
                    placeholder="Mẹo, ngữ cảnh sử dụng..."
                    rows={2}
                  />
                </div>

                <div className="form-group full">
                  <label>Đường dẫn ảnh</label>
                  <input
                    type="text"
                    value={formData.imageUrl}
                    onChange={e => setFormData((prev: any) => ({ ...prev, imageUrl: e.target.value }))}
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
                      {decks.map((deck: any) => (
                        <label key={deck._id} className="deck-checkbox-item">
                          <input
                            type="checkbox"
                            checked={formData.deckIds.includes(deck._id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData((prev: any) => ({ ...prev, deckIds: [...prev.deckIds, deck._id] }))
                              } else {
                                setFormData((prev: any) => ({ ...prev, deckIds: prev.deckIds.filter((id: string) => id !== deck._id) }))
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
                {formData.examples.map((ex: any, idx: number) => (
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
              {deleteTarget.id === '__clear_all__' ? (
                <p className="delete-msg">
                  Bạn có chắc muốn xóa{' '}
                  <strong>TOÀN BỘ từ vựng</strong> trong cơ sở dữ liệu?
                  Toàn bộ dữ liệu sẽ bị xóa vĩnh viễn và <strong>không thể hoàn tác</strong>.
                </p>
              ) : (
                <p className="delete-msg">
                  Bạn có chắc muốn xóa{' '}
                  <strong>{deleteTarget.word}</strong>?
                  Hành động này không thể hoàn tác.
                </p>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn-outline" onClick={() => setDeleteTarget(null)}>Hủy</button>
              <button
                className="btn-danger"
                onClick={
                  deleteTarget.id === '__clear_all__'
                    ? handleClearAll
                    : deleteTarget.id === '__bulk__'
                      ? handleDeleteSelected
                      : handleDelete
                }
                disabled={deleting}
              >
                {deleting ? 'Đang xóa...' : deleteTarget.id === '__clear_all__' ? 'Xóa toàn bộ' : 'Xóa'}
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
                  {decks.map((deck: any) => (
                    <label key={deck._id} className="deck-checkbox-item">
                      <input
                        type="checkbox"
                        checked={quickDeckIds.includes(deck._id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setQuickDeckIds((prev: any) => [...prev, deck._id])
                          } else {
                            setQuickDeckIds((prev: any) => prev.filter((id: string) => id !== deck._id))
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
              {detailVocab.imageUrl ? (
                <div className="detail-image">
                  <img
                    src={detailVocab.imageUrl}
                    alt={detailVocab.word}
                    onError={e => (e.currentTarget.style.display = 'none')}
                  />
                </div>
              ) : (
                <div className="detail-image-add">
                  {isEditingDetailImage ? (
                    <div className="detail-image-edit-form">
                      <input
                        type="text"
                        className="detail-image-input"
                        placeholder="Dán URL ảnh vào đây..."
                        value={detailImageUrl}
                        onChange={e => setDetailImageUrl(e.target.value)}
                        onKeyDown={async e => {
                          if (e.key === 'Enter' && detailImageUrl.trim()) {
                            e.preventDefault()
                            setSavingDetailImage(true)
                            try {
                              const res = await fetch(`/api/vocabulary/${detailVocab._id}`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json', ...authHeaders() },
                                body: JSON.stringify({ imageUrl: detailImageUrl.trim() })
                              })
                              const result = await res.json()
                              if (result.success) {
                                setDetailVocab({ ...detailVocab, imageUrl: detailImageUrl.trim() })
                                if (fetchVocabularies) fetchVocabularies()
                              }
                            } catch (err) { console.error(err) }
                            setSavingDetailImage(false)
                            setIsEditingDetailImage(false)
                            setDetailImageUrl('')
                          } else if (e.key === 'Escape') {
                            setIsEditingDetailImage(false)
                            setDetailImageUrl('')
                          }
                        }}
                        autoFocus
                      />
                      {detailImageUrl && (
                        <img
                          className="detail-image-preview"
                          src={detailImageUrl}
                          alt="Preview"
                          onError={e => (e.currentTarget.style.display = 'none')}
                          onLoad={e => (e.currentTarget.style.display = 'block')}
                        />
                      )}
                      <div className="detail-image-actions">
                        <button
                          className="btn-primary btn-sm"
                          disabled={!detailImageUrl.trim() || savingDetailImage}
                          onClick={async () => {
                            if (!detailImageUrl.trim()) return
                            setSavingDetailImage(true)
                            try {
                              const res = await fetch(`/api/vocabulary/${detailVocab._id}`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json', ...authHeaders() },
                                body: JSON.stringify({ imageUrl: detailImageUrl.trim() })
                              })
                              const result = await res.json()
                              if (result.success) {
                                setDetailVocab({ ...detailVocab, imageUrl: detailImageUrl.trim() })
                                if (fetchVocabularies) fetchVocabularies()
                              }
                            } catch (err) { console.error(err) }
                            setSavingDetailImage(false)
                            setIsEditingDetailImage(false)
                            setDetailImageUrl('')
                          }}
                        >
                          {savingDetailImage ? 'Đang lưu...' : 'Lưu ảnh'}
                        </button>
                        <button
                          className="btn-outline btn-sm"
                          onClick={() => { setIsEditingDetailImage(false); setDetailImageUrl('') }}
                        >
                          Hủy
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      className="detail-image-add-btn"
                      onClick={() => setIsEditingDetailImage(true)}
                    >
                      <PhotoIcon className="icon" style={{ width: 28, height: 28 }} />
                      <span>Thêm ảnh minh họa</span>
                    </button>
                  )}
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <h4 style={{ margin: 0 }}><LanguageIcon className="icon icon-inline" /> Nghĩa</h4>
                  <button
                    className={`copy-btn ${meaningsCopied ? 'copied' : ''}`}
                    onClick={() => {
                      navigator.clipboard.writeText(detailVocab.meanings.join(', '))
                      setMeaningsCopied(true)
                      setTimeout(() => setMeaningsCopied(false), 2000)
                    }}
                    title="Sao chép nghĩa"
                  >
                    {meaningsCopied ? <CheckIcon className="icon" /> : <ClipboardDocumentIcon className="icon" />}
                  </button>
                </div>
                <ul className="detail-meanings-list">
                  {detailVocab.meanings.map((m: string, i: number) => (
                    <li key={i}>{m}</li>
                  ))}
                </ul>
              </div>

              {/* Examples */}
              {detailVocab.examples.length > 0 && (
                <div className="detail-section">
                  <h4><LightBulbIcon className="icon icon-inline" /> Ví dụ</h4>
                  {detailVocab.examples.map((ex: any, i: number) => (
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
                        {detailVocab.synonyms.map((s: string, i: number) => (
                          <span key={i} className="chip chip-syn">{s}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {detailVocab.antonyms.length > 0 && (
                    <div className="detail-section">
                      <h4><ArrowPathIcon className="icon icon-inline" /> Từ trái nghĩa</h4>
                      <div className="chip-list">
                        {detailVocab.antonyms.map((a: string, i: number) => (
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
    </>
  )
}
