import { useState, useRef, useEffect } from "react"

const API_BASE = (import.meta.env.MODE === 'development'
  ? ''
  : (import.meta.env.VITE_API_BASE_URL || '')).replace(/\/$/, '')

export default function ChatPage() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const sendMessage = async () => {
    const text = input.trim()
    if (!text || loading) return

    const userMsg = { role: "user", content: text }
    const updated = [...messages, userMsg]
    setMessages(updated)
    setInput("")
    setLoading(true)

    try {
      const res = await fetch(`${API_BASE}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: text,
          history: messages.map(msg => ({
            role: msg.role,
            content: msg.content
          }))
        }),
      })

      if (!res.ok) {
        const errorText = await res.text()
        throw new Error(`API returned ${res.status}: ${errorText}`)
      }

      const data = await res.json()
      console.log("API response:", data)
      
      if (data.error) {
        throw new Error(data.error)
      }
      
      const reply = data.response || "Sorry, I couldn't get a response."
      setMessages((prev) => [...prev, { role: "assistant", content: reply }])
    } catch (err) {
      console.error(err)
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Error: ${err.message || "Failed to reach the API. Please try again."}` },
      ])
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
    <div className="page">
      <p className="page-label">01 — Chat</p>
      <h1 className="page-title">Job Assistant</h1>
      <p className="page-desc">
        Ask questions about jobs, get resume feedback, and explore career paths
        through a conversational interface powered by LangGraph.
      </p>

      <hr className="divider" />

      <div style={styles.chatContainer}>
        <div style={styles.messages}>
          {messages.length === 0 && (
            <p style={styles.empty}>Send a message to start the conversation.</p>
          )}
          {messages.map((msg, i) => (
            <div
              key={i}
              style={{
                ...styles.bubble,
                ...(msg.role === "user" ? styles.userBubble : styles.assistantBubble),
              }}
            >
              <span style={styles.roleLabel}>
                {msg.role === "user" ? "You" : "Assistant"}
              </span>
              <p style={styles.msgText}>{msg.content}</p>
            </div>
          ))}
          {loading && (
            <div style={{ ...styles.bubble, ...styles.assistantBubble }}>
              <span style={styles.roleLabel}>Assistant</span>
              <p style={styles.msgText}>Thinking...</p>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div style={styles.inputRow}>
          <textarea
            style={styles.textarea}
            rows={1}
            placeholder="Ask about jobs, resumes, interviews..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button
            style={{
              ...styles.sendBtn,
              opacity: loading || !input.trim() ? 0.5 : 1,
            }}
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

const styles = {
  chatContainer: {
    display: "flex",
    flexDirection: "column",
    height: "60vh",
    border: "1px solid #333",
    borderRadius: "12px",
    overflow: "hidden",
    background: "#111",
  },
  messages: {
    flex: 1,
    overflowY: "auto",
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  empty: {
    color: "#666",
    textAlign: "center",
    marginTop: "40px",
  },
  bubble: {
    maxWidth: "75%",
    padding: "12px 16px",
    borderRadius: "12px",
    wordWrap: "break-word",
  },
  userBubble: {
    alignSelf: "flex-end",
    background: "#2563eb",
    color: "#fff",
  },
  assistantBubble: {
    alignSelf: "flex-start",
    background: "#222",
    color: "#ddd",
    border: "1px solid #333",
  },
  roleLabel: {
    fontSize: "11px",
    fontWeight: 600,
    opacity: 0.6,
    display: "block",
    marginBottom: "4px",
  },
  msgText: {
    margin: 0,
    lineHeight: 1.5,
    whiteSpace: "pre-wrap",
  },
  inputRow: {
    display: "flex",
    gap: "8px",
    padding: "12px",
    borderTop: "1px solid #333",
    background: "#0a0a0a",
  },
  textarea: {
    flex: 1,
    padding: "10px 14px",
    borderRadius: "8px",
    border: "1px solid #333",
    background: "#1a1a1a",
    color: "#fff",
    fontSize: "14px",
    fontFamily: "inherit",
    resize: "none",
    outline: "none",
  },
  sendBtn: {
    padding: "10px 20px",
    borderRadius: "8px",
    border: "none",
    background: "#2563eb",
    color: "#fff",
    fontWeight: 600,
    cursor: "pointer",
    fontSize: "14px",
  },
}