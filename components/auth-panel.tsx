'use client'

import { useActionState } from 'react'
import Image from 'next/image'
import { Loader2, Lock, Mail, ShieldCheck, KeyRound } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { login, register, type ActionState } from '@/app/auth/actions'

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

      <div className="space-y-1.5">
        <Label htmlFor="reg-invite">Invite code</Label>
        <div className="relative">
          <KeyRound className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="reg-invite"
            name="inviteCode"
            type="text"
            autoComplete="off"
            required
            placeholder="Enter your invite code"
            className="pl-9 font-mono tracking-widest"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Access is by invitation only. Contact SECFORIT to request a code.
        </p>
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
