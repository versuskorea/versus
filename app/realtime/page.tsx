'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import BottomNav from '@/components/BottomNav'
import TopBar from '@/components/TopBar'
import { supabase } from '@/lib/supabase'

const BG = '#0A0A0A'
const CARD = '#141414'
const Y = '#FFD700'
const YS = 'rgba(255,215,0,0.12)'
const YB = 'rgba(255,215,0,0.3)'
const R = '#FF3B3B'
const RS = 'rgba(255,59,59,0.12)'
const RB = 'rgba(255,59,59,0.3)'
const font = '-apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", sans-serif'

type Vote = {
  id: string; question: string; option_a: string; option_b: string
  emoji_a: string; emoji_b: string; expires_at: string | null
  pa: number; total: number
}

function fmt(n: number) {
  return n >= 10000 ? (n/10000).toFixed(1)+'만' : n >= 1000 ? (n/1000).toFixed(1)+'k' : ''+n
}
function fmtTimer(ms: number) {
  if (ms <= 0) return '종료'
  const s = Math.floor(ms/1000)
  const m = Math.floor(s/60)
  const h = Math.floor(m/60)
  if (h > 0) return `${h}시간 ${m%60}분`
  return `${String(m).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`
}

export default function RealtimePage() {
  const router = useRouter()
  const [votes, setVotes] = useState<Vote[]>([])
  const [loading, setLoading] = useState(true)
  const [now, setNow] = useState(Date.now())
  const [voted, setVoted] = useState<Record<string, 'a'|'b'>>({})

  useEffect(() => {
    fetchVotes()
    try {
      const ex = JSON.parse(localStorage.getItem('versus_voted')||'{}')
      setVoted(ex)
    } catch {}
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  async function fetchVotes() {
    const { data } = await supabase
      .from('votes')
      .select('*, vote_results(choice)')
      .eq('is_realtime', true)
      .order('created_at', { ascending: false })
    if (data) {
      setVotes(data.map((v: any) => {
        const r = v.vote_results || []
        const ca = r.filter((x: any) => x.choice==='a').length
        const cb = r.filter((x: any) => x.choice==='b').length
        const total = ca + cb
        return { ...v, total, pa: total>0 ? Math.round((ca/total)*100) : 50 }
      }))
    }
    setLoading(false)
  }

  async function handleVote(voteId: string, side: 'a'|'b') {
    if (voted[voteId]) return
    setVoted(p => ({ ...p, [voteId]: side }))
    try {
      const ex = JSON.parse(localStorage.getItem('versus_voted')||'{}')
      ex[voteId] = side; localStorage.setItem('versus_voted', JSON.stringify(ex))
    } catch {}
    await supabase.from('vote_results').insert({ vote_id: voteId, choice: side })
    setVotes(prev => prev.map(v => {
      if (v.id !== voteId) return v
      const nt = v.total + 1
      const nca = side==='a' ? Math.round(v.pa*v.total/100)+1 : Math.round(v.pa*v.total/100)
      return { ...v, total: nt, pa: Math.round((nca/nt)*100) }
    }))
  }

  const activeVotes = votes.filter(v => v.expires_at && new Date(v.expires_at).getTime() > now)
  const endedVotes = votes.filter(v => !v.expires_at || new Date(v.expires_at).getTime() <= now)

  return (
    <div style={{ maxWidth:'390px', margin:'0 auto', minHeight:'100vh', background:BG, fontFamily:font }}>
      <TopBar />

      {/* 헤더 */}
      <div style={{ padding:'14px 16px 8px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
          <div style={{ width:'8px', height:'8px', borderRadius:'50%', background:Y }} />
          <span style={{ fontSize:'16px', fontWeight:900, color:'white' }}>실시간 결정</span>
          <span style={{ fontSize:'12px', fontWeight:700, color:Y }}>{activeVotes.length}개 진행중</span>
        </div>
        <div onClick={() => router.push('/realtime/new')} style={{ background:Y, color:'#0A0A0A', borderRadius:'999px', padding:'6px 14px', fontSize:'11px', fontWeight:900, cursor:'pointer' }}>
          + 올리기
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign:'center', padding:'60px', fontSize:'13px', color:'white', opacity:0.4 }}>불러오는 중...</div>
      ) : (
        <div style={{ padding:'8px 16px', paddingBottom:'100px' }}>

          {/* 진행중 */}
          {activeVotes.length > 0 && (
            <>
              <div style={{ fontSize:'10px', fontWeight:800, color:'white', opacity:0.35, letterSpacing:'0.08em', marginBottom:'10px' }}>진행 중</div>
              <div style={{ display:'flex', flexDirection:'column', gap:'10px', marginBottom:'28px' }}>
                {activeVotes.map(v => {
                  const timeLeft = v.expires_at ? new Date(v.expires_at).getTime() - now : 0
                  const urgent = timeLeft > 0 && timeLeft < 300000
                  const isVoted = voted[v.id]
                  return (
                    <div key={v.id} style={{ background:CARD, borderRadius:'16px', border:`1px solid ${YB}`, overflow:'hidden' }}>
                      {/* 상단 - 타이머 */}
                      <div style={{ padding:'12px 14px 0', display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px' }}>
                        <div style={{ display:'inline-flex', alignItems:'center', gap:'4px', background:YS, borderRadius:'999px', padding:'3px 9px', border:`1px solid ${YB}` }}>
                          <div style={{ width:'5px', height:'5px', borderRadius:'50%', background:Y }} />
                          <span style={{ fontSize:'8px', fontWeight:900, color:Y }}>LIVE</span>
                        </div>
                        <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                          <span style={{ fontSize:'18px', fontWeight:900, color: urgent ? R : Y, fontVariantNumeric:'tabular-nums', letterSpacing:'-0.02em' }}>
                            ⏱ {fmtTimer(timeLeft)}
                          </span>
                          <span style={{ fontSize:'10px', color:'white', opacity:0.4 }}>{fmt(v.total)}명</span>
                        </div>
                      </div>

                      {/* 질문 */}
                      <div onClick={() => router.push(`/vote/${v.id}`)} style={{ padding:'0 14px 12px', fontSize:'16px', fontWeight:900, color:'white', lineHeight:1.35, letterSpacing:'-0.02em', cursor:'pointer' }}>
                        {v.question}
                      </div>

                      {/* A/B 버튼 - 크게 */}
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0', borderTop:'0.5px solid rgba(255,255,255,0.06)' }}>
                        {([
                          { side:'a' as const, name:v.option_a, emoji:v.emoji_a, pct:v.pa, ac:Y, bg:YS, bd:Y },
                          { side:'b' as const, name:v.option_b, emoji:v.emoji_b, pct:100-v.pa, ac:R, bg:RS, bd:R },
                        ]).map((opt, idx) => (
                          <div key={opt.side} onClick={() => handleVote(v.id, opt.side)} style={{
                            padding:'14px 12px', textAlign:'center', cursor: isVoted ? 'default' : 'pointer',
                            background: isVoted===opt.side ? opt.bg : 'transparent',
                            borderRight: idx===0 ? '0.5px solid rgba(255,255,255,0.06)' : 'none',
                            opacity: isVoted && isVoted!==opt.side ? 0.4 : 1,
                            transition:'all 0.2s',
                          }}>
                            <div style={{ fontSize:'24px', marginBottom:'6px' }}>{opt.emoji}</div>
                            <div style={{ fontSize:'13px', fontWeight:800, color:'white', marginBottom: isVoted ? '6px' : 0 }}>{opt.name}</div>
                            {isVoted && (
                              <div style={{ fontSize:'22px', fontWeight:900, color:opt.ac }}>{opt.pct}%</div>
                            )}
                            {!isVoted && (
                              <div style={{ fontSize:'10px', fontWeight:700, color:opt.ac, opacity:0.7, marginTop:'4px' }}>
                                {opt.side.toUpperCase()} 선택
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* 진행바 */}
                      {isVoted && (
                        <div style={{ height:'3px', display:'flex' }}>
                          <div style={{ width:`${v.pa}%`, background:Y, transition:'width 0.8s' }} />
                          <div style={{ flex:1, background:R }} />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {/* 종료됨 */}
          {endedVotes.length > 0 && (
            <>
              <div style={{ fontSize:'10px', fontWeight:800, color:'white', opacity:0.25, letterSpacing:'0.08em', marginBottom:'10px' }}>종료됨</div>
              <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
                {endedVotes.map(v => (
                  <div key={v.id} onClick={() => router.push(`/vote/${v.id}`)} style={{ background:CARD, borderRadius:'14px', padding:'12px 14px', border:'1px solid rgba(255,255,255,0.06)', cursor:'pointer', opacity:0.55 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'6px' }}>
                      <span style={{ fontSize:'9px', fontWeight:800, color:'white', opacity:0.4 }}>종료됨</span>
                      <span style={{ fontSize:'10px', color:'white', opacity:0.35 }}>{fmt(v.total)}명</span>
                    </div>
                    <div style={{ fontSize:'13px', fontWeight:800, color:'white', marginBottom:'8px' }}>{v.question}</div>
                    <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'6px' }}>
                      <span style={{ fontSize:'11px', fontWeight:700, padding:'3px 10px', borderRadius:'999px', background:YS, color:Y, border:`1px solid ${YB}` }}>{v.emoji_a} {v.option_a}</span>
                      <span style={{ fontSize:'9px', color:'white', opacity:0.2 }}>vs</span>
                      <span style={{ fontSize:'11px', fontWeight:700, padding:'3px 10px', borderRadius:'999px', background:RS, color:R, border:`1px solid ${RB}` }}>{v.emoji_b} {v.option_b}</span>
                    </div>
                    <div style={{ height:'3px', background:'rgba(255,255,255,0.06)', borderRadius:'999px', overflow:'hidden', display:'flex' }}>
                      <div style={{ width:`${v.pa}%`, background:Y }} />
                      <div style={{ flex:1, background:R }} />
                    </div>
                    <div style={{ display:'flex', justifyContent:'space-between', marginTop:'4px' }}>
                      <span style={{ fontSize:'9px', color:Y, fontWeight:700 }}>{v.pa}%</span>
                      <span style={{ fontSize:'9px', color:R, fontWeight:700 }}>{100-v.pa}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {activeVotes.length===0 && endedVotes.length===0 && (
            <div style={{ textAlign:'center', padding:'60px 20px' }}>
              <div style={{ fontSize:'40px', marginBottom:'12px' }}>⚡</div>
              <div style={{ fontSize:'15px', fontWeight:800, color:'white', marginBottom:'6px' }}>아직 실시간 결정이 없어요</div>
              <div style={{ fontSize:'12px', color:'white', opacity:0.4, marginBottom:'20px' }}>지금 바로 고민을 올려보세요!</div>
              <div onClick={() => router.push('/realtime/new')} style={{ display:'inline-block', background:Y, color:'#0A0A0A', borderRadius:'999px', padding:'10px 24px', fontSize:'13px', fontWeight:800, cursor:'pointer' }}>+ 올리기</div>
            </div>
          )}
        </div>
      )}
      <BottomNav />
    </div>
  )
}
