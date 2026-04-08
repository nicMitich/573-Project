
import { useState, useEffect } from "react"

const API_BASE = import.meta.env.MODE === "development"
  ? ""
  : import.meta.env.VITE_API_BASE_URL || "http://localhost:5000"


export default function Neo4jPage() {
  const [connected, setConnected] = useState(null)
  const [schema, setSchema] = useState(null)
  const [sampleData, setSampleData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  const checkConnection = async () => {
    setLoading(true)
    setError("")
    try {
      const res = await fetch(`${API_BASE}/neo4j/connect`)
      const data = await res.json()
      if (data.connected) {
        setConnected(true)
        setMessage("Successfully connected to Neo4j!")
      } else {
        setConnected(false)
        setError("Connection failed")
      }
    } catch (err) {
      setConnected(false)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const loadSchema = async () => {
    setLoading(true)
    setError("")
    try {
      const res = await fetch(`${API_BASE}/neo4j/schema`)
      const data = await res.json()
      if (data.error) {
        setError(data.error)
      } else {
        setSchema(data)
        setMessage("Schema loaded successfully")
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const loadSampleData = async () => {
    setLoading(true)
    setError("")
    try {
      const res = await fetch(`${API_BASE}/neo4j/sample-data`)
      const data = await res.json()
      if (data.error) {
        setError(data.error)
      } else {
        setSampleData(data)
        setMessage("Sample data loaded")
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    checkConnection()
  }, [])

  return (
    <div className="page">
      <p className="page-label">02 — Graph DB</p>
      <h1 className="page-title">Graph Database</h1>
      <p className="page-desc">
        Explore relationships between jobs, skills, and companies stored in Neo4j.
        Find skill gaps, related roles, and career path connections.
      </p>

      <hr className="divider" />

      <div className="placeholder">
        Neo4j graph explorer — implementation coming sooooooon
      </div>

      {/* Actions */}
      <div className="section">
        <h2>Database Operations</h2>
        <div className="button-group">
          <button onClick={loadSchema} disabled={loading || !connected} className="btn">
            Load Schema
          </button>
          <button onClick={loadSampleData} disabled={loading || !connected} className="btn">
            View Sample Data
          </button>
        </div>
      </div>

      {/* Schema Display */}
      {schema && (
        <div className="section">
          <h2>Database Schema</h2>
          
          <div className="schema-block">
            <h3>Node Labels</h3>
            <div className="tags">
              {schema.node_labels && schema.node_labels.length > 0 ? (
                schema.node_labels.map(label => (
                  <span key={label} className="tag">{label}</span>
                ))
              ) : (
                <p className="empty">No node labels found</p>
              )}
            </div>
          </div>

          <div className="schema-block">
            <h3>Relationship Types</h3>
            <div className="tags">
              {schema.relationship_types && schema.relationship_types.length > 0 ? (
                schema.relationship_types.map(rel => (
                  <span key={rel} className="tag tag-rel">{rel}</span>
                ))
              ) : (
                <p className="empty">No relationship types found</p>
              )}
            </div>
          </div>

          <div className="schema-block">
            <h3>Node Properties</h3>
            {schema.node_properties && Object.keys(schema.node_properties).length > 0 ? (
              Object.entries(schema.node_properties).map(([label, props]) => (
                <div key={label} className="prop-group">
                  <strong>{label}:</strong> {props.join(", ")}
                </div>
              ))
            ) : (
              <p className="empty">No node properties found</p>
            )}
          </div>

          <div className="schema-block">
            <h3>Relationship Properties</h3>
            {schema.relationship_properties && Object.keys(schema.relationship_properties).length > 0 ? (
              Object.entries(schema.relationship_properties).map(([rel, props]) => (
                <div key={rel} className="prop-group">
                  <strong>{rel}:</strong> {props.join(", ")}
                </div>
              ))
            ) : (
              <p className="empty">No relationship properties found</p>
            )}
          </div>
        </div>
      )}

      {/* Sample Data Display */}
      {sampleData && (
        <div className="section">
          <h2>Sample Data</h2>
          
          {Object.entries(sampleData).map(([key, data]) => {
            if (key === 'relationships') {
              return (
                <div key={key} className="data-block">
                  <h3>Sample Relationships</h3>
                  <div className="relationship-list">
                    {data.length === 0 ? (
                      <p className="empty">No relationships found</p>
                    ) : (
                      data.map((rel, idx) => (
                        <div key={idx} className="relationship-item">
                          <code>{JSON.stringify(rel.from)}</code>
                          <span className="arrow"> → </span>
                          <span className="rel-type">{rel.relationship}</span>
                          <span className="arrow"> → </span>
                          <code>{JSON.stringify(rel.to)}</code>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )
            }
            return (
              <div key={key} className="data-block">
                <h3>Sample {key} (Limit 5)</h3>
                <div className="node-list">
                  {data.length === 0 ? (
                    <p className="empty">No {key} found</p>
                  ) : (
                    data.map((item, idx) => (
                      <pre key={idx} className="node-item">
                        {JSON.stringify(item, null, 2)}
                      </pre>
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
