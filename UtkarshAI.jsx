import { useState, useRef, useEffect, useCallback } from "react";

const MODES = {
  chat:    { icon: "💬", label: "Chat",             color: "#7c3aed" },
  ppt:     { icon: "📊", label: "Create PPT",       color: "#0ea5e9" },
  image:   { icon: "🖼️", label: "Analyze Image",    color: "#10b981" },
  doc:     { icon: "📄", label: "Summarize Doc",    color: "#f59e0b" },
};

const SYSTEM_PROMPT = `You are UTKARSH AI — an elite, multilingual productivity assistant.
You are sharp, structured, and highly capable. You can:
• Generate PowerPoint outlines (respond with a structured outline when asked to "make a PPT")
• Analyze images and documents
• Write, code, research, and explain anything
• Communicate fluently in Hindi and English (Hinglish is welcome)
Always format your responses clearly. Use bullet points and headers where helpful.`;

const SYS_MSG = { role: "user", content: [{ type: "text", text: SYSTEM_PROMPT }] };

const formatTime = (d) => d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
const formatDate = (d) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });

function TypingDots() {
  return (
    <span style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
      {[0,1,2].map(i => (
        <span key={i} style={{
          width: 6, height: 6, borderRadius: "50%", background: "#7c3aed",
          animation: "pulse 1.2s ease-in-out infinite",
          animationDelay: `${i * 0.2}s`
        }}/>
      ))}
    </span>
  );
}

function MsgBubble({ msg }) {
  const isUser = msg.role === "user";
  return (
    <div style={{
      display: "flex", flexDirection: isUser ? "row-reverse" : "row",
      alignItems: "flex-end", gap: 10, marginBottom: 18,
      animation: "slideUp 0.25s ease-out"
    }}>
      {!isUser && (
        <div style={{
          width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
          background: "linear-gradient(135deg,#7c3aed,#0ea5e9)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 14, fontWeight: 700, color: "#fff", letterSpacing: "-0.5px"
        }}>U</div>
      )}
      <div style={{ maxWidth: "75%" }}>
        <div style={{
          background: isUser
            ? "linear-gradient(135deg,#7c3aed,#5b21b6)"
            : "rgba(255,255,255,0.05)",
          border: isUser ? "none" : "1px solid rgba(255,255,255,0.08)",
          borderRadius: isUser ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
          padding: "12px 16px", color: "#e8e8f0", fontSize: 14.5,
          lineHeight: 1.65, whiteSpace: "pre-wrap", wordBreak: "break-word"
        }}>
          {msg.content === "__typing__" ? <TypingDots /> : msg.content}
        </div>
        <div style={{
          fontSize: 11, color: "rgba(255,255,255,0.3)",
          marginTop: 4, textAlign: isUser ? "right" : "left"
        }}>{msg.time}</div>
      </div>
    </div>
  );
}

function Sidebar({ sessions, activeSession, onSelect, onNew }) {
  return (
    <div style={{
      width: 260, background: "rgba(0,0,0,0.4)",
      borderRight: "1px solid rgba(255,255,255,0.06)",
      display: "flex", flexDirection: "column", height: "100%", overflow: "hidden"
    }}>
      <div style={{ padding: "18px 16px 12px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <button onClick={onNew} style={{
          width: "100%", padding: "9px 14px",
          background: "linear-gradient(135deg,#7c3aed,#5b21b6)",
          border: "none", borderRadius: 10, color: "#fff",
          fontSize: 13, fontWeight: 600, cursor: "pointer",
          display: "flex", alignItems: "center", gap: 8
        }}>
          <span style={{ fontSize: 16 }}>+</span> New Chat
        </button>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "8px 8px" }}>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", padding: "6px 8px", letterSpacing: 1, textTransform: "uppercase" }}>Recent</div>
        {sessions.map(s => (
          <div key={s.id} onClick={() => onSelect(s.id)} style={{
            padding: "10px 12px", borderRadius: 9, marginBottom: 2,
            background: s.id === activeSession ? "rgba(124,58,237,0.2)" : "transparent",
            border: s.id === activeSession ? "1px solid rgba(124,58,237,0.35)" : "1px solid transparent",
            cursor: "pointer", transition: "all 0.15s"
          }}>
            <div style={{ fontSize: 13, color: "#d4d4f0", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {MODES[s.mode]?.icon} {s.title}
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>{s.date}</div>
          </div>
        ))}
        {sessions.length === 0 && (
          <div style={{ textAlign: "center", color: "rgba(255,255,255,0.2)", fontSize: 12, padding: "30px 0" }}>No history yet</div>
        )}
      </div>
      <div style={{ padding: "12px 16px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", textAlign: "center" }}>UTKARSH AI v1.0</div>
      </div>
    </div>
  );
}

export default function UtkarshAI() {
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [history, setHistory] = useState({});   // sessionId → messages
  const [input, setInput] = useState("");
  const [mode, setMode] = useState("chat");
  const [loading, setLoading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const endRef = useRef(null);
  const fileRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const newSession = useCallback(() => {
    const id = Date.now().toString();
    const s = { id, title: "New conversation", mode, date: formatDate(new Date()), messages: [] };
    setSessions(p => [s, ...p]);
    setActiveSession(id);
    setMessages([]);
    setUploadedFile(null);
    return id;
  }, [mode]);

  useEffect(() => { if (!activeSession) newSession(); }, []);

  const selectSession = (id) => {
    setActiveSession(id);
    setMessages(history[id] || []);
  };

  const saveHistory = (id, msgs) => {
    setHistory(p => ({ ...p, [id]: msgs }));
    setSessions(p => p.map(s => s.id === id
      ? { ...s, title: msgs.find(m=>m.role==="user")?.content?.slice(0,40) || "Chat", mode }
      : s
    ));
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text && !uploadedFile) return;
    if (loading) return;

    let sid = activeSession;
    if (!sid) { sid = newSession(); }

    const userMsg = { role: "user", content: text || `[File: ${uploadedFile?.name}]`, time: formatTime(new Date()) };
    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs);
    setInput("");
    setLoading(true);

    // Typing indicator
    const typingMsgs = [...newMsgs, { role: "assistant", content: "__typing__", time: "" }];
    setMessages(typingMsgs);

    try {
      const apiMessages = [SYS_MSG];

      // Build mode-aware prompt
      let userContent = text;
      if (mode === "ppt") {
        userContent = `Generate a detailed PowerPoint presentation outline for: "${text}"\n\nProvide:\n1. A compelling title\n2. 8 slides with titles and 4-5 bullet points each\n3. Format clearly with slide numbers\n4. Make it professional and comprehensive`;
      } else if (mode === "doc" && uploadedFile) {
        userContent = `The user uploaded: "${uploadedFile.name}". Simulate reading and summarizing it. Create a realistic, detailed summary with key points, main themes, and important findings. Then answer: ${text || "Summarize this document."}`;
      } else if (mode === "image" && uploadedFile) {
        userContent = `The user uploaded an image: "${uploadedFile.name}". Simulate a detailed AI vision analysis: describe what would likely be in such an image (based on filename hints), extract hypothetical text, identify objects, colors, and provide insights. Then: ${text || "Analyze this image."}`;
      }

      newMsgs.forEach(m => {
        if (m.role !== "__typing__") {
          apiMessages.push({ role: m.role === "user" ? "user" : "assistant", content: [{ type: "text", text: m.content }] });
        }
      });
      // Replace last user message with enriched version
      apiMessages[apiMessages.length - 1] = { role: "user", content: [{ type: "text", text: userContent }] };

      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: apiMessages.slice(1),
          system: SYSTEM_PROMPT,
        }),
      });

      const data = await resp.json();
      const aiText = data.content?.map(c => c.text || "").join("") || "Something went wrong.";

      const aiMsg = { role: "assistant", content: aiText, time: formatTime(new Date()) };
      const finalMsgs = [...newMsgs, aiMsg];
      setMessages(finalMsgs);
      saveHistory(sid, finalMsgs);
      setUploadedFile(null);
    } catch (e) {
      const errMsg = { role: "assistant", content: `⚠️ Error: ${e.message}`, time: formatTime(new Date()) };
      const finalMsgs = [...newMsgs, errMsg];
      setMessages(finalMsgs);
      saveHistory(sid, finalMsgs);
    }
    setLoading(false);
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) setUploadedFile(file);
  };

  const quickAction = (m) => {
    setMode(m);
    const prompt = {
      ppt:   "Make a PPT on Artificial Intelligence & Future of Work",
      image: "Please upload an image to analyze (demo: describing a sample diagram)",
      doc:   "Please upload a document to summarize",
    }[m];
    if (prompt) setInput(prompt);
    textareaRef.current?.focus();
  };

  const modeColor = MODES[mode]?.color || "#7c3aed";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Sora', sans-serif; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(124,58,237,0.4); border-radius: 4px; }
        @keyframes pulse { 0%,80%,100%{opacity:0.2;transform:scale(0.8)} 40%{opacity:1;transform:scale(1)} }
        @keyframes slideUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
        .mode-btn:hover { background: rgba(255,255,255,0.08) !important; transform: translateY(-1px); }
        .send-btn:hover { filter: brightness(1.15); transform: translateY(-1px); }
        .send-btn:active { transform: scale(0.96); }
        textarea:focus { outline: none; }
        textarea { resize: none; }
      `}</style>

      <div style={{
        width: "100%", height: "100vh", display: "flex",
        background: "radial-gradient(ellipse at 20% 10%, rgba(124,58,237,0.12) 0%, transparent 50%), #0a0a12",
        fontFamily: "'Sora', sans-serif", overflow: "hidden", color: "#e8e8f0"
      }}>

        {/* Sidebar */}
        {sidebarOpen && (
          <Sidebar sessions={sessions} activeSession={activeSession} onSelect={selectSession} onNew={newSession} />
        )}

        {/* Main */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* Header */}
          <div style={{
            padding: "0 24px", height: 60,
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            background: "rgba(0,0,0,0.3)", backdropFilter: "blur(12px)", flexShrink: 0
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <button onClick={() => setSidebarOpen(p=>!p)} style={{
                background: "transparent", border: "none", color: "rgba(255,255,255,0.4)",
                cursor: "pointer", fontSize: 18, padding: 4
              }}>☰</button>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: "50%",
                  background: "linear-gradient(135deg,#7c3aed,#0ea5e9)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontWeight: 700, fontSize: 15, color: "#fff", letterSpacing: "-0.5px"
                }}>U</div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: 1.5, background: "linear-gradient(90deg,#a78bfa,#38bdf8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                    UTKARSH AI
                  </div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: 0.5 }}>Your Personal AI Superapp</div>
                </div>
              </div>
            </div>

            {/* Mode pills */}
            <div style={{ display: "flex", gap: 6 }}>
              {Object.entries(MODES).map(([k, v]) => (
                <button key={k} className="mode-btn" onClick={() => setMode(k)} style={{
                  padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 500,
                  background: mode === k ? `${v.color}22` : "transparent",
                  border: `1px solid ${mode === k ? v.color : "rgba(255,255,255,0.1)"}`,
                  color: mode === k ? v.color : "rgba(255,255,255,0.5)",
                  cursor: "pointer", transition: "all 0.15s"
                }}>
                  {v.icon} {v.label}
                </button>
              ))}
            </div>

            <div style={{ width: 80, textAlign: "right" }}>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                fontSize: 11, color: "rgba(255,255,255,0.3)"
              }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981", display: "inline-block" }}/>
                Online
              </div>
            </div>
          </div>

          {/* Quick Actions Bar */}
          <div style={{
            padding: "12px 24px", display: "flex", gap: 10, alignItems: "center",
            borderBottom: "1px solid rgba(255,255,255,0.04)", flexShrink: 0
          }}>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", letterSpacing: 0.5 }}>QUICK:</span>
            {[
              { m: "ppt",   label: "📊 Create PPT", bg: "#0ea5e9" },
              { m: "image", label: "🖼️ Analyze Image", bg: "#10b981" },
              { m: "doc",   label: "📄 Summarize Doc", bg: "#f59e0b" },
            ].map(({ m, label, bg }) => (
              <button key={m} onClick={() => quickAction(m)} style={{
                padding: "5px 14px", background: `${bg}18`,
                border: `1px solid ${bg}44`, borderRadius: 16,
                color: bg, fontSize: 12, fontWeight: 500, cursor: "pointer",
                transition: "all 0.15s"
              }}>
                {label}
              </button>
            ))}
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "24px 24px 8px" }}>
            {messages.length === 0 && (
              <div style={{ textAlign: "center", paddingTop: 60 }}>
                <div style={{
                  fontSize: 52, marginBottom: 16,
                  background: "linear-gradient(135deg,#7c3aed,#0ea5e9)",
                  WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                  fontWeight: 700, letterSpacing: 2
                }}>UTKARSH AI</div>
                <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 15, marginBottom: 32 }}>
                  Aapka personal AI assistant — Chat, PPT, Images, Documents sab ek jagah
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, maxWidth: 600, margin: "0 auto" }}>
                  {[
                    { icon: "📊", text: "Make a PPT on Climate Change", m: "ppt" },
                    { icon: "💻", text: "Write a Python web scraper", m: "chat" },
                    { icon: "🌏", text: "Explain Quantum Computing in Hindi", m: "chat" },
                  ].map(({ icon, text, m }) => (
                    <div key={text} onClick={() => { setMode(m); setInput(text); textareaRef.current?.focus(); }}
                      style={{
                        background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: 12, padding: "14px 16px", cursor: "pointer", transition: "all 0.15s",
                        textAlign: "left"
                      }}>
                      <div style={{ fontSize: 22, marginBottom: 6 }}>{icon}</div>
                      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", lineHeight: 1.5 }}>{text}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {messages.map((msg, i) => <MsgBubble key={i} msg={msg} />)}
            <div ref={endRef} />
          </div>

          {/* Upload preview */}
          {uploadedFile && (
            <div style={{
              margin: "0 24px 4px",
              background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.3)",
              borderRadius: 10, padding: "8px 14px",
              display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12
            }}>
              <span>📎 {uploadedFile.name} ({(uploadedFile.size/1024).toFixed(1)} KB)</span>
              <button onClick={() => setUploadedFile(null)} style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer", fontSize: 16 }}>×</button>
            </div>
          )}

          {/* Input */}
          <div style={{ padding: "12px 24px 20px", flexShrink: 0 }}>
            <div style={{
              background: "rgba(255,255,255,0.05)",
              border: `1px solid ${loading ? modeColor + "60" : "rgba(255,255,255,0.1)"}`,
              borderRadius: 16, padding: "12px 14px",
              display: "flex", alignItems: "flex-end", gap: 10,
              transition: "border-color 0.2s",
              boxShadow: loading ? `0 0 20px ${modeColor}20` : "none"
            }}>
              {/* File upload */}
              <button onClick={() => fileRef.current?.click()} style={{
                background: "transparent", border: "none", cursor: "pointer",
                color: uploadedFile ? modeColor : "rgba(255,255,255,0.3)",
                fontSize: 18, padding: "4px", flexShrink: 0
              }}>📎</button>
              <input ref={fileRef} type="file" style={{ display: "none" }} onChange={handleFileUpload}
                accept=".pdf,.docx,.doc,.png,.jpg,.jpeg,.gif,.webp" />

              <textarea ref={textareaRef}
                value={input}
                onChange={e => { setInput(e.target.value); e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 140) + "px"; }}
                onKeyDown={handleKey}
                placeholder={`${MODES[mode]?.icon} ${
                  mode === "ppt" ? "Kisi bhi topic par PPT banvao..." :
                  mode === "image" ? "Image ke baare mein kuch poochho..." :
                  mode === "doc" ? "Document upload karo aur summarize karwao..." :
                  "Kuch bhi poochho Utkarsh AI se..."
                }`}
                style={{
                  flex: 1, background: "transparent", border: "none", color: "#e8e8f0",
                  fontSize: 14.5, lineHeight: 1.6, fontFamily: "'Sora', sans-serif",
                  minHeight: 24, maxHeight: 140, overflowY: "auto"
                }}
                rows={1}
              />

              <button className="send-btn" onClick={sendMessage} disabled={loading} style={{
                width: 38, height: 38, borderRadius: "50%", flexShrink: 0,
                background: loading ? "rgba(124,58,237,0.3)" : `linear-gradient(135deg,${modeColor},${modeColor}cc)`,
                border: "none", cursor: loading ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.15s", fontSize: 16
              }}>
                {loading ? "⏳" : "➤"}
              </button>
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", textAlign: "center", marginTop: 8 }}>
              Enter = Send • Shift+Enter = New line • 📎 = Upload file
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
