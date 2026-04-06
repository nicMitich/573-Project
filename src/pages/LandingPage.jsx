import { useState, useEffect } from "react"
import "./LandingPage.css"

export default function LandingPage({ navigate }) {
  const [theme, setTheme] = useState(() => sessionStorage.getItem("theme") || "dark")
  const [selectedCard, setSelectedCard] = useState(() => {
    const s = sessionStorage.getItem("selectedCard")
    return s !== null ? parseInt(s) : null
  })
  //const [resumeParsed, setResumeParsed] = useState(false)
  const [resumeParsed, setResumeParsed] = useState(() => {
  // On a fresh page load (not coming back from chat), clear everything
    if (sessionStorage.getItem("cameFromChat") !== "true") {
      sessionStorage.removeItem("resumeData")
      sessionStorage.removeItem("resumeFileName")
      sessionStorage.removeItem("resumeParsed")
      return false
    }
    return sessionStorage.getItem("resumeParsed") === "true"
  })
  
  //const [status, setStatus] = useState(null) // null | "parsing" | "success" | "error"
  const [status, setStatus] = useState(
  () => sessionStorage.getItem("cameFromChat") === "true" && 
        sessionStorage.getItem("resumeParsed") === "true" ? "saved" : null
  )
  const [statusMsg, setStatusMsg] = useState("")

  // Apply theme to <html>
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme)
    sessionStorage.setItem("theme", theme)
  }, [theme])

  const toggleTheme = () => setTheme(t => t === "dark" ? "light" : "dark")

  const CARDS = [
    {
      icon: "🎯",
      title: "Job Compatibility",
      desc: "Upload your resume and we'll match you with your top 10 most compatible open roles based on your actual skills and experience.",
    },
    {
      icon: "📈",
      title: "Long-Term Skill Growth",
      desc: "Get personalized recommendations on what to learn, add, or change in your profile to land your dream role within your target timeline.",
    },
    {
      icon: "📄",
      title: "Resume Enhancer",
      desc: "Have AI review your resume line-by-line and suggest impactful rewrites, stronger action verbs, and missing keywords for ATS systems.",
    },
  ]

  const UPLOAD_TITLES = [
    "Upload your resume for job matching",
    "Upload your resume for skill analysis",
    "Upload your resume for review",
  ]

  const handleCardClick = (i) => {
    if (selectedCard === i) {
      setSelectedCard(null)
      sessionStorage.removeItem("selectedCard")
    } else {
      setSelectedCard(i)
      sessionStorage.setItem("selectedCard", i)
    }
  }

  /* const handleFile = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const allowed = [".pdf", ".doc", ".docx", ".txt"]
    const ext = "." + file.name.split(".").pop().toLowerCase()
    if (!allowed.includes(ext)) {
      setStatus("error")
      setStatusMsg("Unsupported file type. Use PDF, DOCX, or TXT.")
      sessionStorage.removeItem("resumeParsed")
      setResumeParsed(false)
      return
    }
    setStatus("parsing")
    setStatusMsg("Parsing…")
    const reader = new FileReader()
    reader.onload = (ev) => {
      sessionStorage.setItem("resumeFileName", file.name)
      sessionStorage.setItem("resumeText", ext === ".txt" ? ev.target.result : `[Resume: ${file.name}]`)
      sessionStorage.setItem("resumeParsed", "true")
      setTimeout(() => {
        setStatus("success")
        setStatusMsg("Parsed successfully!")
        setResumeParsed(true)
      }, 600)
    }
    reader.onerror = () => {
      setStatus("error")
      setStatusMsg("Could not parse. Please try again.")
      sessionStorage.removeItem("resumeParsed")
      setResumeParsed(false)
    }
    reader.readAsText(file)
  }  */

  const handleFile = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    const allowed = [".pdf", ".doc", ".docx", ".txt"]
    const ext = "." + file.name.split(".").pop().toLowerCase()
    if (!allowed.includes(ext)) {
      setStatus("error")
      setStatusMsg("Unsupported file type. Use PDF, DOCX, or TXT.")
      setResumeParsed(false)
      return
    }

    // Clear any previously stored resume data before parsing new file
    sessionStorage.removeItem("resumeData")
    sessionStorage.removeItem("resumeFileName")
    sessionStorage.removeItem("resumeParsed")
    sessionStorage.removeItem("cameFromChat")
    setResumeParsed(false)

    setStatus("parsing")
    setStatusMsg("Parsing…")

    const formData = new FormData()
    formData.append("file", file)

    try {
      const res = await fetch("https://linkedin-assistant-dm1u.onrender.com/parse-resume", {
        method: "POST",
        body: formData,
      })
      const data = await res.json()

      sessionStorage.setItem("resumeFileName", file.name)
      sessionStorage.setItem("resumeParsed", "true")
      sessionStorage.setItem("resumeData", JSON.stringify(data))
      sessionStorage.removeItem("cameFromChat")

      setStatus("success")
      setStatusMsg("Parsed successfully!")
      setResumeParsed(true)
    } catch (err) {
      setStatus("error")
      setStatusMsg("Could not parse. Please try again.")
      setResumeParsed(false)
    }
  }

  const handleGenerate = () => {
    sessionStorage.setItem("resumeFileName", "generated resume")
    sessionStorage.setItem("resumeText", "")
    sessionStorage.setItem("resumeParsed", "true")
    sessionStorage.setItem("generateMode", "true")
    sessionStorage.setItem("selectedCard", selectedCard ?? 0)
    navigate("chat")
  }

  const handleContinue = () => {
    sessionStorage.setItem("selectedCard", selectedCard)
    sessionStorage.removeItem("generateMode")
    navigate("chat")
  }

  return (
    <div className="lp-root">
      {/* Corner lines */}
      <div className="lp-corners" aria-hidden="true">
        {["tl","tr","bl","br"].map(pos => (
          <svg key={pos} className={`lp-corner lp-corner--${pos}`} viewBox="0 0 260 260" fill="none" xmlns="http://www.w3.org/2000/svg">
            <line x1="0" y1="60"  x2="60"  y2="0"/>
            <line x1="0" y1="110" x2="110" y2="0"/>
            <line x1="0" y1="160" x2="160" y2="0"/>
            <line x1="0" y1="210" x2="210" y2="0"/>
          </svg>
        ))}
      </div>

      {/* Theme toggle */}
      <div className="lp-toggle" onClick={toggleTheme} title="Toggle light/dark mode">
        <span className="lp-toggle__label">{theme === "dark" ? "Dark" : "Light"}</span>
        <div className="lp-toggle__track">
          <div className="lp-toggle__thumb">{theme === "dark" ? "🌙" : "☀️"}</div>
        </div>
      </div>

      <div className="lp-content">
        {/* Hero */}
        <div className="lp-hero">
          <p className="lp-eyebrow">✦ Your Personal Job Board AI</p>
          <h1 className="lp-heading">Welcome, <span>let's build<br/>your future.</span></h1>
          <p className="lp-sub">Upload your resume and let AI match you with opportunities, sharpen your skills, and craft the perfect application.</p>
        </div>

        <p className="lp-choose">You'll be able to — <strong>choose one to get started:</strong></p>

        {/* Cards */}
        <div className="lp-cards">
          {CARDS.map((card, i) => (
            <div
              key={i}
              className={`lp-card ${selectedCard === i ? "lp-card--selected" : ""}`}
              onClick={() => handleCardClick(i)}
            >
              <div className="lp-card__icon">{card.icon}</div>
              <h3 className="lp-card__title">{card.title}</h3>
              <p className="lp-card__desc">{card.desc}</p>
              <div className="lp-card__select-row">
                <div className={`lp-card__checkbox ${selectedCard === i ? "lp-card__checkbox--checked" : ""}`}>
                  {selectedCard === i && "✓"}
                </div>
                <span className="lp-card__select-label">
                  {selectedCard === i ? "Selected" : "Select this"}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Upload panel */}
        {selectedCard !== null && (
          <div className="lp-upload">
            <div className="lp-upload__box">
              <h4 className="lp-upload__title">{UPLOAD_TITLES[selectedCard]}</h4>
              <p className="lp-upload__sub">We'll parse it and use it to personalize your experience. Supported: PDF, DOCX, TXT.</p>

              <div className="lp-upload__row">
                <label className="lp-upload__btn">
                  📎 Choose File
                  <input type="file" accept=".pdf,.doc,.docx,.txt" onChange={handleFile} hidden />
                </label>
                {status === "parsing" && <span className="lp-badge lp-badge--info">⏳ {statusMsg}</span>}
                {status === "success" && <span className="lp-badge lp-badge--success">✓ {statusMsg}</span>}
                {status === "error"   && <span className="lp-badge lp-badge--error">✗ {statusMsg}</span>}
                {status === "saved"   && <span className="lp-badge lp-badge--info">📎 File saved — {sessionStorage.getItem("resumeFileName")}</span>}
              </div>

              <div className="lp-divider"><span>or</span></div>

              <div className="lp-gen-row">
                <button className="lp-gen-btn" onClick={handleGenerate}>
                  I don't have a resume — help me generate one →
                </button>
              </div>

              {resumeParsed && (
                <div className="lp-continue-row">
                  <button className="lp-continue-btn" onClick={handleContinue}>
                    Continue →
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
