"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Cookie, X } from "lucide-react"
import Link from "next/link"

const CONSENT_KEY = "secforit-cookie-consent"
const CONSENT_VERSION = "1" // bump when policy changes to re-prompt

interface CookieConsent {
  necessary: boolean
  analytics: boolean
  version: string
  timestamp: string
}

function getStoredConsent(): CookieConsent | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(CONSENT_KEY)
    if (!raw) return null
    const consent: CookieConsent = JSON.parse(raw)
    if (consent.version !== CONSENT_VERSION) return null
    return consent
  } catch {
    return null
  }
}

function saveConsent(consent: CookieConsent) {
  localStorage.setItem(CONSENT_KEY, JSON.stringify(consent))
}

export function CookieConsent() {
  const [visible, setVisible] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [analyticsEnabled, setAnalyticsEnabled] = useState(true)

  useEffect(() => {
    const stored = getStoredConsent()
    if (!stored) {
      // Small delay so it doesn't flash on page load
      const timer = setTimeout(() => setVisible(true), 800)
      return () => clearTimeout(timer)
    }
  }, [])

  const acceptAll = () => {
    const consent: CookieConsent = {
      necessary: true,
      analytics: true,
      version: CONSENT_VERSION,
      timestamp: new Date().toISOString(),
    }
    saveConsent(consent)
    setVisible(false)
  }

  const acceptSelected = () => {
    const consent: CookieConsent = {
      necessary: true,
      analytics: analyticsEnabled,
      version: CONSENT_VERSION,
      timestamp: new Date().toISOString(),
    }
    saveConsent(consent)
    setVisible(false)
  }

  const rejectNonEssential = () => {
    const consent: CookieConsent = {
      necessary: true,
      analytics: false,
      version: CONSENT_VERSION,
      timestamp: new Date().toISOString(),
    }
    saveConsent(consent)
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px] pointer-events-auto" />

      {/* Banner */}
      <div className="absolute bottom-0 left-0 right-0 pointer-events-auto">
        <div className="container mx-auto px-4 pb-6">
          <div className="max-w-2xl mx-auto rounded-2xl bg-card border border-border shadow-2xl shadow-black/10 overflow-hidden">
            {/* Header */}
            <div className="p-6 pb-0">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                    <Cookie className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">
                    Cookie Preferences
                  </h3>
                </div>
                <button
                  onClick={rejectNonEssential}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors duration-200"
                  aria-label="Decline non-essential cookies"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                We use cookies to ensure our website functions correctly and to
                understand how you interact with it. You can choose which cookies
                to allow. Read our{" "}
                <Link
                  href="/cookie-policy"
                  className="text-primary hover:underline font-medium"
                >
                  Cookie Policy
                </Link>{" "}
                and{" "}
                <Link
                  href="/privacy-policy"
                  className="text-primary hover:underline font-medium"
                >
                  Privacy Policy
                </Link>{" "}
                for details.
              </p>

              {/* Details Toggle */}
              {showDetails && (
                <div className="space-y-3 mb-4">
                  {/* Necessary */}
                  <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-border">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Strictly Necessary
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Required for the website to function. Cannot be disabled.
                      </p>
                    </div>
                    <div className="relative">
                      <div className="w-10 h-5 rounded-full bg-primary cursor-not-allowed">
                        <div className="absolute right-0.5 top-0.5 w-4 h-4 rounded-full bg-white shadow-sm" />
                      </div>
                    </div>
                  </div>

                  {/* Analytics */}
                  <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-border">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Analytics
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Anonymised usage data via Vercel Analytics to improve the site.
                      </p>
                    </div>
                    <button
                      onClick={() => setAnalyticsEnabled(!analyticsEnabled)}
                      className="relative"
                      aria-label={`${analyticsEnabled ? "Disable" : "Enable"} analytics cookies`}
                    >
                      <div
                        className={`w-10 h-5 rounded-full transition-colors duration-200 ${
                          analyticsEnabled ? "bg-primary" : "bg-border"
                        }`}
                      >
                        <div
                          className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-200 ${
                            analyticsEnabled ? "right-0.5" : "left-0.5"
                          }`}
                        />
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <Button
                  onClick={acceptAll}
                  className="bg-primary text-primary-foreground hover:bg-sec-red-dark transition-all duration-300 flex-1 sm:flex-none"
                >
                  Accept All
                </Button>
                {showDetails ? (
                  <Button
                    onClick={acceptSelected}
                    variant="outline"
                    className="border-border hover:border-primary/50 transition-all duration-300 flex-1 sm:flex-none"
                  >
                    Save Preferences
                  </Button>
                ) : (
                  <Button
                    onClick={() => setShowDetails(true)}
                    variant="outline"
                    className="border-border hover:border-primary/50 transition-all duration-300 flex-1 sm:flex-none"
                  >
                    Customize
                  </Button>
                )}
                <Button
                  onClick={rejectNonEssential}
                  variant="ghost"
                  className="text-muted-foreground hover:text-foreground transition-all duration-300 flex-1 sm:flex-none"
                >
                  Reject Non-Essential
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
