import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { VulnerabilityFeed } from '@/components/vulnerability-feed'
import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { logout } from '@/app/auth/actions'
import { ArrowLeft, LogOut, ShieldAlert } from 'lucide-react'
import type { Metadata } from 'next'
import type { VulnApiResponse } from '@/app/api/vulnerabilities/route'

export const metadata: Metadata = {
  title: 'Vulnerability Feed | SECFORIT Portal',
  robots: { index: false, follow: false },
}

async function getVulnerabilities(): Promise<VulnApiResponse> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  const res = await fetch(`${baseUrl}/api/vulnerabilities`, {
    next: { revalidate: 3600 },
  })
  if (!res.ok) throw new Error('Failed to load vulnerabilities')
  return res.json()
}

export default async function VulnerabilitiesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  let data: VulnApiResponse | null = null
  let error: string | null = null

  try {
    data = await getVulnerabilities()
  } catch {
    error = 'Unable to load vulnerability feed. Please try again later.'
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
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

      <main className="container mx-auto px-4 py-10 max-w-5xl">
        {/* Back + title */}
        <div className="mb-8">
          <Link
            href="/portal"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
          >
            <ArrowLeft className="size-4" />
            Back to portal
          </Link>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/5 mb-4 ml-4">
            <ShieldAlert className="size-3.5 text-primary" />
            <span className="text-xs text-muted-foreground">Live threat intelligence</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Exploited Vulnerabilities</h1>
          <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
            Real-time feed of vulnerabilities confirmed exploited in the wild, sourced from{' '}
            <a href="https://nvd.nist.gov" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">NVD</a>
            {' '}and the{' '}
            <a href="https://www.cisa.gov/known-exploited-vulnerabilities-catalog" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">CISA KEV catalog</a>.
            {' '}Federal agencies are required to remediate these under BOD 22-01.
          </p>
        </div>

        {error ? (
          <div className="rounded-xl border border-border bg-card p-12 text-center">
            <ShieldAlert className="size-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        ) : data ? (
          <VulnerabilityFeed
            vulnerabilities={data.vulnerabilities}
            total={data.total}
            lastUpdated={data.lastUpdated}
          />
        ) : null}
      </main>
    </div>
  )
}
