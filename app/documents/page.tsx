'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const BUCKET = 'org-documents'
const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20MB

type DocumentRow = {
  id: string
  file_name: string
  file_path: string
  file_size: number
  uploaded_at: string
}

const monoLabel: React.CSSProperties = {
  fontFamily: 'var(--font-ibm-plex-mono), monospace',
  fontSize: '11.5px',
  fontWeight: '500',
  letterSpacing: '0.06em',
  textTransform: 'uppercase' as const,
  color: 'var(--color-sage)',
  marginBottom: '1.25rem',
}

const monoSm: React.CSSProperties = {
  fontFamily: 'var(--font-ibm-plex-mono), monospace',
  fontSize: '11px',
  fontWeight: '500',
  letterSpacing: '0.01em',
}

const fieldErrorStyle: React.CSSProperties = {
  fontSize: '12.5px',
  color: 'var(--color-error)',
  margin: '0.3rem 0 0',
  fontFamily: 'var(--font-inter), system-ui, sans-serif',
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9.\-_]/g, '_')
}

export default function DocumentsPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(true)
  const [org, setOrg] = useState<{ id: string; name: string } | null>(null)
  const [documents, setDocuments] = useState<DocumentRow[]>([])
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set())
  const [rowError, setRowError] = useState('')

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        router.replace('/login?message=Please+log+in+to+view+your+documents.')
        return
      }

      const { data: orgData } = await supabase
        .from('organisations')
        .select('id, name')
        .eq('owner_id', session.user.id)
        .maybeSingle()

      if (!orgData) {
        router.replace('/')
        return
      }

      setOrg(orgData)

      const { data } = await supabase
        .from('documents')
        .select('id, file_name, file_path, file_size, uploaded_at')
        .eq('organisation_id', orgData.id)
        .order('uploaded_at', { ascending: false })

      setDocuments((data as DocumentRow[]) ?? [])
      setLoading(false)
    }

    load()
  }, [router])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    setFileError('')
    if (file && file.size > MAX_FILE_SIZE) {
      setFileError('File is too large. Maximum size is 20MB.')
      setSelectedFile(null)
      return
    }
    setSelectedFile(file)
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    setUploadError('')

    if (!selectedFile) {
      setFileError('Please choose a file to upload.')
      return
    }
    if (!org) return

    setUploading(true)

    try {
      const path = `${org.id}/${Date.now()}-${sanitizeFileName(selectedFile.name)}`

      const { error: uploadErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, selectedFile)

      if (uploadErr) throw uploadErr

      const { data, error: insertErr } = await supabase
        .from('documents')
        .insert({
          organisation_id: org.id,
          file_name: selectedFile.name,
          file_path: path,
          file_size: selectedFile.size,
        })
        .select('id, file_name, file_path, file_size, uploaded_at')
        .single()

      if (insertErr) {
        // Roll back the uploaded object if we couldn't record its metadata
        await supabase.storage.from(BUCKET).remove([path])
        throw insertErr
      }

      setDocuments(prev => [data as DocumentRow, ...prev])
      setSelectedFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const handleDownload = async (doc: DocumentRow) => {
    setRowError('')
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(doc.file_path, 60)

    if (error || !data) {
      setRowError(`Could not download "${doc.file_name}".`)
      return
    }

    window.open(data.signedUrl, '_blank')
  }

  const handleDelete = async (doc: DocumentRow) => {
    setRowError('')
    setPendingIds(prev => new Set(prev).add(doc.id))
    const previousDocuments = documents
    setDocuments(prev => prev.filter(d => d.id !== doc.id))

    const { error: storageErr } = await supabase.storage.from(BUCKET).remove([doc.file_path])
    const { error: dbErr } = await supabase.from('documents').delete().eq('id', doc.id)

    setPendingIds(prev => {
      const next = new Set(prev)
      next.delete(doc.id)
      return next
    })

    if (storageErr || dbErr) {
      setDocuments(previousDocuments)
      setRowError(`Could not delete "${doc.file_name}".`)
    }
  }

  if (loading) return null

  return (
    <main className="page-wrap" style={{ maxWidth: '680px', margin: '0 auto' }}>
      <a href="/" style={{
        fontSize: '13px',
        color: 'var(--color-sage)',
        textDecoration: 'none',
        fontFamily: 'var(--font-inter), system-ui, sans-serif',
      }}>
        ← Back to board
      </a>

      <h1 style={{
        fontFamily: 'var(--font-space-grotesk), system-ui, sans-serif',
        fontSize: 'clamp(1.6rem, 3.5vw, 2rem)',
        fontWeight: '700',
        letterSpacing: '-0.02em',
        color: 'var(--color-ink)',
        margin: '1.5rem 0 0.2rem',
      }}>
        Documents
      </h1>
      <p style={{
        color: 'var(--color-sage)',
        fontSize: '13px',
        marginBottom: '2.5rem',
        fontFamily: 'var(--font-inter), system-ui, sans-serif',
      }}>
        Private storage for{' '}
        <span style={{ fontWeight: '600', color: 'var(--color-green)' }}>{org?.name}</span>
        {' '}— DBS checks, insurance certificates, policies, and more.
      </p>

      {/* Upload */}
      <section style={{ marginBottom: '3rem' }}>
        <h2 style={monoLabel}>Upload a Document</h2>

        {uploadError && (
          <div role="alert" style={{
            background: 'var(--color-error-bg)',
            color: 'var(--color-error)',
            padding: '0.75rem 1rem',
            borderRadius: '7px',
            marginBottom: '1.25rem',
            fontSize: '14px',
            border: '1px solid var(--color-error-border)',
            fontFamily: 'var(--font-inter), system-ui, sans-serif',
          }}>
            {uploadError}
          </div>
        )}

        <form onSubmit={handleUpload} noValidate>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
            <div>
              <input
                ref={fileInputRef}
                id="file"
                name="file"
                type="file"
                className={`form-input${fileError ? ' form-input--error' : ''}`}
                onChange={handleFileChange}
                style={{ padding: '0.5rem 0.7rem' }}
              />
              {fileError && <p role="alert" style={fieldErrorStyle}>{fileError}</p>}
              <p style={{
                fontSize: '12.5px',
                color: 'var(--color-sage)',
                fontFamily: 'var(--font-inter), system-ui, sans-serif',
                marginTop: '0.4rem',
              }}>
                Maximum file size 20MB.
              </p>
            </div>

            <button
              type="submit"
              disabled={uploading}
              className="btn-primary"
              style={{ width: 'auto', alignSelf: 'flex-start' }}
            >
              {uploading && <span className="spinner-white" />}
              {uploading ? 'Uploading…' : 'Upload document'}
            </button>
          </div>
        </form>
      </section>

      {/* Document list */}
      <section>
        <h2 style={monoLabel}>Your Documents</h2>

        {rowError && (
          <div role="alert" style={{
            background: 'var(--color-error-bg)',
            color: 'var(--color-error)',
            padding: '0.75rem 1rem',
            borderRadius: '7px',
            marginBottom: '1.25rem',
            fontSize: '14px',
            border: '1px solid var(--color-error-border)',
            fontFamily: 'var(--font-inter), system-ui, sans-serif',
          }}>
            {rowError}
          </div>
        )}

        {documents.length === 0 ? (
          <p style={{
            color: 'var(--color-sage)',
            fontSize: '14px',
            fontFamily: 'var(--font-inter), system-ui, sans-serif',
            padding: '1.5rem 0',
          }}>
            No documents uploaded yet. Use the form above to add your first one.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingTop: '8px' }}>
            {documents.map(doc => {
              const isPending = pendingIds.has(doc.id)
              return (
                <div key={doc.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  border: '1px solid var(--color-border)',
                  borderRadius: '10px',
                  padding: '1rem 1.25rem',
                  background: '#fff',
                  opacity: isPending ? 0.6 : 1,
                  transition: 'opacity 0.12s',
                }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{
                      fontSize: '14.5px',
                      fontWeight: '600',
                      color: 'var(--color-ink)',
                      fontFamily: 'var(--font-inter), system-ui, sans-serif',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {doc.file_name}
                    </div>
                    <div style={{ ...monoSm, color: 'var(--color-sage)', marginTop: '2px' }}>
                      {formatFileSize(doc.file_size)} · {new Date(doc.uploaded_at).toLocaleDateString('en-GB')}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                    <button
                      type="button"
                      className="card-action-btn"
                      onClick={() => handleDownload(doc)}
                      disabled={isPending}
                    >
                      Download
                    </button>
                    <button
                      type="button"
                      className="card-action-btn"
                      onClick={() => handleDelete(doc)}
                      disabled={isPending}
                      style={{ color: 'var(--color-error)', borderColor: 'var(--color-error-border)' }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </main>
  )
}
