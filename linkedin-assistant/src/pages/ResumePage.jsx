import { useState } from 'react'
import '../App.css'

export default function ResumePage() {
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setLoading(true)
    setError(null)
    setResult(null)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('http://localhost:5000/parse-resume', {
        method: 'POST',
        body: formData
      })
      const data = await res.json()
      setResult(data)
    } catch (err) {
      setError('Failed to parse resume.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '2rem', color: 'white' }}>
      <p style={{ color: '#aaa', fontSize: '0.75rem' }}>03 — RESUME</p>
      <h1>Resume Builder</h1>
      <p style={{ color: '#aaa' }}>Create and optimize your resume with AI-powered suggestions and feedback.</p>
      <hr style={{ borderColor: '#333', margin: '1.5rem 0' }} />

      <label style={{
        display: 'inline-block', padding: '0.6rem 1.2rem',
        border: '1px dashed #555', borderRadius: '4px',
        cursor: 'pointer', color: '#aaa'
      }}>
        {loading ? 'Parsing...' : '+ Upload Resume (PDF, DOCX, TXT)'}
        <input type="file" accept=".pdf,.docx,.txt" onChange={handleUpload}
          style={{ display: 'none' }} disabled={loading} />
      </label>

      {error && <p style={{ color: 'red', marginTop: '1rem' }}>{error}</p>}

      {result && (
        <div style={{ marginTop: '2rem' }}>
          <Section title="Name" content={result.name} />
          <Section title="Email" content={result.email} />
          <Section title="Phone" content={result.phone} />
          <Section title="Skills" content={result.skills?.join(', ')} />
          <Section title="Education" content={result.education} isList />
          <Section title="Experience" content={result.experience} isList />
          <Section title="Projects" content={result.projects} isList />
        </div>
      )}
    </div>
  )
}

function Section({ title, content, isList }) {
  if (!content || (Array.isArray(content) && content.length === 0)) return null
  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <h3 style={{ color: '#cefe00', marginBottom: '0.4rem' }}>{title}</h3>
      {isList
        ? <ul style={{ color: '#ccc', paddingLeft: '1.2rem' }}>
            {content.map((item, i) => <li key={i}>{item}</li>)}
          </ul>
        : <p style={{ color: '#ccc' }}>{content}</p>
      }
    </div>
  )
}