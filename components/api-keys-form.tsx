'use client'

import { useState, useEffect } from 'react'
import { Key, Loader2, AlertTriangle, Check, Eye, EyeOff, Trash2 } from 'lucide-react'

interface KeyState {
  anthropic_api_key: string | null
  openai_api_key: string | null
  has_anthropic_key: boolean
  has_openai_key: boolean
}

export function ApiKeysForm() {
  const [keys, setKeys] = useState<KeyState | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [anthropicKey, setAnthropicKey] = useState('')
  const [openaiKey, setOpenaiKey] = useState('')
  const [showAnthropic, setShowAnthropic] = useState(false)
  const [showOpenai, setShowOpenai] = useState(false)

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(data => {
        setKeys(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  async function handleSave(provider: 'anthropic' | 'openai') {
    setSaving(true)
    setMessage(null)

    const body = provider === 'anthropic'
      ? { anthropic_api_key: anthropicKey }
      : { openai_api_key: openaiKey }

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) {
        setMessage({ type: 'error', text: data.error })
      } else {
        setMessage({ type: 'success', text: `${provider === 'anthropic' ? 'Anthropic' : 'OpenAI'} API key saved.` })
        if (provider === 'anthropic') setAnthropicKey('')
        else setOpenaiKey('')
        const refresh = await fetch('/api/settings').then(r => r.json())
        setKeys(refresh)
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to save. Please try again.' })
    } finally {
      setSaving(false)
    }
  }

  async function handleRemove(provider: 'anthropic' | 'openai') {
    setSaving(true)
    setMessage(null)

    const body = provider === 'anthropic'
      ? { anthropic_api_key: '' }
      : { openai_api_key: '' }

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        setMessage({ type: 'success', text: `${provider === 'anthropic' ? 'Anthropic' : 'OpenAI'} API key removed.` })
        const refresh = await fetch('/api/settings').then(r => r.json())
        setKeys(refresh)
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to remove key.' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-12 text-center">
        <Loader2 className="size-6 text-primary animate-spin mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">Loading settings...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {message && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 flex items-center gap-2 text-sm text-foreground backdrop-blur-sm">
          {message.type === 'success'
            ? <Check className="size-4 shrink-0 text-red-500" />
            : <AlertTriangle className="size-4 shrink-0 text-red-500" />}
          {message.text}
        </div>
      )}

      {/* Anthropic API Key */}
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Key className="size-4 text-primary" />
            Anthropic API Key
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Required for CTI report generation with Claude models (Sonnet 4, Opus 4, Haiku 4.5).
          </p>
        </div>
        <div className="p-6">
          {keys?.has_anthropic_key ? (
            <div className="flex items-center gap-3">
              <div className="flex-1 px-3 py-2 rounded-lg bg-background border border-border font-mono text-sm text-muted-foreground">
                {keys.anthropic_api_key}
              </div>
              <button
                onClick={() => handleRemove('anthropic')}
                disabled={saving}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg border border-border transition-colors disabled:opacity-50"
              >
                <Trash2 className="size-3.5" />
                Remove
              </button>
            </div>
          ) : (
            <div className="flex gap-3">
              <div className="relative flex-1">
                <input
                  type={showAnthropic ? 'text' : 'password'}
                  value={anthropicKey}
                  onChange={e => setAnthropicKey(e.target.value)}
                  placeholder="sk-ant-api03-..."
                  className="w-full px-3 py-2 pr-10 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowAnthropic(!showAnthropic)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showAnthropic ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              <button
                onClick={() => handleSave('anthropic')}
                disabled={saving || !anthropicKey.trim()}
                className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? <Loader2 className="size-4 animate-spin" /> : 'Save'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* OpenAI API Key */}
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Key className="size-4 text-primary" />
            OpenAI API Key
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Required for CTI report generation with OpenAI models (GPT-4.1, o3-mini).
          </p>
        </div>
        <div className="p-6">
          {keys?.has_openai_key ? (
            <div className="flex items-center gap-3">
              <div className="flex-1 px-3 py-2 rounded-lg bg-background border border-border font-mono text-sm text-muted-foreground">
                {keys.openai_api_key}
              </div>
              <button
                onClick={() => handleRemove('openai')}
                disabled={saving}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg border border-border transition-colors disabled:opacity-50"
              >
                <Trash2 className="size-3.5" />
                Remove
              </button>
            </div>
          ) : (
            <div className="flex gap-3">
              <div className="relative flex-1">
                <input
                  type={showOpenai ? 'text' : 'password'}
                  value={openaiKey}
                  onChange={e => setOpenaiKey(e.target.value)}
                  placeholder="sk-proj-..."
                  className="w-full px-3 py-2 pr-10 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowOpenai(!showOpenai)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showOpenai ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              <button
                onClick={() => handleSave('openai')}
                disabled={saving || !openaiKey.trim()}
                className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? <Loader2 className="size-4 animate-spin" /> : 'Save'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Info box */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:bg-amber-950/30 dark:border-amber-800">
        <div className="flex items-start gap-3">
          <AlertTriangle className="size-4 text-amber-500 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-800 dark:text-amber-300 space-y-1">
            <p className="font-semibold">Your keys, your usage</p>
            <p>API keys are stored securely and used server-side only. Usage and billing are tied to your own API accounts. We never share or access your keys for any purpose other than generating reports on your behalf.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
