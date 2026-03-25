import "./LandingPage.css"

export default function LandingPage({ navigate }) {
  const cards = [
    {
      id:    "chat",
      tag:   "01",
      title: "Chat Assistant",
      desc:  "Conversational agent for job search, resume feedback, and career advice.",
    },
    {
      id:    "resume",
      tag:   "02",
      title: "Resume Builder",
      desc:  "Create and optimize your resume with AI-powered suggestions and feedback.",
    },
    {
      id:    "neo4j",
      tag:   "03",
      title: "Graph Database",
      desc:  "Explore jobs, skills, and companies through Neo4j graph relationships.",
    },
    {
      id:    "chroma",
      tag:   "04",
      title: "Vector Search",
      desc:  "Semantic job search and resume matching powered by ChromaDB embeddings.",
    },
  ]

  return (
    <div className="landing">
      <div className="landing-hero">
        <p className="landing-eyebrow">LinkedIn Assistant</p>
        <h1 className="landing-heading">
          Find jobs.<br />Close the gap.
        </h1>
        <p className="landing-sub">
          Upload your resume, search semantically, and explore career paths — 
          all in one place.
        </p>
      </div>

      <div className="landing-cards">
        {cards.map(card => (
          <button
            key={card.id}
            className="landing-card"
            onClick={() => navigate(card.id)}
          >
            <span className="card-tag">{card.tag}</span>
            <span className="card-title">{card.title}</span>
            <span className="card-desc">{card.desc}</span>
            <span className="card-arrow">→</span>
          </button>
        ))}
      </div>
    </div>
  )
}
