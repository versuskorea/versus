'use client'
import { useState, useEffect, useRef } from 'react'
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
  emoji_a: string; emoji_b: string; category: string
  is_realtime: boolean; is_featured: boolean; expires_at: string | null; created_at: string
  pa: number; total: number
}
type Comment = { id: string; content: string; choice: 'a' | 'b'; created_at: string }

function fmt(n: number) {
  return n >= 10000 ? (n/10000).toFixed(1)+'만' : n >= 1000 ? (n/1000).toFixed(1)+'k' : ''+n
}
function fmtTimer(ms: number) {
  if (ms <= 0) return '종료'
  const s = Math.floor(ms/1000)
  return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`
}
function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime()
  const min = Math.floor(diff/60000)
  const hour = Math.floor(diff/3600000)
  const day = Math.floor(diff/86400000)
  if (min < 1) return '방금'
  if (min < 60) return `${min}분 전`
  if (hour < 24) return `${hour}시간 전`
  if (day < 7) return `${day}일 전`
  return `${Math.floor(day/7)}주 전`
}

const ADS = [
  { emoji:'🎯', brand:'VERSUS PRO', title:'광고 없이 즐기세요', desc:'월 2,900원으로 광고 없이 무제한', color:Y, bg:YS, border:YB, btn:'시작하기 →' },
  { emoji:'📱', brand:'앱 출시 예정', title:'VERSUS 앱이 곧 나와요', desc:'더 빠르고 편리한 투표 경험', color:'#7C6FFF', bg:'rgba(124,111,255,0.08)', border:'rgba(124,111,255,0.25)', btn:'알림 받기 →' },
]

async function loadVotes() {
  const { data, error } = await supabase.from('votes').select('*, vote_results(choice)').order('created_at', { ascending: false })
  if (error) throw error
  return data.map((v: any) => {
    const r = v.vote_results || []
    const ca = r.filter((x: any) => x.choice==='a').length
    const cb = r.filter((x: any) => x.choice==='b').length
    const total = ca + cb
    return { ...v, total, pa: total>0 ? Math.round((ca/total)*100) : 50 }
  })
}

export default function Home() {
  const router = useRouter()
  const [votes, setVotes] = useState<Vote[]>([])
  const [hotIdx, setHotIdx] = useState(0)
  const [activeTab, setActiveTab] = useState('🔥 오늘의 이슈')
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(true)
  const [latestPage, setLatestPage] = useState(1)
  const [latestLoading, setLatestLoading] = useState(false)
  const [allLatest, setAllLatest] = useState<Vote[]>([])
  const [voted, setVoted] = useState<Record<string,'a'|'b'>>({})
  const [commentVoteId, setCommentVoteId] = useState<string|null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [commentText, setCommentText] = useState('')
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [pulling, setPulling] = useState(false)
  const [pullY, setPullY] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const [now, setNow] = useState(Date.now())
  const touchStartY = useRef(0)

  useEffect(() => {
    fetchAll()
    try {
      const ex = JSON.parse(localStorage.getItem('versus_voted')||'{}')
      setVoted(ex)
    } catch {}
    const t = setInterval(() => setNow(Date.now()), 1000)
    const onFocus = () => fetchAll()
    window.addEventListener('focus', onFocus)
    window.addEventListener('visibilitychange', () => { if (document.visibilityState==='visible') fetchAll() })
    const channel = supabase.channel('home-votes')
      .on('postgres_changes', { event:'*', schema:'public', table:'votes' }, () => fetchAll())
      .subscribe()
    return () => {
      clearInterval(t)
      window.removeEventListener('focus', onFocus)
      supabase.removeChannel(channel)
    }
  }, [])

  async function fetchAll() {
    try {
      const data = await loadVotes()
      setVotes(data)
      setAllLatest(data.filter((v: Vote) => !v.is_realtime).slice(0, 10))
    } catch {}
    setLoading(false)
  }

  async function loadMore() {
    if (latestLoading || !hasMore) return
    setLatestLoading(true)
    const next = latestPage + 1
    const { data } = await supabase.from('votes').select('*, vote_results(choice)').eq('is_realtime', false).order('created_at', { ascending: false }).range((next-1)*10, next*10-1)
    if (data && data.length > 0) {
      const p = data.map((v: any) => {
        const r = v.vote_results || []
        const ca = r.filter((x: any) => x.choice==='a').length
        const cb = r.filter((x: any) => x.choice==='b').length
        const total = ca + cb
        return { ...v, total, pa: total>0 ? Math.round((ca/total)*100) : 50 }
      })
      setAllLatest(prev => [...prev, ...p])
      setLatestPage(next)
      if (data.length < 10) setHasMore(false)
    } else { setHasMore(false) }
    setLatestLoading(false)
  }

  async function handleRefresh() {
    if (refreshing) return
    setRefreshing(true)
    await fetchAll()
    setLatestPage(1); setHasMore(true); setRefreshing(false)
  }

  function onTouchStart(e: React.TouchEvent) {
    if (window.scrollY===0) touchStartY.current = e.touches[0].clientY
  }
  function onTouchMove(e: React.TouchEvent) {
    if (window.scrollY===0) {
      const dy = e.touches[0].clientY - touchStartY.current
      if (dy>0 && dy<80) { setPullY(dy); setPulling(true) }
    }
  }
  async function onTouchEnd() {
    if (pullY>50) await handleRefresh()
    setPullY(0); setPulling(false)
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
      if (v.id!==voteId) return v
      const nt = v.total+1
      const nca = side==='a' ? Math.round(v.pa*v.total/100)+1 : Math.round(v.pa*v.total/100)
      return { ...v, total: nt, pa: Math.round((nca/nt)*100) }
    }))
  }

  async function openComments(voteId: string) {
    if (commentVoteId===voteId) { setCommentVoteId(null); return }
    setCommentVoteId(voteId); setCommentText(''); setCommentsLoading(true)
    const { data } = await supabase.from('comments').select('*').eq('vote_id', voteId).order('created_at', { ascending: false }).limit(20)
    if (data) setComments(data)
    setCommentsLoading(false)
  }

  async function handleComment() {
    if (!commentText.trim() || !commentVoteId) return
    const choice = voted[commentVoteId] || 'a'
    const { data } = await supabase.from('comments').insert({ vote_id: commentVoteId, content: commentText.trim(), choice }).select().single()
    if (data) { setComments(prev => [data, ...prev]); setCommentText('') }
  }

  const weekStart = new Date(Date.now() - 7*24*60*60*1000).toISOString()
  const hotVotes = votes.filter(v => v.is_featured).slice(0,10)
  const userVotes = [...votes].filter(v => !v.is_realtime && v.created_at >= weekStart).sort((a,b) => b.total-a.total).slice(0,5)
  const legendVotes = [...votes].filter(v => !v.is_realtime && v.total>0).sort((a,b) => b.total-a.total).slice(0,10)
  const realtimeVotes = votes.filter(v => v.is_realtime).slice(0,5)
  const tabVotes: Record<string,Vote[]> = {
    '🔥 오늘의 이슈': hotVotes,
    '👥 유저의 선택': userVotes,
    '🏆 레전드': legendVotes,
  }
  const currentVotes = tabVotes[activeTab]
  const hot = currentVotes[hotIdx % Math.max(currentVotes.length, 1)]
  const hotIsVoted = hot ? voted[hot.id] : null

  if (loading) return (
    <div style={{ maxWidth:'390px', margin:'0 auto', minHeight:'100vh', background:BG, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:font }}>
      <div style={{ fontSize:'14px', color:'white', opacity:0.5 }}>불러오는 중...</div>
    </div>
  )

  return (
    <div onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
      style={{ maxWidth:'390px', margin:'0 auto', minHeight:'100vh', background:BG, fontFamily:font }}>

      {/* Pull to refresh */}
      <div style={{ height: pulling||refreshing ? `${Math.min(pullY,60)}px` : '0px', transition: pulling?'none':'height 0.3s', overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <div style={{ fontSize:'12px', color:'white', opacity:0.5, fontWeight:700 }}>
          {refreshing ? '새로고침 중...' : pullY>50 ? '놓으면 새로고침' : '당겨서 새로고침'}
        </div>
      </div>

      <TopBar />

      {/* 탭 */}
      <div style={{ display:'flex', borderBottom:'0.5px solid rgba(255,255,255,0.06)', overflowX:'auto', scrollbarWidth:'none' }}>
        {['🔥 오늘의 이슈','👥 유저의 선택','🏆 레전드'].map(tab => (
          <div key={tab} onClick={() => { setActiveTab(tab); setHotIdx(0) }} style={{
            padding:'10px 14px 9px', fontSize:'12px', whiteSpace:'nowrap', cursor:'pointer', flexShrink:0,
            fontWeight: activeTab===tab ? 900 : 600,
            color: activeTab===tab ? Y : 'white',
            opacity: activeTab===tab ? 1 : 0.35,
            borderBottom: activeTab===tab ? `2.5px solid ${Y}` : '2.5px solid transparent',
          }}>{tab}</div>
        ))}
      </div>

      {/* 핫이슈 카드 */}
      <div style={{ padding:'12px 12px 0' }}>
        {hot ? (
          <div style={{
            background:'linear-gradient(135deg, #1a1400 0%, #141414 50%, #0f0a00 100%)',
            borderRadius:'20px', border:`1px solid ${YB}`,
            boxShadow:`0 0 40px rgba(255,215,0,0.1), 0 8px 32px rgba(0,0,0,0.5)`,
            position:'relative', overflow:'hidden',
          }}>
            <div style={{ position:'absolute', top:'-80px', left:'50%', transform:'translateX(-50%)', width:'260px', height:'260px', borderRadius:'50%', background:'radial-gradient(circle, rgba(255,215,0,0.08) 0%, transparent 70%)', pointerEvents:'none' }} />
            <div style={{ padding:'16px', position:'relative', zIndex:1 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px' }}>
                <span style={{ fontSize:'10px', color:'white', opacity:0.5, fontWeight:700 }}>{hot.category}</span>
                <div style={{ display:'flex', alignItems:'center', gap:'4px', background:'rgba(255,59,59,0.15)', border:'1px solid rgba(255,59,59,0.35)', borderRadius:'999px', padding:'3px 8px' }}>
                  <div style={{ width:'5px', height:'5px', borderRadius:'50%', background:R }} />
                  <span style={{ fontSize:'8px', fontWeight:900, color:R }}>HOT</span>
                </div>
              </div>

              <div onClick={() => router.push(`/vote/${hot.id}`)} style={{ fontSize:'20px', fontWeight:900, color:'white', lineHeight:1.3, marginBottom:'16px', letterSpacing:'-0.03em', cursor:'pointer' }}>
                {hot.question}
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'14px' }}>
                {([
                  { side:'a' as const, name:hot.option_a, emoji:hot.emoji_a, pct:hot.pa, ac:Y, bg:YS, bd:Y },
                  { side:'b' as const, name:hot.option_b, emoji:hot.emoji_b, pct:100-hot.pa, ac:R, bg:RS, bd:R },
                ]).map(opt => (
                  <div key={opt.side} onClick={() => handleVote(hot.id, opt.side)} style={{
                    borderRadius:'16px', padding:'16px 12px', textAlign:'center',
                    cursor: hotIsVoted ? 'default' : 'pointer',
                    border:`2px solid ${hotIsVoted===opt.side ? opt.bd : hotIsVoted ? 'rgba(255,255,255,0.06)' : opt.side==='a' ? 'rgba(255,215,0,0.2)' : 'rgba(255,59,59,0.2)'}`,
                    background: hotIsVoted===opt.side ? opt.bg : hotIsVoted ? 'rgba(255,255,255,0.03)' : opt.side==='a' ? 'rgba(255,215,0,0.07)' : 'rgba(255,59,59,0.07)',
                    boxShadow: hotIsVoted===opt.side ? `0 0 20px ${opt.side==='a' ? 'rgba(255,215,0,0.2)' : 'rgba(255,59,59,0.2)'}` : 'none',
                    opacity: hotIsVoted && hotIsVoted!==opt.side ? 0.35 : 1,
                    transition:'all 0.2s',
                  }}>
                    <div style={{ fontSize:'32px', marginBottom:'8px' }}>{opt.emoji}</div>
                    <div style={{ fontSize:'9px', fontWeight:900, color:opt.ac, opacity:0.8, marginBottom:'4px', letterSpacing:'0.06em' }}>{opt.side.toUpperCase()}</div>
                    <div style={{ fontSize:'14px', fontWeight:800, color:'white', marginBottom: hotIsVoted ? '8px' : '6px' }}>{opt.name}</div>
                    {hotIsVoted
                      ? <div style={{ fontSize:'26px', fontWeight:900, color:opt.ac }}>{opt.pct}%</div>
                      : <div style={{ fontSize:'10px', color:opt.ac, opacity:0.6, fontWeight:700 }}>탭해서 투표</div>
                    }
                  </div>
                ))}
              </div>

              {hotIsVoted && (
                <div style={{ height:'4px', background:'rgba(255,255,255,0.08)', borderRadius:'999px', overflow:'hidden', display:'flex', marginBottom:'10px' }}>
                  <div style={{ width:`${hot.pa}%`, background:Y, transition:'width 0.8s' }} />
                  <div style={{ flex:1, background:R }} />
                </div>
              )}

              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontSize:'10px', color:'white', opacity:0.4 }}>👥 {fmt(hot.total)}명 참여</span>
                <span style={{ fontSize:'10px', color:'white', opacity:0.3 }}>{hotIdx+1} / {currentVotes.length}</span>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ background:CARD, borderRadius:'20px', padding:'40px 14px', textAlign:'center', border:`1px solid ${YB}` }}>
            <div style={{ fontSize:'13px', color:'white', opacity:0.4 }}>
              {activeTab==='🔥 오늘의 이슈' ? '운영자가 등록한 이슈가 없어요' : '아직 투표가 없어요'}
            </div>
          </div>
        )}
      </div>

      {/* 인디케이터 */}
      <div style={{ display:'flex', justifyContent:'center', gap:'4px', padding:'10px 0 12px' }}>
        {currentVotes.map((_,i) => (
          <div key={i} onClick={() => setHotIdx(i)} style={{
            width: i===hotIdx ? '18px' : '5px', height:'5px', borderRadius:'999px', cursor:'pointer',
            background: i===hotIdx ? Y : 'rgba(255,255,255,0.15)', transition:'all 0.25s',
          }} />
        ))}
      </div>

      {/* 실시간 결정 */}
      <div style={{ borderTop:'0.5px solid rgba(255,255,255,0.06)', paddingTop:'12px' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 16px', marginBottom:'12px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
            <div style={{ width:'7px', height:'7px', borderRadius:'50%', background:Y }} />
            <span style={{ fontSize:'15px', fontWeight:900, color:'white' }}>⚡ 실시간 결정</span>
            <span style={{ fontSize:'12px', fontWeight:700, color:Y }}>{realtimeVotes.length}개</span>
          </div>
          <span onClick={() => router.push('/realtime')} style={{ fontSize:'11px', color:'white', opacity:0.35, cursor:'pointer' }}>더보기 ›</span>
        </div>

        <div style={{ display:'flex', gap:'10px', padding:'0 16px 16px', overflowX:'auto', scrollbarWidth:'none', WebkitOverflowScrolling:'touch' } as any}>
          <div onClick={() => router.push('/realtime/new')} style={{ flexShrink:0, width:'110px', background:CARD, borderRadius:'16px', padding:'14px', border:`1.5px dashed ${YB}`, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'6px', cursor:'pointer' }}>
            <div style={{ width:'34px', height:'34px', borderRadius:'50%', background:YS, border:`1.5px solid ${YB}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'18px' }}>💭</div>
            <div style={{ fontSize:'11px', fontWeight:900, color:'white', textAlign:'center', lineHeight:1.4 }}>내 고민<br />올리기</div>
            <div style={{ fontSize:'8px', color:'white', opacity:0.4 }}>1시간 후 삭제</div>
            <div style={{ background:Y, color:'#0A0A0A', borderRadius:'999px', padding:'4px 10px', fontSize:'9px', fontWeight:900 }}>+ 올리기</div>
          </div>

          {realtimeVotes.map(v => {
            const isVoted = voted[v.id]
            const timeLeft = v.expires_at ? new Date(v.expires_at).getTime() - now : 0
            const urgent = timeLeft > 0 && timeLeft < 300000
            return (
              <div key={v.id} style={{ flexShrink:0, width:'210px', background:CARD, borderRadius:'16px', padding:'13px', border:`1px solid ${YB}`, position:'relative', overflow:'hidden' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'8px' }}>
                  <div style={{ display:'inline-flex', alignItems:'center', gap:'3px', background:YS, borderRadius:'999px', padding:'2px 7px', border:`1px solid ${YB}` }}>
                    <div style={{ width:'4px', height:'4px', borderRadius:'50%', background:Y }} />
                    <span style={{ fontSize:'7px', fontWeight:900, color:Y }}>LIVE</span>
                  </div>
                  <span style={{ fontSize:'16px', fontWeight:900, fontVariantNumeric:'tabular-nums', color: timeLeft<=0 ? 'white' : urgent ? R : Y, opacity: timeLeft<=0 ? 0.4 : 1, letterSpacing:'-0.02em' }}>
                    ⏱ {fmtTimer(timeLeft)}
                  </span>
                </div>
                <div style={{ fontSize:'9px', color:'white', opacity:0.4, marginBottom:'5px' }}>{fmt(v.total)}명 참여</div>
                <div onClick={() => router.push(`/vote/${v.id}`)} style={{ fontSize:'13px', fontWeight:900, color:'white', lineHeight:1.35, marginBottom:'10px', cursor:'pointer' }}>
                  {v.question}
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'6px', marginBottom:'8px' }}>
                  {([
                    { side:'a' as const, name:v.option_a, emoji:v.emoji_a, pct:v.pa, ac:Y, bg:YS, bd:Y },
                    { side:'b' as const, name:v.option_b, emoji:v.emoji_b, pct:100-v.pa, ac:R, bg:RS, bd:R },
                  ]).map(opt => (
                    <div key={opt.side} onClick={() => handleVote(v.id, opt.side)} style={{
                      background: isVoted===opt.side ? opt.bg : 'rgba(255,255,255,0.04)',
                      border:`1.5px solid ${isVoted===opt.side ? opt.bd : 'rgba(255,255,255,0.08)'}`,
                      borderRadius:'10px', padding:'8px 4px', textAlign:'center',
                      cursor: isVoted ? 'default' : 'pointer',
                      opacity: isVoted && isVoted!==opt.side ? 0.35 : 1,
                      transition:'all 0.2s',
                    }}>
                      <div style={{ fontSize:'18px', marginBottom:'3px' }}>{opt.emoji}</div>
                      <div style={{ fontSize:'9px', fontWeight:700, color:'white', marginBottom:'3px' }}>{opt.name}</div>
                      <div style={{ fontSize:'14px', fontWeight:900, color:opt.ac }}>{opt.pct}%</div>
                    </div>
                  ))}
                </div>
                <div style={{ height:'2px', background:'rgba(255,255,255,0.08)', borderRadius:'999px', overflow:'hidden', display:'flex', marginBottom:'8px' }}>
                  <div style={{ width:`${v.pa}%`, background:Y, transition:'width 0.5s' }} />
                  <div style={{ flex:1, background:R }} />
                </div>
                <div onClick={() => openComments(v.id)} style={{ display:'flex', alignItems:'center', gap:'4px', cursor:'pointer' }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={commentVoteId===v.id ? Y : 'rgba(255,255,255,0.3)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                  </svg>
                  <span style={{ fontSize:'9px', color: commentVoteId===v.id ? Y : 'rgba(255,255,255,0.3)', fontWeight:700 }}>댓글 {commentVoteId===v.id ? '▲' : '▼'}</span>
                </div>
                {commentVoteId===v.id && (
                  <div style={{ marginTop:'8px', borderTop:'0.5px solid rgba(255,255,255,0.08)', paddingTop:'8px' }}>
                    <div style={{ height:'90px', overflowY:'auto', scrollbarWidth:'none' }}>
                      {commentsLoading ? (
                        <div style={{ fontSize:'10px', color:'white', opacity:0.4, textAlign:'center', padding:'8px' }}>불러오는 중...</div>
                      ) : comments.length===0 ? (
                        <div style={{ fontSize:'10px', color:'white', opacity:0.4, textAlign:'center', padding:'10px' }}>
                          {voted[v.id] ? '첫 댓글을 달아보세요!' : '투표 후 댓글 달 수 있어요'}
                        </div>
                      ) : comments.map(c => (
                        <div key={c.id} style={{ display:'flex', gap:'6px', marginBottom:'8px' }}>
                          <div style={{ width:'18px', height:'18px', borderRadius:'50%', flexShrink:0, background: c.choice==='a' ? YS : RS, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'8px', fontWeight:800, color: c.choice==='a' ? Y : R }}>익</div>
                          <div style={{ flex:1 }}>
                            <span style={{ fontSize:'8px', fontWeight:800, color: c.choice==='a' ? Y : R }}>{c.choice==='a' ? v.option_a : v.option_b}파 </span>
                            <span style={{ fontSize:'10px', color:'white' }}>{c.content}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div style={{ display:'flex', gap:'5px', alignItems:'center', marginTop:'5px' }}>
                      <input value={commentText} onChange={e => setCommentText(e.target.value)}
                        placeholder={voted[v.id] ? '댓글 달기...' : '투표 먼저!'}
                        disabled={!voted[v.id]}
                        onKeyDown={e => e.key==='Enter' && handleComment()}
                        style={{ flex:1, background:'rgba(255,255,255,0.07)', border:'none', borderRadius:'999px', padding:'6px 10px', fontSize:'10px', color:'white', outline:'none' }} />
                      <div onClick={handleComment} style={{ width:'24px', height:'24px', borderRadius:'50%', flexShrink:0, background: commentText&&voted[v.id] ? Y : 'rgba(255,255,255,0.1)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={commentText&&voted[v.id] ? '#0A0A0A' : 'rgba(255,255,255,0.3)'} strokeWidth="2.5" strokeLinecap="round">
                          <line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>
                        </svg>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* 최신 투표 */}
      <div style={{ borderTop:'0.5px solid rgba(255,255,255,0.06)', paddingBottom:'100px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 16px 8px' }}>
          <span style={{ fontSize:'15px', fontWeight:900, color:'white' }}>🆕 최신 투표</span>
          <span style={{ fontSize:'11px', color:'white', opacity:0.35 }}>{allLatest.length}개</span>
        </div>

        {allLatest.length===0 && (
          <div style={{ padding:'40px 16px', textAlign:'center', fontSize:'13px', color:'white', opacity:0.4 }}>아직 투표가 없어요</div>
        )}

        {allLatest.map((v, i) => (
          <div key={v.id}>
            {(i === 2 || i === 6) && (
              <div style={{ margin:'4px 12px', background: ADS[i===2?0:1].bg, borderRadius:'14px', padding:'12px 14px', border:`1px solid ${ADS[i===2?0:1].border}`, display:'flex', alignItems:'center', gap:'12px' }}>
                <div style={{ width:'44px', height:'44px', borderRadius:'12px', background: ADS[i===2?0:1].bg, border:`1px solid ${ADS[i===2?0:1].border}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'22px', flexShrink:0 }}>
                  {ADS[i===2?0:1].emoji}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'5px', marginBottom:'3px' }}>
                    <span style={{ fontSize:'8px', color:'white', opacity:0.3, fontWeight:700 }}>광고</span>
                    <span style={{ fontSize:'9px', fontWeight:800, color: ADS[i===2?0:1].color }}>{ADS[i===2?0:1].brand}</span>
                  </div>
                  <div style={{ fontSize:'13px', fontWeight:800, color:'white', marginBottom:'2px' }}>{ADS[i===2?0:1].title}</div>
                  <div style={{ fontSize:'10px', color:'white', opacity:0.45 }}>{ADS[i===2?0:1].desc}</div>
                </div>
                <div style={{ fontSize:'10px', fontWeight:800, color: ADS[i===2?0:1].color, flexShrink:0 }}>{ADS[i===2?0:1].btn}</div>
              </div>
            )}
            <div onClick={() => router.push(`/vote/${v.id}`)} style={{ padding:'12px 16px', borderBottom:'0.5px solid rgba(255,255,255,0.05)', cursor:'pointer' }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'4px' }}>
                <span onClick={e => { e.stopPropagation(); router.push(`/category/${encodeURIComponent(v.category)}`) }}
                  style={{ fontSize:'10px', fontWeight:700, color:'white', opacity:0.4, cursor:'pointer' }}>{v.category}</span>
                <span style={{ fontSize:'9px', color:'white', opacity:0.25 }}>{timeAgo(v.created_at)}</span>
              </div>
              <div style={{ fontSize:'14px', fontWeight:800, color:'white', marginBottom:'8px', letterSpacing:'-0.01em', lineHeight:1.35 }}>{v.question}</div>
              <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'6px' }}>
                <span style={{ fontSize:'11px', fontWeight:700, padding:'3px 10px', borderRadius:'999px', background:YS, color:Y, border:`1px solid ${YB}` }}>{v.option_a}</span>
                <span style={{ fontSize:'10px', fontWeight:900, color:'white', opacity:0.2 }}>vs</span>
                <span style={{ fontSize:'11px', fontWeight:700, padding:'3px 10px', borderRadius:'999px', background:RS, color:R, border:`1px solid ${RB}` }}>{v.option_b}</span>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
                <span style={{ fontSize:'10px', color:'white', opacity:0.35 }}>👥 {fmt(v.total)}명</span>
                {v.total>100 && <span style={{ fontSize:'8px', fontWeight:800, padding:'2px 6px', borderRadius:'999px', background:YS, color:Y }}>🔥 인기</span>}
              </div>
            </div>
          </div>
        ))}

        {hasMore && !latestLoading && allLatest.length>0 && (
          <div onClick={loadMore} style={{ padding:'16px', textAlign:'center', cursor:'pointer' }}>
            <div style={{ display:'inline-block', padding:'10px 24px', borderRadius:'999px', border:`1.5px solid ${YB}`, fontSize:'13px', fontWeight:700, color:Y, background:YS }}>더 보기 ↓</div>
          </div>
        )}
        {latestLoading && <div style={{ padding:'16px', textAlign:'center', fontSize:'12px', color:'white', opacity:0.3 }}>불러오는 중...</div>}
        {!hasMore && allLatest.length>0 && <div style={{ padding:'16px', textAlign:'center', fontSize:'11px', color:'white', opacity:0.2 }}>모든 투표를 불러왔어요</div>}
      </div>

      <BottomNav />
    </div>
  )
}
