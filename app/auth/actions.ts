'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

// ---------------------------------------------------------------------------
// Rate limiting — prevents brute force on login and registration
// NOTE: In-memory maps reset on redeploy and are per-instance on serverless.
// For production at scale, replace with Upstash Redis (@upstash/ratelimit).
// ---------------------------------------------------------------------------
const authAttempts = new Map<string, { count: number; resetAt: number }>()
const AUTH_WINDOW = 15 * 60 * 1000 // 15 minutes
const AUTH_MAX_LOGIN = 5            // max login attempts per window
const AUTH_MAX_REGISTER = 3         // max register attempts per window

async function getClientIp(): Promise<string> {
  const h = await headers()
  return h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
}

function isAuthRateLimited(key: string, max: number): boolean {
  const now = Date.now()
  const entry = authAttempts.get(key)
  if (!entry || now > entry.resetAt) {
    authAttempts.set(key, { count: 1, resetAt: now + AUTH_WINDOW })
    return false
  }
  entry.count++
  return entry.count > max
}

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

const registerSchema = z
  .object({
    email: z.string().email('Please enter a valid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must include an uppercase letter')
      .regex(/[a-z]/, 'Password must include a lowercase letter')
      .regex(/[0-9]/, 'Password must include a number')
      .regex(/[^A-Za-z0-9]/, 'Password must include a special character'),
    confirmPassword: z.string(),
    inviteCode: z.string().min(1, 'Invite code is required'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

export type ActionState = {
  error?: string
  success?: string
} | null

export async function login(_: ActionState, formData: FormData): Promise<ActionState> {
  const ip = await getClientIp()
  if (isAuthRateLimited(`login:${ip}`, AUTH_MAX_LOGIN)) {
    return { error: 'Too many login attempts. Please try again in 15 minutes.' }
  }

  const raw = {
    email: (formData.get('email') as string | null) ?? '',
    password: (formData.get('password') as string | null) ?? '',
  }

  const result = loginSchema.safeParse(raw)
  if (!result.success) {
    return { error: result.error.errors[0].message }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword(result.data)

  if (error) {
    return { error: 'Invalid email or password' }
  }

  revalidatePath('/', 'layout')
  redirect('/portal')
}

export async function register(_: ActionState, formData: FormData): Promise<ActionState> {
  const ip = await getClientIp()
  if (isAuthRateLimited(`register:${ip}`, AUTH_MAX_REGISTER)) {
    return { error: 'Too many registration attempts. Please try again in 15 minutes.' }
  }

  const raw = {
    email: (formData.get('email') as string | null) ?? '',
    password: (formData.get('password') as string | null) ?? '',
    confirmPassword: (formData.get('confirmPassword') as string | null) ?? '',
    inviteCode: ((formData.get('inviteCode') as string | null) ?? '').trim(),
  }

  const result = registerSchema.safeParse(raw)
  if (!result.success) {
    return { error: result.error.errors[0].message }
  }

  // Validate invite code
  const validCodes = (process.env.INVITE_CODES ?? '')
    .split(',')
    .map(c => c.trim())
    .filter(Boolean)

  if (validCodes.length > 0 && !validCodes.includes(result.data.inviteCode)) {
    return { error: 'Invalid invite code.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signUp({
    email: result.data.email,
    password: result.data.password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  })

  if (error) {
    // Return same message for 'user_already_exists' to prevent email enumeration
    if (error.code === 'user_already_exists') {
      return {
        success: 'Check your email to confirm your account before logging in.',
      }
    }
    return { error: 'Failed to create account. Please try again.' }
  }

  return {
    success: 'Check your email to confirm your account before logging in.',
  }
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}
