import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ── 타입 ──
export type Vote = {
  id: string
  question: string
  option_a: string
  option_b: string
  emoji_a: string
  emoji_b: string
  category: string
  is_realtime: boolean
  expires_at: string | null
  created_at: string
  count_a?: number
  count_b?: number
}

export type VoteResult = {
  id: string
  vote_id: string
  user_id: string | null
  choice: 'a' | 'b'
  created_at: string
}

export type Comment = {
  id: string
  vote_id: string
  user_id: string | null
  content: string
  choice: 'a' | 'b'
  created_at: string
}

// ── 투표 목록 가져오기 ──
export async function getVotes(options?: {
  category?: string
  limit?: number
  orderBy?: 'created_at' | 'popular'
  isRealtime?: boolean
}) {
  let query = supabase
    .from('votes')
    .select(`
      *,
      vote_results(choice)
    `)

  if (options?.category) query = query.eq('category', options.category)
  if (options?.isRealtime !== undefined) query = query.eq('is_realtime', options.isRealtime)
  if (options?.limit) query = query.limit(options.limit)

  query = query.order('created_at', { ascending: false })

  const { data, error } = await query
  if (error) throw error

  // count_a, count_b 계산
  return data.map((vote: any) => {
    const results = vote.vote_results || []
    const count_a = results.filter((r: any) => r.choice === 'a').length
    const count_b = results.filter((r: any) => r.choice === 'b').length
    const total = count_a + count_b
    return {
      ...vote,
      count_a,
      count_b,
      total,
      pa: total > 0 ? Math.round((count_a / total) * 100) : 50,
    }
  })
}

// ── 투표 하나 가져오기 ──
export async function getVote(id: string) {
  const { data, error } = await supabase
    .from('votes')
    .select(`
      *,
      vote_results(choice)
    `)
    .eq('id', id)
    .single()

  if (error) throw error

  const results = data.vote_results || []
  const count_a = results.filter((r: any) => r.choice === 'a').length
  const count_b = results.filter((r: any) => r.choice === 'b').length
  const total = count_a + count_b

  return {
    ...data,
    count_a,
    count_b,
    total,
    pa: total > 0 ? Math.round((count_a / total) * 100) : 50,
  }
}

// ── 투표 생성 ──
export async function createVote(vote: {
  question: string
  option_a: string
  option_b: string
  emoji_a?: string
  emoji_b?: string
  category: string
  is_realtime?: boolean
}) {
  const payload = {
    ...vote,
    emoji_a: vote.emoji_a || '🔴',
    emoji_b: vote.emoji_b || '🔵',
    is_realtime: vote.is_realtime || false,
    expires_at: vote.is_realtime
      ? new Date(Date.now() + 60 * 60 * 1000).toISOString()
      : null,
  }

  const { data, error } = await supabase
    .from('votes')
    .insert(payload)
    .select()
    .single()

  if (error) throw error
  return data
}

// ── 투표하기 ──
export async function castVote(voteId: string, choice: 'a' | 'b') {
  const { data, error } = await supabase
    .from('vote_results')
    .insert({ vote_id: voteId, choice })
    .select()
    .single()

  if (error) throw error
  return data
}

// ── 댓글 가져오기 ──
export async function getComments(voteId: string) {
  const { data, error } = await supabase
    .from('comments')
    .select('*')
    .eq('vote_id', voteId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data
}

// ── 댓글 작성 ──
export async function createComment(voteId: string, content: string, choice: 'a' | 'b') {
  const { data, error } = await supabase
    .from('comments')
    .insert({ vote_id: voteId, content, choice })
    .select()
    .single()

  if (error) throw error
  return data
}

// ── 소울메이트 결과 저장 ──
export async function saveSoulResult(answers: Record<string, 'a' | 'b'>) {
  const { data, error } = await supabase
    .from('soul_results')
    .insert({ answers })
    .select()
    .single()

  if (error) throw error
  return data
}

// ── 소울메이트 매칭 수 계산 ──
export async function getSoulmateCount(answers: Record<string, 'a' | 'b'>) {
  const { data, error } = await supabase
    .from('soul_results')
    .select('answers')

  if (error) throw error

  const keys = Object.keys(answers)
  let soulmate = 0

  data.forEach((row: any) => {
    const match = keys.every(k => row.answers[k] === answers[k])
    if (match) soulmate++
  })

  return soulmate
}
