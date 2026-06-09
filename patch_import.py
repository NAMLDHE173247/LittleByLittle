import sys

path = "c:/Users/MSI/Desktop/LittleByLittle/client/src/App.tsx"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. State
state_search = """  const [saving, setSaving] = useState(false)

  // Delete"""
state_replace = """  const [saving, setSaving] = useState(false)

  // Import
  const [showImportModal, setShowImportModal] = useState(false)
  const [importJsonText, setImportJsonText] = useState('')
  const [importError, setImportError] = useState('')
  const [isImporting, setIsImporting] = useState(false)

  // Delete"""
content = content.replace(state_search, state_replace)

# 2. handleImport function
func_search = """  const handleDeleteSelected = async () => {"""
func_replace = """  const handleImport = async () => {
    if (!importJsonText.trim()) {
      setImportError('Vui lòng dán dữ liệu JSON vào đây')
      return
    }
    setImportError('')
    setIsImporting(true)
    try {
      const parsedData = JSON.parse(importJsonText)
      const res = await fetch(`${API_URL}/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsedData)
      })
      const json = await res.json()
      if (json.success) {
        await fetchVocabularies()
        await fetchMetadata()
        setShowImportModal(false)
        setImportJsonText('')
      } else {
        setImportError(json.message || 'Lỗi khi import dữ liệu')
      }
    } catch (e: any) {
      setImportError('Dữ liệu JSON không hợp lệ: ' + e.message)
    } finally {
      setIsImporting(false)
    }
  }

  const handleDeleteSelected = async () => {"""
content = content.replace(func_search, func_replace)

# 3. Button
btn_search = """            </div>
            <button className="btn-primary" onClick={openAddModal}>
              <PlusIcon className="icon icon-inline" /> Thêm từ mới
            </button>
          </div>"""
btn_replace = """            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn-secondary" onClick={() => setShowImportModal(true)}>
                <ArrowPathIcon className="icon icon-inline" /> Import từ vựng
              </button>
              <button className="btn-primary" onClick={openAddModal}>
                <PlusIcon className="icon icon-inline" /> Thêm từ mới
              </button>
            </div>
          </div>"""
content = content.replace(btn_search, btn_replace)

# 4. Modal
modal_search = """      </div>

      {/* ===== ADD/EDIT MODAL ===== */}"""
modal_replace = """      </div>

      {/* ===== IMPORT MODAL ===== */}
      {showImportModal && (
        <div className="modal-overlay" onClick={() => setShowImportModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2><ArrowPathIcon className="icon icon-inline" /> Import từ vựng qua AI</h2>
              <button className="modal-close" onClick={() => setShowImportModal(false)}><XMarkIcon className="icon" /></button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label>1. Copy câu lệnh mẫu (Prompt) gửi cho ChatGPT / AI:</label>
                <div style={{ position: 'relative', background: 'var(--bg-secondary)', padding: '12px', borderRadius: '8px', fontSize: '13px', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                  Đóng vai là một chuyên gia tiếng Anh, hãy tạo cho tôi 5 từ vựng tiếng Anh theo định dạng JSON array chuẩn như sau. Bạn chỉ trả về mảng JSON, không giải thích gì thêm:
                  <br />[
                  <br />&nbsp;&nbsp;&#123;
                  <br />&nbsp;&nbsp;&nbsp;&nbsp;"word": "từ vựng",
                  <br />&nbsp;&nbsp;&nbsp;&nbsp;"type": "word",
                  <br />&nbsp;&nbsp;&nbsp;&nbsp;"pronunciation": "/phiên âm/",
                  <br />&nbsp;&nbsp;&nbsp;&nbsp;"meanings": ["nghĩa 1", "nghĩa 2"],
                  <br />&nbsp;&nbsp;&nbsp;&nbsp;"partOfSpeech": "loại từ (noun, verb...)",
                  <br />&nbsp;&nbsp;&nbsp;&nbsp;"examples": [&#123; "en": "câu ví dụ", "vi": "dịch nghĩa" &#125;],
                  <br />&nbsp;&nbsp;&nbsp;&nbsp;"topic": "chủ đề",
                  <br />&nbsp;&nbsp;&nbsp;&nbsp;"level": "A1/A2/B1/B2/C1/C2",
                  <br />&nbsp;&nbsp;&nbsp;&nbsp;"synonyms": [],
                  <br />&nbsp;&nbsp;&nbsp;&nbsp;"antonyms": [],
                  <br />&nbsp;&nbsp;&nbsp;&nbsp;"note": "ghi chú"
                  <br />&nbsp;&nbsp;&#125;
                  <br />]
                  <button 
                    className="btn-secondary btn-sm" 
                    style={{ position: 'absolute', top: '8px', right: '8px', padding: '4px 8px', fontSize: '12px' }}
                    onClick={() => {
                      navigator.clipboard.writeText(`Đóng vai là một chuyên gia tiếng Anh, hãy tạo cho tôi 5 từ vựng tiếng Anh theo định dạng JSON array chuẩn như sau. Bạn chỉ trả về mảng JSON, không giải thích gì thêm:\\n[\\n  {\\n    "word": "từ vựng",\\n    "type": "word",\\n    "pronunciation": "/phiên âm/",\\n    "meanings": ["nghĩa 1", "nghĩa 2"],\\n    "partOfSpeech": "loại từ (noun, verb...)",\\n    "examples": [{ "en": "câu ví dụ", "vi": "dịch nghĩa" }],\\n    "topic": "chủ đề",\\n    "level": "A1",\\n    "synonyms": [],\\n    "antonyms": [],\\n    "note": "ghi chú"\\n  }\\n]`);
                      alert('Đã copy câu lệnh!');
                    }}
                  ><ClipboardDocumentIcon className="icon icon-inline" /> Copy</button>
                </div>
              </div>
              
              <div className="form-group">
                <label>2. Paste dữ liệu JSON AI trả về vào đây:</label>
                <textarea 
                  className="form-input" 
                  style={{ height: '200px', fontFamily: 'monospace' }} 
                  placeholder="Dán mảng JSON vào đây..."
                  value={importJsonText}
                  onChange={e => setImportJsonText(e.target.value)}
                ></textarea>
                {importError && <p className="error-text" style={{ marginTop: '8px' }}>{importError}</p>}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowImportModal(false)}>Hủy</button>
              <button className="btn-primary" onClick={handleImport} disabled={isImporting}>
                {isImporting ? 'Đang import...' : 'Import Dữ Liệu'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== ADD/EDIT MODAL ===== */}"""
content = content.replace(modal_search, modal_replace)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
print("Patched successfully")
