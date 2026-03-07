import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ThreatIntelUpload } from '@/components/threat-intel-upload'
import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { logout } from '@/app/auth/actions'
import { ArrowLeft, LogOut, Zap } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Threat Intel Generator | SECFORIT Portal',
  robots: { index: false, follow: false },
}

function checkAnalyst(email?: string | null): boolean {
  if (!email) return false
  const allowlist = (process.env.THREAT_INTEL_ALLOWED_EMAILS ?? '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean)
  return allowlist.includes(email.toLowerCase())
}

export default async function ThreatIntelPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  if (!checkAnalyst(user.email)) redirect('/portal')

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/">
            <Image src="/Logo-SECFORIT.png" alt="SECFORIT" width={160} height={44} className="h-9 w-auto" />
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground bg-green-500/10 border border-green-500/20 rounded-full px-3 py-1">
              <span className="size-1.5 rounded-full bg-green-500 animate-pulse" />
              Session active
            </span>
            <form action={logout}>
              <Button variant="ghost" size="sm" type="submit" className="gap-2 text-muted-foreground hover:text-foreground">
                <LogOut className="size-4" />
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-10 max-w-4xl">
        <div className="mb-8">
          <Link
            href="/portal/vulnerabilities"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
          >
            <ArrowLeft className="size-4" />
            Back to vulnerability feed
          </Link>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/5 mb-4 ml-4">
            <Zap className="size-3.5 text-primary" />
            <span className="text-xs text-muted-foreground">AI-powered analysis</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Threat Intelligence Generator</h1>
          <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
            Upload a vulnerability report, advisory, or research paper and receive a structured
            threat intelligence report with MITRE ATT&CK mapping, IOCs, detection queries,
            and remediation guidance.
          </p>
        </div>

        <ThreatIntelUpload />
      </main>
    </div>
  )
}
