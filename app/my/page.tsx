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

type Vote = {
  id: string; question: string; option_a: string; option_b: string
  emoji_a: string; emoji_b: string; category: string
  total: number; pa: number; comment_count: number; is_realtime: boolean
}

function fmt(n: number) { return n >= 10000 ? (n / 10000).toFixed(1) + '만' : n >= 1000 ? (n / 1000).toFixed(1) + 'k' : '' + n }

export default function My() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'voted' | 'created'>('voted')
  const [votedList, setVotedList] = useState<Vote[]>([])
  const [createdList, setCreatedList] = useState<Vote[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchMyData() }, [])

  async function fetchMyData() {
    setLoading(true)
    try {
      const votedIds = Object.keys(JSON.parse(localStorage.getItem('versus_voted') || '{}'))
      const createdIds = JSON.parse(localStorage.getItem('versus_created') || '[]')

      async function processVotes(ids: string[]) {
        if (ids.length === 0) return []
        const { data } = await supabase
          .from('votes')
          .select('*, vote_results(choice), comments(id)')
          .in('id', ids)
        if (!data) return []
        return data.map((v: any) => {
          const results = v.vote_results || []
          const count_a = results.filter((r: any) => r.choice === 'a').length
          const count_b = results.filter((r: any) => r.choice === 'b').length
          const total = count_a + count_b
          return { ...v, total, pa: total > 0 ? Math.round((count_a / total) * 100) : 50, comment_count: v.comments?.length || 0 }
        })
      }

      const [voted, created] = await Promise.all([processVotes(votedIds), processVotes(createdIds)])
      setVotedList(voted)
      setCreatedList(created)
    } catch {}
    setLoading(false)
  }

  const list = activeTab === 'voted' ? votedList : createdList
  const votedMap: Record<string, 'a' | 'b'> = typeof window !== 'undefined'
    ? JSON.parse(localStorage.getItem('versus_voted') || '{}')
    : {}

  const totalComments = createdList.reduce((sum, v) => sum + v.comment_count, 0)
  const totalVotesReceived = createdList.reduce((sum, v) => sum + v.total, 0)

  return (
    <div style={{ maxWidth: '390px', margin: '0 auto', minHeight: '100vh', background: GRAD, fontFamily: font }}>
      <TopBar />

      {/* 프로필 */}
      <div style={{ padding: '20px 16px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: YS, border: `2px solid ${Y}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', flexShrink: 0 }}>👤</div>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 900, color: 'white', marginBottom: '4px' }}>익명 유저</div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>VERSUS 멤버</div>
          </div>
        </div>

        {/* 스탯 카드 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '8px', marginBottom: '20px' }}>
          {[
            { label: '참여', value: votedList.length },
            { label: '출제', value: createdList.length },
            { label: '받은 투표', value: fmt(totalVotesReceived) },
            { label: '댓글', value: totalComments },
          ].map(stat => (
            <div key={stat.label} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '10px 8px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize: '16px', fontWeight: 900, color: Y, marginBottom: '3px' }}>{stat.value}</div>
              <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', fontWeight: 700 }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 탭 */}
      <div style={{ display: 'flex', borderBottom: '0.5px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}>
        {([['voted', '참여한 투표'], ['created', '출제한 투표']] as const).map(([tab, label]) => (
          <div key={tab} onClick={() => setActiveTab(tab)} style={{
            flex: 1, padding: '12px 0', textAlign: 'center', fontSize: '13px', cursor: 'pointer',
            fontWeight: activeTab === tab ? 900 : 600,
            color: activeTab === tab ? Y : 'rgba(255,255,255,0.35)',
            borderBottom: activeTab === tab ? `2.5px solid ${Y}` : '2.5px solid transparent',
          }}>{label}</div>
        ))}
      </div>

      {/* 리스트 */}
      <div style={{ paddingBottom: '100px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>불러오는 중...</div>
        ) : list.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>{activeTab === 'voted' ? '🗳️' : '✏️'}</div>
            <div style={{ fontSize: '14px', fontWeight: 800, color: 'white', marginBottom: '6px' }}>
              {activeTab === 'voted' ? '아직 참여한 투표가 없어요' : '아직 출제한 투표가 없어요'}
            </div>
            <div onClick={() => router.push(activeTab === 'voted' ? '/' : '/create')} style={{ display: 'inline-block', background: Y, color: '#0A0A0A', borderRadius: '999px', padding: '10px 24px', fontSize: '13px', fontWeight: 800, cursor: 'pointer', marginTop: '12px' }}>
              {activeTab === 'voted' ? '투표하러 가기 →' : '투표 만들기 →'}
            </div>
          </div>
        ) : (
          list.map(v => {
            const myChoice = activeTab === 'voted' ? votedMap[v.id] : null
            const myPct = myChoice === 'a' ? v.pa : 100 - v.pa
            const isWinning = myChoice && ((myChoice === 'a' && v.pa >= 50) || (myChoice === 'b' && v.pa < 50))

            return (
              <div key={v.id} onClick={() => router.push(`/vote/${v.id}`)}
                style={{ padding: '14px 16px', borderBottom: '0.5px solid rgba(255,255,255,0.06)', cursor: 'pointer' }}>

                {/* 카테고리 + 실시간 뱃지 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                  {v.is_realtime && (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', background: YS, border: `1px solid ${YB}`, borderRadius: '999px', padding: '2px 6px' }}>
                      <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: Y }} />
                      <span style={{ fontSize: '7px', fontWeight: 900, color: Y }}>LIVE</span>
                    </div>
                  )}
                  <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', fontWeight: 600 }}>{v.category}</span>
                </div>

                {/* 질문 */}
                <div style={{ fontSize: '14px', fontWeight: 800, color: 'white', marginBottom: '10px', lineHeight: 1.4 }}>{v.question}</div>

                {/* 내 선택 결과 (참여한 경우) */}
                {myChoice && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', padding: '8px 12px', background: YS, borderRadius: '10px', border: `1px solid ${YB}` }}>
                    <span style={{ fontSize: '14px' }}>{myChoice === 'a' ? v.emoji_a : v.emoji_b}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', marginBottom: '1px' }}>내 선택</div>
                      <div style={{ fontSize: '12px', fontWeight: 800, color: Y }}>{myChoice === 'a' ? v.option_a : v.option_b}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '18px', fontWeight: 900, color: Y }}>{myPct}%</div>
                      <div style={{ fontSize: '8px', color: isWinning ? Y : 'rgba(255,255,255,0.3)', fontWeight: 700 }}>{isWinning ? '✓ 우세' : '열세'}</div>
                    </div>
                  </div>
                )}

                {/* 출제한 경우 A/B 간단 표시 */}
                {!myChoice && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                    <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '999px', background: YS, color: Y, border: `1px solid ${YB}`, fontWeight: 700 }}>{v.emoji_a} {v.option_a}</span>
                    <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.2)' }}>vs</span>
                    <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '999px', background: 'rgba(26,111,255,0.15)', color: '#1A6FFF', border: '1px solid rgba(26,111,255,0.3)', fontWeight: 700 }}>{v.emoji_b} {v.option_b}</span>
                  </div>
                )}

                {/* 진행바 */}
                {v.total > 0 && (
                  <div style={{ marginBottom: '8px' }}>
                    <div style={{ height: '3px', background: 'rgba(255,255,255,0.08)', borderRadius: '999px', overflow: 'hidden', display: 'flex' }}>
                      <div style={{ width: `${v.pa}%`, background: Y, transition: 'width 0.5s' }} />
                      <div style={{ flex: 1, background: '#1A6FFF' }} />
                    </div>
                  </div>
                )}

                {/* 통계 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)' }}>👥 {fmt(v.total)}명</span>
                  <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)' }}>💬 {v.comment_count}</span>
                  {v.total > 0 && (
                    <span style={{ fontSize: '9px', color: Y, fontWeight: 700 }}>{v.pa}%</span>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
      <BottomNav />
    </div>
  )
}
