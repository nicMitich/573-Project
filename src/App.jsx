import { useState } from "react"
import LandingPage from "./pages/LandingPage"
import ChatPage from "./pages/ChatPage"
import Neo4jPage from "./pages/Neo4jPage"
import ChromaPage from "./pages/ChromaPage"
import ResumePage from "./pages/ResumePage"
import "./index.css"

export default function App() {
  const [page, setPage] = useState("landing")

  const navigate = (p) => setPage(p)

  const pages = {
    landing: <LandingPage navigate={navigate} />,
    chat:    <ChatPage    navigate={navigate} />,
    neo4j:   <Neo4jPage   navigate={navigate} />,
    chroma:  <ChromaPage  navigate={navigate} />,
    resume:  <ResumePage  navigate={navigate} />,
  }

  return (
    <div className="app">
      {page !== "landing" && page !== "chat" && <Nav current={page} navigate={navigate} />}
      {pages[page]}
    </div>
  )
}

function Nav({ current, navigate }) {
  const links = [
    { id: "chat",   label: "Chat" },
    { id: "neo4j",  label: "Graph DB" },
    { id: "chroma", label: "Vector DB" },
    { id: "resume", label: "Resume" },
  ]

  return (
    <nav className="nav">
      <button className="nav-logo" onClick={() => navigate("landing")}>
        LA
      </button>
      <div className="nav-links">
        {links.map(link => (
          <button
            key={link.id}
            className={`nav-link ${current === link.id ? "active" : ""}`}
            onClick={() => navigate(link.id)}
          >
            {link.label}
          </button>
        ))}
      </div>
    </nav>
  )
}