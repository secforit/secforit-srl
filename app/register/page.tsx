'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Loader2, Lock, Mail, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { register, type ActionState } from '@/app/auth/actions'

const passwordRules = [
  'At least 8 characters',
  'One uppercase letter',
  'One lowercase letter',
  'One number',
  'One special character',
]

export default function RegisterPage() {
  const [state, action, isPending] = useActionState<ActionState, FormData>(register, null)

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-4">
          <Link href="/">
            <Image
              src="/Logo-SECFORIT.png"
              alt="SECFORIT"
              width={180}
              height={50}
              className="h-10 w-auto"
              priority
            />
          </Link>
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Create account</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Access the SECFORIT secure portal
            </p>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          {state?.success ? (
            <div className="space-y-4 text-center">
              <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-green-50 text-green-600">
                <ShieldCheck className="size-6" />
              </div>
              <div>
                <p className="font-medium text-foreground">Check your email</p>
                <p className="mt-1 text-sm text-muted-foreground">{state.success}</p>
              </div>
              <Link
                href="/login"
                className="block text-sm font-medium text-primary hover:underline"
              >
                Back to sign in
              </Link>
            </div>
          ) : (
            <form action={action} className="space-y-5">
              {state?.error && (
                <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  <ShieldCheck className="mt-0.5 size-4 shrink-0" />
                  <span>{state.error}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="email">Email address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
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
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    required
                    placeholder="••••••••"
                    className="pl-9"
                  />
                </div>
                <ul className="mt-1.5 space-y-0.5 text-xs text-muted-foreground">
                  {passwordRules.map((rule) => (
                    <li key={rule} className="flex items-center gap-1.5">
                      <span className="size-1 rounded-full bg-muted-foreground/50" />
                      {rule}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword">Confirm password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
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
          )}

          {!state?.success && (
            <p className="mt-5 text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link href="/login" className="font-medium text-primary hover:underline">
                Sign in
              </Link>
            </p>
          )}
        </div>

        {/* Security note */}
        <p className="mt-6 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <ShieldCheck className="size-3.5" />
          Secured by SECFORIT
        </p>
      </div>
    </div>
  )
}
