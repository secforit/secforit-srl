import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { logout } from '@/app/auth/actions'
import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft, LogOut, Settings } from 'lucide-react'
import { ApiKeysForm } from '@/components/api-keys-form'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Settings | SECFORIT Portal',
  robots: { index: false, follow: false },
}

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/">
            <Image src="/Logo-SECFORIT.png" alt="SECFORIT" width={180} height={50} className="h-10 md:h-12 w-auto" priority />
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

      <main className="container mx-auto px-4 py-10 max-w-2xl">
        <div className="mb-8">
          <Link
            href="/portal"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
          >
            <ArrowLeft className="size-4" />
            Back to portal
          </Link>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/5 mb-4 ml-4">
            <Settings className="size-3.5 text-primary" />
            <span className="text-xs text-muted-foreground">Configuration</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your API keys for AI-powered threat intelligence report generation.
          </p>
        </div>

        <ApiKeysForm />
      </main>
    </div>
  )
}
