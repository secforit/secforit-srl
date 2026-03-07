'use client'

import { useState, useRef } from 'react'
import type { ThreatIntelReport } from '@/app/api/threat-intel/route'
import { ThreatIntelReport as ThreatIntelReportDisplay } from '@/components/threat-intel-report'
import { Upload, FileText, AlertTriangle, Loader2, X } from 'lucide-react'

export function ThreatIntelUpload() {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [report, setReport] = useState<ThreatIntelReport | null>(null)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (f?.type === 'application/pdf') {
      setFile(f)
      setReport(null)
      setError(null)
    }
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) {
      setFile(f)
      setReport(null)
      setError(null)
    }
  }

  async function handleSubmit() {
    if (!file) return
    setLoading(true)
    setError(null)
    setReport(null)
    try {
      const fd = new FormData()
      fd.append('pdf', file)
      const res = await fetch('/api/threat-intel', { method: 'POST', body: fd })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? `HTTP ${res.status}`)
      }
      // Read SSE stream
      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let buf = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        const parts = buf.split('\n\n')
        buf = parts.pop() ?? ''
        for (const part of parts) {
          const eventLine = part.match(/^event: (\w+)/)?.[1]
          const dataLine = part.match(/^data: (.+)$/m)?.[1]
          if (!eventLine || !dataLine) continue
          if (eventLine === 'result') {
            const { report } = JSON.parse(dataLine)
            setReport(report)
          } else if (eventLine === 'error') {
            const { error } = JSON.parse(dataLine)
            throw new Error(error)
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate intelligence')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Upload area */}
      {!report && (
        <div
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          className="rounded-xl border-2 border-dashed border-border bg-card p-12 text-center transition-colors hover:border-primary/50 hover:bg-primary/5 cursor-pointer"
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={handleFile}
          />
          {file ? (
            <div className="flex flex-col items-center gap-3">
              <FileText className="size-10 text-primary" />
              <p className="text-sm font-semibold text-foreground">{file.name}</p>
              <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              <button
                onClick={e => { e.stopPropagation(); setFile(null) }}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                <X className="size-3.5" />
                Remove
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <Upload className="size-10 text-muted-foreground" />
              <p className="text-sm font-semibold text-foreground">Drop a PDF here or click to browse</p>
              <p className="text-xs text-muted-foreground">Vulnerability advisories, research papers, CVE reports</p>
            </div>
          )}
        </div>
      )}

      {/* Generate button */}
      {file && !report && (
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Analyzing with Claude…
            </>
          ) : (
            <>
              <FileText className="size-4" />
              Generate Threat Intelligence Report
            </>
          )}
        </button>
      )}

      {loading && (
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <Loader2 className="size-8 text-primary animate-spin mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Analyzing document with Claude claude-opus-4-6…</p>
          <p className="text-xs text-muted-foreground mt-1">Extended thinking enabled — this may take 60-90 seconds</p>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 dark:bg-red-950/30 dark:border-red-800">
          <div className="flex items-start gap-3">
            <AlertTriangle className="size-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-700 dark:text-red-400">Analysis failed</p>
              <p className="text-sm text-red-600 dark:text-red-400 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {report && !loading && (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground">Intelligence Report</h2>
            <button
              onClick={() => { setReport(null); setFile(null) }}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5"
            >
              <X className="size-3.5" />
              New analysis
            </button>
          </div>
          <ThreatIntelReportDisplay report={report} />
        </>
      )}
    </div>
  )
}
