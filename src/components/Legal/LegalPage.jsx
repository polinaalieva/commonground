// src/components/Legal/LegalPage.jsx
import { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { supabaseFetch } from '../../config/supabase'
import './Legal.css'

export default function LegalPage({ domain, slug }) {
  const [doc, setDoc] = useState(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    setDoc(null)
    setError(false)
    supabaseFetch(
      `legal_documents?domain=eq.${domain}&slug=eq.${slug}&select=title,body_markdown,version,effective_date`
    )
      .then(rows => setDoc(rows?.[0] ?? null))
      .catch(() => setError(true))
  }, [domain, slug])

  if (error) return <div className="legal-content"><p className="text-grey">Failed to load document.</p></div>
  if (!doc) return null

  return (
    <div className="legal-content">
      <h1 className="h1">{doc.title}</h1>
      <p className="text-grey">Version {doc.version} · Effective {doc.effective_date}</p>
      <ReactMarkdown>{doc.body_markdown}</ReactMarkdown>
    </div>
  )
}