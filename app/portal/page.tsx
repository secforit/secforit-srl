import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { logout } from '@/app/auth/actions'
import { PasskeyManager } from '@/components/passkey-manager'
import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  LogOut,
  User,
  ShieldCheck,
  Clock,
  Calendar,
  Hash,
  Mail,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
} from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Portal | SECFORIT',
  robots: { index: false, follow: false },
}

function Avatar({ email }: { email: string }) {
  const initials = email.slice(0, 2).toUpperCase()
  return (
    <div className="flex size-16 items-center justify-center rounded-full bg-primary/10 border-2 border-primary/20 text-primary text-xl font-bold select-none">
      {initials}
    </div>
  )
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-border last:border-0">
      <div className="mt-0.5 text-muted-foreground">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-0.5">{label}</p>
        <p className="text-sm font-medium text-foreground break-all">{value}</p>
      </div>
    </div>
  )
}

export default async function PortalPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const displayName = user.user_metadata?.full_name ?? user.user_metadata?.name ?? null
  const provider = user.app_metadata?.provider ?? 'email'
  const providerLabel = provider === 'google' ? 'Google' : provider === 'github' ? 'GitHub' : 'Email / Password'

  const formatDate = (iso: string | null | undefined) =>
    iso
      ? new Date(iso).toLocaleDateString('en-GB', {
          day: 'numeric', month: 'short', year: 'numeric',
          hour: '2-digit', minute: '2-digit',
        })
      : '—'

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
        {/* Page title */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/5 mb-4">
            <ShieldCheck className="size-3.5 text-primary" />
            <span className="text-xs text-muted-foreground">Secure Portal</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            Welcome back{displayName ? `, ${displayName.split(' ')[0]}` : ''}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your session is authenticated and encrypted end-to-end.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left column */}
          <div className="lg:col-span-2 flex flex-col gap-6">

            {/* Profile card */}
            <div className="rounded-xl border border-border bg-card shadow-sm">
              <div className="px-6 py-4 border-b border-border">
                <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <User className="size-4 text-primary" />
                  Profile
                </h2>
              </div>
              <div className="p-6">
                <div className="flex items-center gap-4 mb-6 pb-6 border-b border-border">
                  <Avatar email={user.email ?? 'U'} />
                  <div>
                    <p className="text-base font-semibold text-foreground">
                      {displayName ?? user.email}
                    </p>
                    {displayName && (
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    )}
                    <div className="mt-1.5 inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                      {providerLabel}
                    </div>
                  </div>
                </div>

                <InfoRow icon={<Mail className="size-4" />} label="Email address" value={user.email ?? '—'} />
                <InfoRow icon={<Hash className="size-4" />} label="User ID" value={user.id} />
                <InfoRow icon={<Calendar className="size-4" />} label="Member since" value={formatDate(user.created_at)} />
                <InfoRow icon={<Clock className="size-4" />} label="Last sign-in" value={formatDate(user.last_sign_in_at)} />
              </div>
            </div>

            {/* Passkeys */}
            <div className="rounded-xl border border-border bg-card shadow-sm">
              <div className="px-6 py-4 border-b border-border">
                <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <KeyRound className="size-4 text-primary" />
                  Passkeys &amp; Security Keys
                </h2>
              </div>
              <div className="p-6">
                <PasskeyManager />
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className="flex flex-col gap-6">

            {/* Security overview */}
            <div className="rounded-xl border border-border bg-card shadow-sm">
              <div className="px-6 py-4 border-b border-border">
                <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <ShieldCheck className="size-4 text-primary" />
                  Security
                </h2>
              </div>
              <div className="p-5 flex flex-col gap-3">

                {/* Email verification */}
                <div className="flex items-center gap-3 p-3 rounded-lg bg-background border border-border">
                  {user.email_confirmed_at ? (
                    <CheckCircle2 className="size-5 text-green-500 shrink-0" />
                  ) : (
                    <AlertCircle className="size-5 text-amber-500 shrink-0" />
                  )}
                  <div>
                    <p className="text-xs font-semibold text-foreground">Email verification</p>
                    <p className="text-xs text-muted-foreground">
                      {user.email_confirmed_at ? 'Verified' : 'Pending verification'}
                    </p>
                  </div>
                </div>

                {/* Auth method */}
                <div className="flex items-center gap-3 p-3 rounded-lg bg-background border border-border">
                  <CheckCircle2 className="size-5 text-green-500 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-foreground">Authentication</p>
                    <p className="text-xs text-muted-foreground">{providerLabel}</p>
                  </div>
                </div>

                {/* Session */}
                <div className="flex items-center gap-3 p-3 rounded-lg bg-background border border-border">
                  <CheckCircle2 className="size-5 text-green-500 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-foreground">Session</p>
                    <p className="text-xs text-muted-foreground">Encrypted · Active</p>
                  </div>
                </div>

              </div>
            </div>

            {/* Quick actions */}
            <div className="rounded-xl border border-border bg-card shadow-sm">
              <div className="px-6 py-4 border-b border-border">
                <h2 className="text-sm font-semibold text-foreground">Quick actions</h2>
              </div>
              <div className="p-5 flex flex-col gap-2">
                <Link
                  href="/portal/vulnerabilities"
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:bg-primary/5 hover:text-primary transition-colors duration-200"
                >
                  <ShieldAlert className="size-4" />
                  Vulnerability feed
                </Link>
                <Link
                  href="/contact"
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:bg-primary/5 hover:text-primary transition-colors duration-200"
                >
                  <Mail className="size-4" />
                  Contact support
                </Link>
                <Link
                  href="/services"
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:bg-primary/5 hover:text-primary transition-colors duration-200"
                >
                  <ShieldCheck className="size-4" />
                  Our services
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
