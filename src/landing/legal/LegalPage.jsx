// src/pages/Legal/LegalPage.jsx
import { createElement, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import { supabaseFetch } from '../../config/supabase'
import Footer from '../sections/Footer'
import './Legal.css'

const slugify = str =>
  String(str)
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')

const textOf = node => {
  if (typeof node === 'string') return node
  if (Array.isArray(node)) return node.map(textOf).join('')
  if (node?.props?.children) return textOf(node.props.children)
  return ''
}

const heading = tag => ({ children }) => createElement(tag, { id: slugify(textOf(children)) }, children)

const mdComponents = {
  h1: heading('h1'),
  h2: heading('h2'),
  h3: heading('h3'),
  h4: heading('h4'),
}

export default function LegalPage({ domain, slug }) {
  const [result, setResult] = useState(null)
  const key = `${domain}/${slug}`
  const current = result?.key === key ? result : null
  const doc = current?.doc
  const error = current?.error
  const { hash } = useLocation()

  useEffect(() => {
    let active = true
    supabaseFetch(
      `legal_documents?domain=eq.${domain}&slug=eq.${slug}&select=title,body_markdown,version,effective_date`
    )
      .then(rows => { if (active) setResult({ key, doc: rows?.[0], error: !rows?.[0] }) })
      .catch(() => { if (active) setResult({ key, error: true }) })
    return () => { active = false }
  }, [domain, slug, key])

  useEffect(() => {
    if (!doc || !hash) return
    const el = document.getElementById(decodeURIComponent(hash.slice(1)))
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [doc, hash])

  return (
    <>
      <div className="legal-content">
        {error ? (
          <p className="text-grey">Failed to load document.</p>
        ) : doc ? (
          <>
            <h1 className="h1">{doc.title}</h1>
            <p className="text-grey">Version {doc.version} · Effective {doc.effective_date}</p>
            <ReactMarkdown components={mdComponents}>{doc.body_markdown}</ReactMarkdown>
          </>
        ) : (
          <div className="legal-loader" />
        )}
      </div>
      <Footer />
    </>
  )
}
