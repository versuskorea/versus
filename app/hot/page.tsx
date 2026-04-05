'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import BottomNav from '@/components/BottomNav'
import TopBar from '@/components/TopBar'
import { supabase } from '@/lib/supabase'

const GRAD = 'linear-gradient(135deg, #0A0A0A 0%, #1a0a2e 50%, #0a1a0a 100%)'
const Y = '#FFD700'
const YS = 'rgba(255,215,0,0.12)'
const YB = 'rgba(255,215,0,0.3)'
const font = '-apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", sans-serif'

type Vote = { id: string; question: string; option_a: string; option_b: string; emoji_a: string; emoji_b: string; category: string; total: number; pa: number }

function fmt(n: number) { return n >= 10000 ? (n / 10000).toFixed(1) + '만' : n >= 1000 ? (n / 1000).toFixed(1) + 'k' : '' + n }

export default function Hot() {
  const router = useRouter()
  const [votes, setVotes] = useState<Vote[]>([])
  const [loading, setLoading] = useState(true)
  const [sort, setSort] = useState<'all' | 'monthly'>('all')

  useEffect(() => { fetchVotes() }, [sort])

  async function fetchVotes() {
    setLoading(true)
    let query = supabase.from('votes').select('*, vote_results(choice)').eq('is_realtime', false).limit(30)
    const { data } = await query
    if (data) {
      const processed = data.map((v: any) => {
        const results = v.vote_results || []
        const count_a = results.filter((r: any) => r.choice === 'a').length
        const count_b = results.filter((r: any) => r.choice === 'b').length
        const total = count_a + count_b
        return { ...v, total, pa: total > 0 ? Math.round((count_a / total) * 100) : 50 }
      })
      if (sort === 'monthly') {
        const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
        setVotes(processed.filter((v: Vote & { created_at: string }) => v.created_at >= startOfMonth).sort((a: Vote, b: Vote) => b.total - a.total))
      } else {
        setVotes(processed.sort((a: Vote, b: Vote) => b.total - a.total))
      }
    }
    setLoading(false)
  }

  const rankEmoji = ['🥇', '🥈', '🥉']

  return (
    <div style={{ maxWidth: '390px', margin: '0 auto', minHeight: '100vh', background: GRAD, fontFamily: font }}>
      <TopBar />

      <div style={{ padding: '16px 16px 0' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: YS, border: `1px solid ${YB}`, borderRadius: '999px', padding: '4px 10px', marginBottom: '12px' }}>
          <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: Y }} />
          <span style={{ fontSize: '9px', fontWeight: 800, color: Y }}>HOT</span>
        </div>
        <div style={{ fontSize: '20px', fontWeight: 900, color: 'white', marginBottom: '16px', letterSpacing: '-0.025em' }}>🔥 인기 투표</div>

        {/* 정렬 탭 */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          {([['all', '전체 인기'], ['monthly', '이번 달']] as const).map(([val, label]) => (
            <div key={val} onClick={() => setSort(val)} style={{
              padding: '7px 16px', borderRadius: '999px', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
              background: sort === val ? Y : 'rgba(255,255,255,0.06)',
              color: sort === val ? '#0A0A0A' : 'rgba(255,255,255,0.5)',
              border: `1.5px solid ${sort === val ? Y : 'rgba(255,255,255,0.1)'}`,
            }}>{label}</div>
          ))}
        </div>
      </div>

      <div style={{ paddingBottom: '100px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>불러오는 중...</div>
        ) : votes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>아직 투표가 없어요</div>
        ) : (
          votes.map((v, i) => (
            <div key={v.id} onClick={() => router.push(`/vote/${v.id}`)} style={{ padding: '14px 16px', borderBottom: '0.5px solid rgba(255,255,255,0.06)', cursor: 'pointer', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              {/* 랭크 */}
              <div style={{ fontSize: i < 3 ? '20px' : '14px', fontWeight: 900, color: i < 3 ? 'white' : 'rgba(255,255,255,0.25)', minWidth: '28px', paddingTop: '2px' }}>
                {i < 3 ? rankEmoji[i] : `${i + 1}`}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>{v.category}</div>
                <div style={{ fontSize: '14px', fontWeight: 800, color: 'white', marginBottom: '8px' }}>{v.question}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '999px', background: YS, color: Y, border: `1px solid ${YB}` }}>{v.emoji_a} {v.option_a}</span>
                  <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)' }}>vs</span>
                  <span style={{ fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '999px', background: 'rgba(26,111,255,0.15)', color: '#1A6FFF', border: '1px solid rgba(26,111,255,0.3)' }}>{v.emoji_b} {v.option_b}</span>
                </div>
                <div style={{ height: '3px', background: 'rgba(255,255,255,0.08)', borderRadius: '999px', overflow: 'hidden', display: 'flex', marginBottom: '6px' }}>
                  <div style={{ width: `${v.pa}%`, background: Y }} />
                  <div style={{ flex: 1, background: '#1A6FFF' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>👥 {fmt(v.total)}명</span>
                  <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)' }}>{v.pa}% vs {100 - v.pa}%</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      <BottomNav />
    </div>
  )
}
