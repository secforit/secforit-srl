import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET — return masked API keys for the current user
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })
  }

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('anthropic_api_key, openai_api_key')
    .eq('id', user.id)
    .single()

  // Return masked keys so the frontend knows if they're set
  return NextResponse.json({
    anthropic_api_key: maskKey(profile?.anthropic_api_key),
    openai_api_key: maskKey(profile?.openai_api_key),
    has_anthropic_key: !!profile?.anthropic_api_key,
    has_openai_key: !!profile?.openai_api_key,
  })
}

// PUT — update API keys
export async function PUT(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })
  }

  const body = await req.json()
  const { anthropic_api_key, openai_api_key } = body

  // Build update payload — only update keys that were provided (not undefined)
  // Empty string means "clear the key"
  const updates: Record<string, string | null> = {}

  if (anthropic_api_key !== undefined) {
    if (anthropic_api_key && !anthropic_api_key.startsWith('sk-ant-')) {
      return NextResponse.json({ error: 'Invalid Anthropic API key format.' }, { status: 400 })
    }
    updates.anthropic_api_key = anthropic_api_key || null
  }

  if (openai_api_key !== undefined) {
    if (openai_api_key && !openai_api_key.startsWith('sk-')) {
      return NextResponse.json({ error: 'Invalid OpenAI API key format.' }, { status: 400 })
    }
    updates.openai_api_key = openai_api_key || null
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No keys provided.' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('profiles')
    .update(updates)
    .eq('id', user.id)

  if (error) {
    console.error('Failed to update API keys:', error)
    return NextResponse.json({ error: 'Failed to save API keys.' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

function maskKey(key: string | null | undefined): string | null {
  if (!key) return null
  if (key.length <= 12) return '****'
  return key.slice(0, 8) + '...' + key.slice(-4)
}
