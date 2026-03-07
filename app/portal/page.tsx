import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { logout } from '@/app/auth/actions'
import { PasskeyManager } from '@/components/passkey-manager'
import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ShieldCheck, LogOut, User } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Portal | SECFORIT',
  robots: { index: false, follow: false },
}

export default async function PortalPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/">
            <Image
              src="/Logo-SECFORIT.png"
              alt="SECFORIT"
              width={160}
              height={44}
              className="h-9 w-auto"
            />
          </Link>
          <form action={logout}>
            <Button variant="ghost" size="sm" type="submit" className="gap-2 text-muted-foreground hover:text-foreground">
              <LogOut className="size-4" />
              Sign out
            </Button>
          </form>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-10">
        {/* Welcome */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Secure Portal</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Welcome back. Your session is authenticated and encrypted.
          </p>
        </div>

        {/* Account card */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <User className="size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Account
                </p>
                <p className="truncate text-sm font-medium text-foreground">{user.email}</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-green-50 text-green-600">
                <ShieldCheck className="size-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Security status
                </p>
                <p className="text-sm font-medium text-foreground">
                  {user.email_confirmed_at ? 'Email verified' : 'Pending verification'}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <ShieldCheck className="size-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Last sign in
                </p>
                <p className="text-sm font-medium text-foreground">
                  {user.last_sign_in_at
                    ? new Date(user.last_sign_in_at).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '—'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Passkey management */}
        <div className="mt-6 max-w-lg">
          <PasskeyManager />
        </div>
      </main>
    </div>
  )
}
