import codecs
with open("client/src/App.css", "r", encoding="utf-8", errors="ignore") as f:
    text = f.read()

idx = text.find("/* Nghia column fixed width */")
if idx != -1:
    good_text = text[:idx] + "/* Nghia column fixed width */\n.col-meanings { width: 8cm; min-width: 8cm; max-width: 8cm; white-space: normal; word-wrap: break-word; }\n\n"

    new_css = """
/* SIDEBAR USER PROFILE */
.sidebar-footer {
  display: flex;
  flex-direction: column;
  padding: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  gap: 8px;
}
.sidebar-user {
  display: flex;
  align-items: center;
  padding: 8px;
  gap: 12px;
  border-radius: var(--radius);
  color: var(--text-sidebar);
  cursor: pointer;
}
.sidebar-user:hover {
  background-color: var(--bg-sidebar-hover);
}
.avatar-circle {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background-color: var(--accent);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  flex-shrink: 0;
  overflow: hidden;
}
.user-info {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
}
.user-name {
  font-weight: 600;
  font-size: 14px;
  color: var(--text-sidebar-active);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.user-plan {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
}
.user-settings-btn {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s;
}
.user-settings-btn:hover {
  color: #fff;
  background-color: rgba(255, 255, 255, 0.1);
}
.user-settings-btn .icon {
  width: 20px;
  height: 20px;
}
"""

    with open("client/src/App.css", "w", encoding="utf-8") as f:
        f.write(good_text + new_css)
    print("Fixed App.css successfully")
else:
    print("Could not find anchor text")
