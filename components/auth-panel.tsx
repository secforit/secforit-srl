'use client'

import { useActionState, useState } from 'react'
import Image from 'next/image'
import { Loader2, Lock, Mail, ShieldCheck } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { login, register, type ActionState } from '@/app/auth/actions'
import { createClient } from '@/lib/supabase/client'

// ─── Google Icon ────────────────────────────────────────────────────────────
function GoogleIcon() {
  return (
    <svg className="size-4" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  )
}

// ─── Google Button ───────────────────────────────────────────────────────────
function GoogleButton() {
  const [loading, setLoading] = useState(false)

  const handleClick = async () => {
    setLoading(true)
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full gap-2.5"
      onClick={handleClick}
      disabled={loading}
    >
      {loading ? <Loader2 className="size-4 animate-spin" /> : <GoogleIcon />}
      Continue with Google
    </Button>
  )
}

// ─── Divider ─────────────────────────────────────────────────────────────────
function Divider() {
  return (
    <div className="relative my-4">
      <div className="absolute inset-0 flex items-center">
        <span className="w-full border-t border-border" />
      </div>
      <div className="relative flex justify-center text-xs uppercase">
        <span className="bg-background px-2 text-muted-foreground">or continue with email</span>
      </div>
    </div>
  )
}

// ─── Sign In Form ─────────────────────────────────────────────────────────────
function SignInForm() {
  const [state, action, isPending] = useActionState<ActionState, FormData>(login, null)

  return (
    <form action={action} className="space-y-4">
      {state?.error && (
        <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
          <ShieldCheck className="mt-0.5 size-4 shrink-0" />
          {state.error}
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="signin-email">Email</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="signin-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@example.com"
            className="pl-9"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="signin-password">Password</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="signin-password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            placeholder="••••••••"
            className="pl-9"
          />
        </div>
      </div>

      <Button
        type="submit"
        disabled={isPending}
        className="w-full bg-primary hover:bg-sec-red-dark hover:shadow-[0_0_20px_rgba(220,38,38,0.3)] transition-all duration-300"
      >
        {isPending ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Signing in…
          </>
        ) : (
          'Sign in'
        )}
      </Button>
    </form>
  )
}

// ─── Register Form ────────────────────────────────────────────────────────────
function RegisterForm() {
  const [state, action, isPending] = useActionState<ActionState, FormData>(register, null)

  if (state?.success) {
    return (
      <div className="space-y-3 py-4 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-green-50 text-green-600">
          <ShieldCheck className="size-6" />
        </div>
        <p className="font-medium text-foreground">Check your email</p>
        <p className="text-sm text-muted-foreground">{state.success}</p>
      </div>
    )
  }

  return (
    <form action={action} className="space-y-4">
      {state?.error && (
        <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
          <ShieldCheck className="mt-0.5 size-4 shrink-0" />
          {state.error}
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="reg-email">Email</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="reg-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@example.com"
            className="pl-9"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="reg-password">Password</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="reg-password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            placeholder="••••••••"
            className="pl-9"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          8+ chars, uppercase, lowercase, number &amp; special character
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="reg-confirm">Confirm password</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="reg-confirm"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            placeholder="••••••••"
            className="pl-9"
          />
        </div>
      </div>

      <Button
        type="submit"
        disabled={isPending}
        className="w-full bg-primary hover:bg-sec-red-dark hover:shadow-[0_0_20px_rgba(220,38,38,0.3)] transition-all duration-300"
      >
        {isPending ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Creating account…
          </>
        ) : (
          'Create account'
        )}
      </Button>
    </form>
  )
}

// ─── Auth Panel ───────────────────────────────────────────────────────────────
interface AuthPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultTab?: 'signin' | 'register'
}

export function AuthPanel({ open, onOpenChange, defaultTab = 'signin' }: AuthPanelProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        {/* Logo */}
        <div className="mb-5 flex flex-col items-center gap-3">
          <Image
            src="/Logo-SECFORIT.png"
            alt="SECFORIT"
            width={160}
            height={44}
            className="h-9 w-auto"
          />
          <div className="text-center">
            <DialogTitle className="text-xl font-bold">Secure Portal Access</DialogTitle>
            <DialogDescription className="mt-0.5 text-sm">
              Sign in or create an account
            </DialogDescription>
          </div>
        </div>

        {/* Google */}
        <GoogleButton />

        <Divider />

        {/* Email tabs */}
        <Tabs defaultValue={defaultTab}>
          <TabsList>
            <TabsTrigger value="signin">Sign in</TabsTrigger>
            <TabsTrigger value="register">Create account</TabsTrigger>
          </TabsList>
          <TabsContent value="signin">
            <SignInForm />
          </TabsContent>
          <TabsContent value="register">
            <RegisterForm />
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <ShieldCheck className="size-3.5 text-primary" />
          Secured by SECFORIT
        </p>
      </DialogContent>
    </Dialog>
  )
}
