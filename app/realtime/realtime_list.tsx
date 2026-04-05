'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import BottomNav from '@/components/BottomNav'
import { supabase } from '@/lib/supabase'

type Vote = {
  id: string
  question: string
  option_a: string
  option_b: string
  emoji_a: string
  emoji_b: string
  expires_at: string | null
  pa: number
  total: number
}

function fmt(n: number) {
  return n >= 10000 ? (n / 10000).toFixed(1) + '만' : n >= 1000 ? (n / 1000).toFixed(1) + 'k' : '' + n
}

function formatTimer(ms: number) {
  if (ms <= 0) return '종료'
  const totalSec = Math.floor(ms / 1000)
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

export default function RealtimePage() {
  const router = useRouter()
  const [votes, setVotes] = useState<Vote[]>([])
  const [loading, setLoading] = useState(true)
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    fetchVotes()
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [])

  async function fetchVotes() {
    const { data, error } = await supabase
      .from('votes')
      .select('*, vote_results(choice)')
      .eq('is_realtime', true)
      .order('created_at', { ascending: false })

    if (error || !data) { setLoading(false); return }

    const processed = data.map((vote: any) => {
      const results = vote.vote_results || []
      const count_a = results.filter((r: any) => r.choice === 'a').length
      const count_b = results.filter((r: any) => r.choice === 'b').length
      const total = count_a + count_b
      return {
        ...vote, total,
        pa: total > 0 ? Math.round((count_a / total) * 100) : 50,
      }
    })

    setVotes(processed)
    setLoading(false)
  }

  const activeVotes = votes.filter(v => v.expires_at && new Date(v.expires_at).getTime() > now)
  const endedVotes = votes.filter(v => !v.expires_at || new Date(v.expires_at).getTime() <= now)

  return (
    <div style={{
      maxWidth: '390px', margin: '0 auto', minHeight: '100vh',
      background: '#0A0A0A',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", sans-serif',
    }}>

      {/* 탑바 */}
      <div style={{
        padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '0.5px solid rgba(255,255,255,0.08)', position: 'sticky', top: 0, zIndex: 50,
        background: '#0A0A0A',
      }}>
        <div onClick={() => router.back()} style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', color: 'white', cursor: 'pointer' }}>←</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#00C471' }} />
          <span style={{ fontSize: '14px', fontWeight: 900, color: 'white' }}>실시간 결정</span>
        </div>
        <div onClick={() => router.push('/realtime/new')} style={{ fontSize: '11px', fontWeight: 800, color: '#00C471', cursor: 'pointer', padding: '6px 12px', borderRadius: '999px', border: '1px solid rgba(0,196,113,0.3)', background: 'rgba(0,196,113,0.1)' }}>
          + 올리기
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px' }}>
          <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)' }}>불러오는 중...</div>
        </div>
      ) : (
        <div style={{ padding: '12px 16px', paddingBottom: '100px' }}>

          {/* 진행 중 */}
          {activeVotes.length > 0 && (
            <>
              <div style={{ fontSize: '11px', fontWeight: 800, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em', marginBottom: '10px' }}>
                진행 중 {activeVotes.length}개
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
                {activeVotes.map(v => {
                  const timeLeft = v.expires_at ? new Date(v.expires_at).getTime() - now : 0
                  const isUrgent = timeLeft < 300000
                  return (
                    <div key={v.id} onClick={() => router.push(`/vote/${v.id}`)}
                      style={{ background: '#111', borderRadius: '16px', padding: '14px', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', position: 'relative', overflow: 'hidden' }}>
                      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: '#00C471' }} />

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', background: '#E8FBF3', borderRadius: '999px', padding: '3px 8px' }}>
                          <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#00C471' }} />
                          <span style={{ fontSize: '8px', fontWeight: 900, color: '#00C471' }}>LIVE</span>
                        </div>
                        <span style={{ fontSize: '12px', fontWeight: 900, color: isUrgent ? '#FF3B3B' : 'rgba(255,255,255,0.5)', fontVariantNumeric: 'tabular-nums' }}>
                          ⏱ {formatTimer(timeLeft)}
                        </span>
                      </div>

                      <div style={{ fontSize: '15px', fontWeight: 900, color: 'white', lineHeight: 1.3, marginBottom: '12px' }}>{v.question}</div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                        {[
                          { name: v.option_a, emoji: v.emoji_a, pct: v.pa, color: '#FF3B3B', bg: 'rgba(255,59,59,0.1)', border: 'rgba(255,59,59,0.2)' },
                          { name: v.option_b, emoji: v.emoji_b, pct: 100 - v.pa, color: '#1A6FFF', bg: 'rgba(26,111,255,0.1)', border: 'rgba(26,111,255,0.2)' },
                        ].map((opt, i) => (
                          <div key={i} style={{ background: opt.bg, border: `1px solid ${opt.border}`, borderRadius: '10px', padding: '8px', textAlign: 'center' }}>
                            <div style={{ fontSize: '20px', marginBottom: '4px' }}>{opt.emoji}</div>
                            <div style={{ fontSize: '10px', fontWeight: 700, color: 'white', marginBottom: '3px' }}>{opt.name}</div>
                            <div style={{ fontSize: '14px', fontWeight: 900, color: opt.color }}>{opt.pct}%</div>
                          </div>
                        ))}
                      </div>

                      <div style={{ height: '3px', background: 'rgba(255,255,255,0.08)', borderRadius: '999px', overflow: 'hidden', display: 'flex', marginBottom: '6px' }}>
                        <div style={{ width: `${v.pa}%`, background: '#FF3B3B', transition: 'width 0.5s' }} />
                        <div style={{ flex: 1, background: '#1A6FFF' }} />
                      </div>

                      <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>{fmt(v.total)}명 참여 중</div>
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {/* 종료됨 */}
          {endedVotes.length > 0 && (
            <>
              <div style={{ fontSize: '11px', fontWeight: 800, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.08em', marginBottom: '10px' }}>
                종료됨
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {endedVotes.map(v => (
                  <div key={v.id} onClick={() => router.push(`/vote/${v.id}`)}
                    style={{ background: '#111', borderRadius: '14px', padding: '12px 14px', border: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer', opacity: 0.6 }}>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: 'white', marginBottom: '6px' }}>{v.question}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '10px', fontWeight: 700, color: '#FF3B3B' }}>{v.option_a} {v.pa}%</span>
                      <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.2)' }}>vs</span>
                      <span style={{ fontSize: '10px', fontWeight: 700, color: '#1A6FFF' }}>{v.option_b} {100 - v.pa}%</span>
                      <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.2)', marginLeft: 'auto' }}>{fmt(v.total)}명</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {activeVotes.length === 0 && endedVotes.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>⚡</div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: 'white', marginBottom: '6px' }}>아직 실시간 결정이 없어요</div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginBottom: '20px' }}>지금 바로 고민을 올려보세요!</div>
              <div onClick={() => router.push('/realtime/new')} style={{ display: 'inline-block', background: '#00C471', color: 'white', borderRadius: '999px', padding: '10px 24px', fontSize: '13px', fontWeight: 800, cursor: 'pointer' }}>
                + 올리기
              </div>
            </div>
          )}
        </div>
      )}

      <BottomNav />
    </div>
  )
}
