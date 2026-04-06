import { useState, useRef, useEffect } from "react"

const CARD_NAMES = ["Job Compatibility", "Skill Growth", "Resume Enhancer"]

const CARD_PROMPTS = [
  "I've uploaded my resume. Please match me with the top 10 most compatible job roles based on my skills and experience.",
  "I've uploaded my resume. Based on my current skills and experience, what should I learn or improve to reach my dream role?",
  "I've uploaded my resume. Please review it thoroughly and suggest improvements — rewrites, stronger language, ATS keywords, etc.",
]

const GEN_PROMPTS = [
  "I don't have a resume yet. Please help me build one from scratch for job matching — ask me questions about my experience, skills, and target roles.",
  "I don't have a resume yet. Please help me create one focused on long-term skill growth — ask me about my background and where I want to be.",
  "I don't have a resume yet. Please help me write a strong resume from scratch — start by asking about my work history and skills.",
]

export default function ChatPage({ navigate }) {
  const cardIdx     = parseInt(sessionStorage.getItem("selectedCard") ?? "0")
  const isGenMode   = sessionStorage.getItem("generateMode") === "true"
  const resumeName  = sessionStorage.getItem("resumeFileName") || "your resume"

  const modeName    = CARD_NAMES[cardIdx] ?? "Assistant"
  const prePrompt   = isGenMode ? GEN_PROMPTS[cardIdx] : CARD_PROMPTS[cardIdx]
  const greeting    = isGenMode
    ? "No resume? No problem! I'll help you build one. Feel free to edit the message below or just hit Send."
    : `Hi! I've received ${resumeName}. Feel free to edit the pre-filled message or just hit Send to get started.`

  const [theme, setTheme]       = useState(() => sessionStorage.getItem("theme") || "dark")
  const [messages, setMessages] = useState([{ role: "assistant", content: greeting }])
  const [input, setInput]       = useState(prePrompt)
  const [loading, setLoading]   = useState(false)
  const messagesEndRef          = useRef(null)
  const textareaRef             = useRef(null)

  // Apply theme to <html> whenever it changes
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme)
    sessionStorage.setItem("theme", theme)
  }, [theme])

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = Math.min(el.scrollHeight, 180) + "px"
  }, [input])

  const handleBack = () => {
    sessionStorage.removeItem("generateMode")
    navigate("landing")
  }

  const toggleTheme = () => {
    setTheme(t => t === "dark" ? "light" : "dark")
  }

  const sendMessage = async () => {
    const text = input.trim()
    if (!text || loading) return

    const userMsg = { role: "user", content: text }
    const updated = [...messages, userMsg]
    setMessages(updated)
    setInput("")
    setLoading(true)

    /*try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${import.meta.env.VITE_OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          models: ["openrouter/auto"],
          messages: [
            {
              role: "system",
              content:
                "You are a helpful job and career assistant. You help users with resume feedback, job searching, career advice, and interview preparation. Be concise and practical.",
            },
            ...updated,
          ],
        }),
      })*/
      try {
        const resumeRaw = sessionStorage.getItem("resumeData")
        const resume = resumeRaw ? JSON.parse(resumeRaw) : null
        const resumeContext = resume ? `
      The user has uploaded their resume. Here is the parsed content:
      - Name: ${resume.name || "N/A"}
      - Email: ${resume.email || "N/A"}
      - Phone: ${resume.phone || "N/A"}
      - Skills: ${resume.skills?.join(", ") || "N/A"}
      - Education: ${resume.education?.join(" | ") || "N/A"}
      - Experience: ${resume.experience?.join(" | ") || "N/A"}
      - Projects: ${resume.projects?.join(" | ") || "N/A"}
      ` : "No resume has been uploaded."

        const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${import.meta.env.VITE_OPENROUTER_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            models: ["openrouter/auto"],
            messages: [
              {
                role: "system",
                content: `You are a helpful job and career assistant. You help users with resume feedback, job searching, career advice, and interview preparation. Be concise and practical.\n\n${resumeContext}`,
              },
              ...updated,
            ],
          }),
        })
      const data = await res.json()
      const reply = data.choices?.[0]?.message?.content || "Sorry, I couldn't get a response."
      setMessages(prev => [...prev, { role: "assistant", content: reply }])
    } catch (err) {
      console.error(err)
      setMessages(prev => [...prev, { role: "assistant", content: "Error: Failed to reach the API. Check your key and try again." }])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div style={s.root}>
      {/* Corner lines */}
      <div style={s.corners} aria-hidden="true">
        {["tl","tr","bl","br"].map(pos => (
          <svg key={pos} style={{...s.corner, ...s[`corner_${pos}`]}} viewBox="0 0 260 260" fill="none">
            <line x1="0" y1="60"  x2="60"  y2="0"  stroke="var(--lp-accent)" strokeWidth="1" style={{animation:"lpLineFade 4s ease-in-out 0s infinite"}}/>
            <line x1="0" y1="110" x2="110" y2="0"  stroke="var(--lp-accent)" strokeWidth="1" style={{animation:"lpLineFade 4s ease-in-out 0.5s infinite"}}/>
            <line x1="0" y1="160" x2="160" y2="0"  stroke="var(--lp-accent)" strokeWidth="1" style={{animation:"lpLineFade 4s ease-in-out 1s infinite"}}/>
            <line x1="0" y1="210" x2="210" y2="0"  stroke="var(--lp-accent)" strokeWidth="1" style={{animation:"lpLineFade 4s ease-in-out 1.5s infinite"}}/>
          </svg>
        ))}
      </div>

      {/* Topbar */}
      <div style={s.topbar}>
        <div style={s.topbarLeft}>
          <button style={s.backBtn} onClick={handleBack}>← Back</button>
          <span style={s.topbarTitle}>AI Job Assistant</span>
        </div>
        <div style={s.topbarCenter}>
          <span style={s.modePill}>{isGenMode ? `${modeName} · Building Resume` : modeName}</span>
        </div>
        <div style={s.topbarRight}>
          <div style={s.toggleWrap} onClick={toggleTheme} title="Toggle light/dark">
            <div style={s.toggleTrack}>
              <div style={{...s.toggleThumb, ...(theme === "light" ? s.toggleThumbLight : {})}}>
                {theme === "dark" ? "🌙" : "☀️"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chat body */}
      <div style={s.body}>
        <div style={s.window}>
          {messages.map((msg, i) => (
            <div key={i} style={{...s.message, ...(msg.role === "user" ? s.messageUser : {})}}>
              <div style={{...s.avatar, ...(msg.role === "user" ? s.avatarUser : s.avatarBot)}}>
                {msg.role === "user" ? "You" : "AI"}
              </div>
              <div style={{...s.bubble, ...(msg.role === "user" ? s.bubbleUser : s.bubbleBot)}}>
                {msg.content}
              </div>
            </div>
          ))}
          {loading && (
            <div style={s.message}>
              <div style={{...s.avatar, ...s.avatarBot}}>AI</div>
              <div style={{...s.bubble, ...s.bubbleBot, opacity: 0.5}}>Thinking…</div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div style={s.inputArea}>
          <textarea
            ref={textareaRef}
            style={s.textarea}
            rows={1}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything about your career…"
          />
          <button
            style={{...s.sendBtn, opacity: loading || !input.trim() ? 0.5 : 1}}
            onClick={sendMessage}
            disabled={loading || !input.trim()}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}

const s = {
  root: {
    background: "var(--lp-bg)",
    color: "var(--lp-text)",
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    position: "relative",
    fontFamily: "'DM Sans', system-ui, sans-serif",
    transition: "background 0.4s, color 0.4s",
  },
  corners: { position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0 },
  corner:  { position: "absolute", width: 260, height: 260 },
  corner_tl: { top: 0, left: 0 },
  corner_tr: { top: 0, right: 0, transform: "scaleX(-1)" },
  corner_bl: { bottom: 0, left: 0, transform: "scaleY(-1)" },
  corner_br: { bottom: 0, right: 0, transform: "scale(-1)" },

  topbar: {
    display: "grid",
    gridTemplateColumns: "1fr auto 1fr",
    alignItems: "center",
    padding: "14px 28px",
    borderBottom: "1px solid var(--lp-card-border)",
    background: "var(--lp-bg)",
    flexShrink: 0,
    position: "relative",
    zIndex: 2,
  },
  topbarLeft:   { display: "flex", alignItems: "center", gap: 12 },
  topbarCenter: { display: "flex", justifyContent: "center" },
  topbarRight:  { display: "flex", justifyContent: "flex-end" },

  backBtn: {
    background: "none",
    border: "1.5px solid var(--lp-card-border)",
    borderRadius: 999,
    color: "var(--lp-text)",
    fontFamily: "inherit",
    fontSize: "0.85rem",
    fontWeight: 600,
    padding: "7px 16px",
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  topbarTitle: {
    fontFamily: "'Playfair Display', Georgia, serif",
    fontSize: "1.05rem",
    fontWeight: 700,
    color: "var(--lp-text)",
    whiteSpace: "nowrap",
  },
  modePill: {
    fontSize: "0.78rem",
    color: "var(--lp-muted)",
    background: "var(--lp-card-bg)",
    border: "1px solid var(--lp-card-border)",
    borderRadius: 999,
    padding: "5px 14px",
    whiteSpace: "nowrap",
  },
  toggleWrap:  { cursor: "pointer", userSelect: "none" },
  toggleTrack: {
    width: 44, height: 24,
    background: "var(--lp-toggle-track)",
    border: "1.5px solid var(--lp-accent)",
    borderRadius: 999,
    position: "relative",
  },
  toggleThumb: {
    position: "absolute", top: 2, left: 2,
    width: 18, height: 18,
    borderRadius: "50%",
    background: "var(--lp-accent)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 10,
    transition: "transform 0.3s cubic-bezier(.4,0,.2,1)",
  },
  toggleThumbLight: { transform: "translateX(20px)" },

  body: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    maxWidth: 820,
    width: "100%",
    margin: "0 auto",
    padding: "24px 24px 0",
    minHeight: 0,
    position: "relative",
    zIndex: 1,
  },
  window: {
    flex: 1,
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: 14,
    paddingBottom: 12,
  },
  message: { display: "flex", alignItems: "flex-end", gap: 10 },
  messageUser: { flexDirection: "row-reverse" },
  avatar: {
    width: 34, height: 34, borderRadius: "50%",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: "0.72rem", fontWeight: 700, flexShrink: 0,
  },
  avatarBot:  { background: "var(--lp-accent)", color: "var(--lp-bg)" },
  avatarUser: { background: "var(--lp-card-bg)", border: "1.5px solid var(--lp-card-border)", color: "var(--lp-text)" },
  bubble: {
    maxWidth: "72%", padding: "12px 16px",
    borderRadius: 18, fontSize: "0.9rem", lineHeight: 1.55,
    whiteSpace: "pre-wrap",
  },
  bubbleBot:  { background: "var(--lp-card-bg)", border: "1px solid var(--lp-card-border)", borderBottomLeftRadius: 4, color: "var(--lp-text)" },
  bubbleUser: { background: "var(--lp-accent)", color: "var(--lp-bg)", borderBottomRightRadius: 4, fontWeight: 500 },

  inputArea: {
    padding: "16px 0 24px",
    display: "flex", gap: 10, alignItems: "flex-end", flexShrink: 0,
  },
  textarea: {
    flex: 1,
    padding: "13px 18px",
    borderRadius: 20,
    border: "1.5px solid var(--lp-card-border)",
    background: "var(--lp-input-bg)",
    color: "var(--lp-text)",
    fontFamily: "inherit",
    fontSize: "0.9rem",
    outline: "none",
    resize: "none",
    overflowY: "hidden",
    lineHeight: 1.5,
    minHeight: 48,
    maxHeight: 180,
    display: "block",
    transition: "border-color 0.2s",
  },
  sendBtn: {
    padding: "13px 24px",
    borderRadius: 999,
    border: "none",
    background: "var(--lp-accent)",
    color: "var(--lp-bg)",
    fontFamily: "inherit",
    fontSize: "0.9rem",
    fontWeight: 700,
    cursor: "pointer",
    flexShrink: 0,
    transition: "opacity 0.2s",
  },
}
