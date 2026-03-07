'use client'

import { useState, useEffect, useCallback } from 'react'
import { Fingerprint, Key, Loader2, Plus, Trash2, ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'

interface PasskeyFactor {
  id: string
  friendly_name: string | null
  created_at: string
  status: string
}

export function PasskeyManager() {
  const [factors, setFactors] = useState<PasskeyFactor[]>([])
  const [loading, setLoading] = useState(true)
  const [enrolling, setEnrolling] = useState(false)
  const [friendlyName, setFriendlyName] = useState('')
  const [showEnroll, setShowEnroll] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mfaRequired, setMfaRequired] = useState(false)
  const [verifying, setVerifying] = useState(false)

  const supabase = createClient()

  const loadFactors = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.auth.mfa.listFactors()
    // Filter to verified webauthn factors only
    const webauthnFactors = (data?.webauthn ?? []).filter((f) => f.status === 'verified')
    setFactors(webauthnFactors as PasskeyFactor[])
    setLoading(false)
  }, [supabase])

  const checkMfaLevel = useCallback(async () => {
    const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    if (data?.nextLevel === 'aal2' && data?.currentLevel !== 'aal2') {
      setMfaRequired(true)
    }
  }, [supabase])

  useEffect(() => {
    loadFactors()
    checkMfaLevel()
  }, [loadFactors, checkMfaLevel])

  const handleEnroll = async () => {
    if (!friendlyName.trim()) return
    setEnrolling(true)
    setError(null)

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mfa = supabase.auth.mfa as any
      const { error } = await mfa.webauthn.register({ friendlyName: friendlyName.trim() })
      if (error) {
        setError(error.message ?? 'Failed to register passkey')
      } else {
        setFriendlyName('')
        setShowEnroll(false)
        await loadFactors()
      }
    } catch {
      setError('Passkey registration failed. Please try again.')
    } finally {
      setEnrolling(false)
    }
  }

  const handleDelete = async (factorId: string) => {
    setError(null)
    const { error } = await supabase.auth.mfa.unenroll({ factorId })
    if (error) {
      setError(error.message ?? 'Failed to remove passkey')
    } else {
      await loadFactors()
    }
  }

  const handleVerifyMfa = async () => {
    if (factors.length === 0) return
    setVerifying(true)
    setError(null)

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mfa = supabase.auth.mfa as any
      const { error } = await mfa.webauthn.authenticate({ factorId: factors[0].id })
      if (error) {
        setError(error.message ?? 'Verification failed')
      } else {
        setMfaRequired(false)
      }
    } catch {
      setError('Passkey verification failed. Please try again.')
    } finally {
      setVerifying(false)
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Fingerprint className="size-5 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Passkeys &amp; Biometrics</h2>
        </div>
        {!showEnroll && (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => setShowEnroll(true)}
          >
            <Plus className="size-3.5" />
            Add passkey
          </Button>
        )}
      </div>

      {/* MFA required banner */}
      {mfaRequired && factors.length > 0 && (
        <div className="mb-4 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <ShieldAlert className="mt-0.5 size-4 shrink-0" />
          <div className="flex-1">
            <p className="font-medium">Additional verification required</p>
            <p className="mt-0.5 text-xs text-amber-700">
              Verify with your passkey to gain full portal access.
            </p>
          </div>
          <Button
            size="sm"
            className="shrink-0 text-xs"
            onClick={handleVerifyMfa}
            disabled={verifying}
          >
            {verifying ? <Loader2 className="size-3 animate-spin" /> : <Fingerprint className="size-3" />}
            Verify
          </Button>
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      {/* Enroll form */}
      {showEnroll && (
        <div className="mb-4 rounded-lg border border-border bg-muted/30 p-4">
          <p className="mb-3 text-sm font-medium text-foreground">Register a new passkey</p>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="passkey-name" className="text-xs">
                Name (e.g. "MacBook Touch ID", "iPhone Face ID")
              </Label>
              <Input
                id="passkey-name"
                value={friendlyName}
                onChange={(e) => setFriendlyName(e.target.value)}
                placeholder="My passkey"
                className="h-8 text-sm"
                onKeyDown={(e) => e.key === 'Enter' && handleEnroll()}
              />
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleEnroll}
                disabled={enrolling || !friendlyName.trim()}
                className="gap-1.5 bg-primary text-xs hover:bg-sec-red-dark"
              >
                {enrolling ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <Fingerprint className="size-3" />
                )}
                Register passkey
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-xs"
                onClick={() => {
                  setShowEnroll(false)
                  setFriendlyName('')
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Factor list */}
      {loading ? (
        <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading…
        </div>
      ) : factors.length === 0 ? (
        <div className="flex items-center gap-2 rounded-lg border border-dashed border-border py-4 text-center text-sm text-muted-foreground">
          <Key className="mx-auto size-4" />
          <span>No passkeys enrolled. Add one for biometric sign-in.</span>
        </div>
      ) : (
        <ul className="space-y-2">
          {factors.map((factor) => (
            <li
              key={factor.id}
              className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2.5"
            >
              <div className="flex items-center gap-2.5">
                <Fingerprint className="size-4 text-primary" />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {factor.friendly_name ?? 'Passkey'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Added {new Date(factor.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-muted-foreground hover:text-destructive"
                onClick={() => handleDelete(factor.id)}
                aria-label="Remove passkey"
              >
                <Trash2 className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
