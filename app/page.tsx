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
const CARD_H = 270

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
  const min = Math.floor(diff / 60000)
  const hour = Math.floor(diff / 3600000)
  const day = Math.floor(diff / 86400000)
  if (min < 1) return '방금'
  if (min < 60) return `${min}분 전`
  if (hour < 24) return `${hour}시간 전`
  if (day < 7) return `${day}일 전`
  return `${Math.floor(day/7)}주 전`
}

// 카테고리별 그라디언트
const CAT_GRAD: Record<string, string> = {
  '🎮 게임': 'linear-gradient(135deg, #0d0a2e, #1a0a3e)',
  '🍔 음식': 'linear-gradient(135deg, #2e0a00, #3e1a00)',
  '💄 뷰티': 'linear-gradient(135deg, #2e0a1a, #3e0a2e)',
  '⚽ 스포츠': 'linear-gradient(135deg, #0a1a0d, #0a2e1a)',
  '🎵 음악': 'linear-gradient(135deg, #1a0a2e, #2e0a1a)',
  '📱 테크': 'linear-gradient(135deg, #0a0a2e, #0a1a3e)',
  '🌏 사회': 'linear-gradient(135deg, #1a1a0a, #2e2e0a)',
  '💼 직장': 'linear-gradient(135deg, #0a1a1a, #0a2e2e)',
  '❤️ 연애': 'linear-gradient(135deg, #2e0a0a, #3e0a1a)',
  '🎬 영화': 'linear-gradient(135deg, #0a0a1a, #1a0a2e)',
}
function getCatGrad(cat: string) {
  const key = Object.keys(CAT_GRAD).find(k => cat.includes(k.split(' ')[1] || k))
  return key ? CAT_GRAD[key] : 'linear-gradient(135deg, #0d0d0d, #1a1a1a)'
}

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

// 노란 하트 폭죽
function HeartBurst({ active }: { active: boolean }) {
  if (!active) return null
  const angles = [0, 45, 90, 135, 180, 225, 270, 315]
  return (
    <div style={{ position:'absolute', inset:0, pointerEvents:'none', display:'flex', alignItems:'center', justifyContent:'center', zIndex:10 }}>
      <style>{angles.map((a, i) => `
        @keyframes hb${i}{0%{transform:translate(0,0) scale(1);opacity:1}100%{transform:translate(${Math.round(Math.cos(a*Math.PI/180)*20)}px,${Math.round(Math.sin(a*Math.PI/180)*20)}px) scale(0);opacity:0}}
      `).join('')}</style>
      {angles.map((a, i) => (
        <div key={i} style={{ position:'absolute', width:'5px', height:'5px', borderRadius:'50%', background: i%2===0 ? Y : '#FFE44D', animation:`hb${i} 0.5s ease-out forwards` }} />
      ))}
    </div>
  )
}

export default function Home() {
  const router = useRouter()
  const [votes, setVotes] = useState<Vote[]>([])
  const [hotIdx, setHotIdx] = useState(0)
  const [activeTab, setActiveTab] = useState('🔥 오늘의 이슈')
  const [loading, setLoading] = useState(true)
  const [latestPage, setLatestPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [latestLoading, setLatestLoading] = useState(false)
  const [allLatest, setAllLatest] = useState<Vote[]>([])
  const [voted, setVoted] = useState<Record<string, 'a'|'b'>>({})
  const [liked, setLiked] = useState<Record<string, boolean>>({})
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({})
  const [burstId, setBurstId] = useState<string|null>(null)
  const [commentVoteId, setCommentVoteId] = useState<string|null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [commentText, setCommentText] = useState('')
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [pulling, setPulling] = useState(false)
  const [pullY, setPullY] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const [now, setNow] = useState(Date.now())

  const [cardOffset, setCardOffset] = useState(0)
  const [cardTransition, setCardTransition] = useState(false)
  const cardTouchStartX = useRef(0)
  const cardTouchStartY = useRef(0)
  const cardIsDragging = useRef(false)
  const touchStartY = useRef(0)
  const commentInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadVotes().then(data => {
      setVotes(data)
      setAllLatest(data.filter((v: Vote) => !v.is_realtime).slice(0, 10))
    }).finally(() => setLoading(false))
    try {
      const ex = JSON.parse(localStorage.getItem('versus_voted')||'{}')
      setVoted(ex)
      const lk = JSON.parse(localStorage.getItem('versus_liked')||'{}')
      setLiked(lk)
      const lc = JSON.parse(localStorage.getItem('versus_likecount')||'{}')
      setLikeCounts(lc)
    } catch {}
    const t = setInterval(() => setNow(Date.now()), 1000)
    const channel = supabase.channel('home-votes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'votes' }, () => {
        loadVotes().then(data => {
          setVotes(data)
          setAllLatest(data.filter((v: Vote) => !v.is_realtime).slice(0, 10))
        })
      })
      .subscribe()
    return () => { clearInterval(t); supabase.removeChannel(channel) }
  }, [])

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
    const data = await loadVotes()
    setVotes(data)
    setAllLatest(data.filter((v: Vote) => !v.is_realtime).slice(0, 10))
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
    setAllLatest(prev => prev.map(v => {
      if (v.id!==voteId) return v
      const nt = v.total+1
      const nca = side==='a' ? Math.round(v.pa*v.total/100)+1 : Math.round(v.pa*v.total/100)
      return { ...v, total: nt, pa: Math.round((nca/nt)*100) }
    }))
  }

  function handleLike(voteId: string, e: React.MouseEvent) {
    e.stopPropagation()
    const isNowLiked = !liked[voteId]
    setLiked(p => {
      const next = { ...p, [voteId]: isNowLiked }
      try { localStorage.setItem('versus_liked', JSON.stringify(next)) } catch {}
      return next
    })
    setLikeCounts(p => {
      const next = { ...p, [voteId]: (p[voteId]||0) + (isNowLiked ? 1 : -1) }
      try { localStorage.setItem('versus_likecount', JSON.stringify(next)) } catch {}
      return next
    })
    if (isNowLiked) { setBurstId(voteId); setTimeout(() => setBurstId(null), 500) }
  }

  async function toggleComments(voteId: string, e: React.MouseEvent) {
    e.stopPropagation()
    if (commentVoteId === voteId) { setCommentVoteId(null); return }
    setCommentVoteId(voteId)
    setCommentText('')
    setCommentsLoading(true)
    const { data } = await supabase.from('comments').select('*').eq('vote_id', voteId).order('created_at', { ascending: false }).limit(20)
    if (data) setComments(data)
    setCommentsLoading(false)
    setTimeout(() => commentInputRef.current?.focus(), 100)
  }

  async function handleComment(voteId: string) {
    if (!commentText.trim()) return
    const choice = voted[voteId] || 'a'
    const { data } = await supabase.from('comments').insert({ vote_id: voteId, content: commentText.trim(), choice }).select().single()
    if (data) { setComments(prev => [data, ...prev]); setCommentText('') }
  }

  function onCardTouchStart(e: React.TouchEvent) {
    cardTouchStartX.current = e.touches[0].clientX
    cardTouchStartY.current = e.touches[0].clientY
    cardIsDragging.current = false
    setCardTransition(false)
  }
  function onCardTouchMove(e: React.TouchEvent) {
    const dx = e.touches[0].clientX - cardTouchStartX.current
    const dy = Math.abs(e.touches[0].clientY - cardTouchStartY.current)
    if (Math.abs(dx) > 8 && dy < Math.abs(dx) * 0.5) {
      cardIsDragging.current = true
      const atStart = hotIdx === 0 && dx > 0
      const atEnd = hotIdx === currentVotes.length - 1 && dx < 0
      setCardOffset(dx * ((atStart || atEnd) ? 0.25 : 1))
    }
  }
  function onCardTouchEnd(e: React.TouchEvent) {
    if (!cardIsDragging.current) return
    const dx = cardTouchStartX.current - e.changedTouches[0].clientX
    const dy = Math.abs(cardTouchStartY.current - e.changedTouches[0].clientY)
    if (Math.abs(dx) > 60 && dy < Math.abs(dx) * 0.5) {
      const dir = dx > 0 ? 1 : -1
      const next = hotIdx + dir
      if (next >= 0 && next < currentVotes.length) {
        setCardTransition(true); setCardOffset(-dir * 400)
        setTimeout(() => { setHotIdx(next); setCardTransition(false); setCardOffset(0) }, 250)
        return
      }
    }
    setCardTransition(true); setCardOffset(0)
    setTimeout(() => setCardTransition(false), 250)
    cardIsDragging.current = false
  }

  const weekStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const hotVotes = [...votes].filter(v => v.is_featured).slice(0,10)
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

      <TopBar />

      {/* Pull to refresh */}
      <div style={{ height: pulling||refreshing ? `${Math.min(pullY,60)}px` : '0px', transition: pulling?'none':'height 0.3s', overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <div style={{ fontSize:'12px', color:'white', opacity:0.5, fontWeight:700 }}>
          {refreshing ? '새로고침 중...' : pullY>50 ? '놓으면 새로고침' : '당겨서 새로고침'}
        </div>
      </div>

      {/* ── 위젯 ── */}
      <div style={{ borderBottom:`0.5px solid rgba(255,255,255,0.06)` }}>
        <div style={{ display:'flex', borderBottom:'0.5px solid rgba(255,255,255,0.06)', overflowX:'auto', scrollbarWidth:'none' }}>
          {['🔥 오늘의 이슈','👥 유저의 선택','🏆 레전드'].map(tab => (
            <div key={tab} onClick={() => { setActiveTab(tab); setHotIdx(0); setCardOffset(0) }} style={{
              padding:'10px 14px 9px', fontSize:'12px', whiteSpace:'nowrap', cursor:'pointer', flexShrink:0,
              fontWeight: activeTab===tab ? 900 : 600,
              color: activeTab===tab ? Y : 'white',
              opacity: activeTab===tab ? 1 : 0.35,
              borderBottom: activeTab===tab ? `2.5px solid ${Y}` : '2.5px solid transparent',
            }}>{tab}</div>
          ))}
        </div>

        <div style={{ padding:'12px 14px 0', overflow:'hidden', touchAction:'pan-y' }}
          onTouchStart={onCardTouchStart} onTouchMove={onCardTouchMove} onTouchEnd={onCardTouchEnd}>
          {hot ? (
            <div style={{
              background:'linear-gradient(135deg, #1a1400 0%, #141414 50%, #0f0a00 100%)',
              borderRadius:'14px', padding:'14px',
              border:`1px solid ${YB}`, boxShadow:`0 0 30px rgba(255,215,0,0.08)`,
              position:'relative', overflow:'hidden',
              height:`${CARD_H}px`, display:'flex', flexDirection:'column',
              transform:`translateX(${cardOffset}px)`,
              transition: cardTransition ? 'transform 0.25s cubic-bezier(0.4,0,0.2,1)' : 'none',
              willChange:'transform',
            }}>
              <div style={{ position:'absolute', top:'-60px', left:'50%', transform:'translateX(-50%)', width:'200px', height:'200px', borderRadius:'50%', background:'radial-gradient(circle, rgba(255,215,0,0.06) 0%, transparent 70%)', pointerEvents:'none' }} />
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'8px' }}>
                <span style={{ fontSize:'10px', color:'white', opacity:0.5, fontWeight:700 }}>{hot.category}</span>
                <span style={{ fontSize:'10px', color:'white', opacity:0.3 }}>{hotIdx+1}위</span>
              </div>
              <div onClick={() => router.push(`/vote/${hot.id}`)} style={{ fontSize:'16px', fontWeight:900, color:'white', lineHeight:1.3, marginBottom:'10px', letterSpacing:'-0.025em', cursor:'pointer', flex:'0 0 auto' }}>
                {hot.question}
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', flex:1 }}>
                {([
                  { side:'a' as const, name:hot.option_a, emoji:hot.emoji_a, pct:hot.pa, ac:Y, bg:YS, bd:Y, sh:'rgba(255,215,0,0.25)', label:'A' },
                  { side:'b' as const, name:hot.option_b, emoji:hot.emoji_b, pct:100-hot.pa, ac:R, bg:RS, bd:R, sh:'rgba(255,59,59,0.2)', label:'B' },
                ]).map(opt => (
                  <div key={opt.side} onClick={() => handleVote(hot.id, opt.side)} style={{
                    borderRadius:'12px', padding:'10px 8px', textAlign:'center',
                    cursor: hotIsVoted ? 'default' : 'pointer',
                    border:`2px solid ${hotIsVoted===opt.side ? opt.bd : hotIsVoted ? 'rgba(255,255,255,0.06)' : opt.side==='a' ? 'rgba(255,215,0,0.2)' : 'rgba(255,59,59,0.2)'}`,
                    background: hotIsVoted===opt.side ? opt.bg : hotIsVoted ? 'rgba(255,255,255,0.03)' : opt.side==='a' ? 'rgba(255,215,0,0.05)' : 'rgba(255,59,59,0.05)',
                    boxShadow: hotIsVoted===opt.side ? `0 0 20px ${opt.sh}` : 'none',
                    opacity: hotIsVoted && hotIsVoted!==opt.side ? 0.35 : 1,
                    transition:'all 0.2s',
                    display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
                  }}>
                    <div style={{ fontSize:'20px', marginBottom:'4px' }}>{opt.emoji}</div>
                    <div style={{ fontSize:'9px', fontWeight:900, color: opt.side==='a' ? Y : R, opacity:0.8, marginBottom:'3px', letterSpacing:'0.06em' }}>{opt.label}</div>
                    <div style={{ fontSize:'13px', fontWeight:800, color:'white', marginBottom: hotIsVoted ? '6px' : 0 }}>{opt.name}</div>
                    {hotIsVoted && <div style={{ fontSize:'18px', fontWeight:900, color:opt.ac }}>{opt.pct}%</div>}
                  </div>
                ))}
              </div>
              <div style={{ marginTop:'8px', flexShrink:0 }}>
                {hotIsVoted && (
                  <div style={{ height:'3px', background:'rgba(255,255,255,0.08)', borderRadius:'999px', overflow:'hidden', display:'flex', marginBottom:'6px' }}>
                    <div style={{ width:`${hot.pa}%`, background:Y, transition:'width 0.8s' }} />
                    <div style={{ flex:1, background:R }} />
                  </div>
                )}
                <div style={{ fontSize:'9px', color:'white', opacity:0.35, display:'flex', justifyContent:'space-between' }}>
                  <span>{fmt(hot.total)}명 참여 · {hotIsVoted ? '투표 완료 ✓' : '← 밀어서 다음 →'}</span>
                  <span>{hotIdx+1} / {currentVotes.length}</span>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ background:CARD, borderRadius:'14px', padding:'40px 14px', textAlign:'center', border:`1px solid ${YB}` }}>
              <div style={{ fontSize:'13px', color:'white', opacity:0.4 }}>운영자가 등록한 이슈가 없어요</div>
              <div onClick={() => router.push('/create')} style={{ marginTop:'12px', fontSize:'12px', fontWeight:800, color:'#0A0A0A', padding:'8px 20px', borderRadius:'999px', background:Y, display:'inline-block', cursor:'pointer' }}>
                첫 투표 만들기 →
              </div>
            </div>
          )}
        </div>

        <div style={{ display:'flex', justifyContent:'center', gap:'4px', padding:'10px 0 12px' }}>
          {currentVotes.map((_,i) => (
            <div key={i} onClick={() => { setHotIdx(i); setCardOffset(0) }} style={{
              width: i===hotIdx ? '16px' : '5px', height:'5px', borderRadius:'999px', cursor:'pointer',
              background: i===hotIdx ? Y : 'rgba(255,255,255,0.15)', transition:'all 0.25s',
            }} />
          ))}
        </div>
      </div>

      {/* ── 실시간 결정 ── */}
      <div style={{ padding:'12px 0 14px', borderBottom:'0.5px solid rgba(255,255,255,0.06)', marginTop:'2px' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 16px', marginBottom:'12px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'5px' }}>
            <div style={{ width:'7px', height:'7px', borderRadius:'50%', background:Y }} />
            <span style={{ fontSize:'14px', fontWeight:900, color:'white' }}>⚡ 실시간 결정</span>
            <span style={{ fontSize:'11px', fontWeight:700, color:Y }}>{realtimeVotes.length}개</span>
          </div>
          <span onClick={() => router.push('/realtime')} style={{ fontSize:'11px', color:'white', opacity:0.4, cursor:'pointer' }}>더보기 ›</span>
        </div>
        <div style={{ display:'flex', gap:'10px', padding:'0 16px', overflowX:'auto', scrollbarWidth:'none' }}>
          <div onClick={() => router.push('/realtime/new')} style={{ flexShrink:0, width:'110px', background:CARD, borderRadius:'14px', padding:'12px', border:`1.5px dashed ${YB}`, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'6px', cursor:'pointer' }}>
            <div style={{ width:'32px', height:'32px', borderRadius:'50%', background:YS, border:`1.5px solid ${YB}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'18px' }}>💭</div>
            <div style={{ fontSize:'11px', fontWeight:900, color:'white', textAlign:'center', lineHeight:1.4 }}>내 고민<br />올리기</div>
            <div style={{ fontSize:'8px', color:'white', opacity:0.4 }}>1시간 후 삭제</div>
            <div style={{ background:Y, color:'#0A0A0A', borderRadius:'999px', padding:'4px 10px', fontSize:'9px', fontWeight:900 }}>+ 올리기</div>
          </div>
          {realtimeVotes.map(v => {
            const isVoted = voted[v.id]
            const timeLeft = v.expires_at ? new Date(v.expires_at).getTime() - now : 0
            const urgent = timeLeft > 0 && timeLeft < 300000
            return (
              <div key={v.id} style={{ flexShrink:0, width:'200px', background:CARD, borderRadius:'14px', padding:'12px', border:`1px solid ${YB}`, position:'relative' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'8px' }}>
                  <div style={{ display:'inline-flex', alignItems:'center', gap:'3px', background:YS, borderRadius:'999px', padding:'2px 7px', border:`1px solid ${YB}` }}>
                    <div style={{ width:'4px', height:'4px', borderRadius:'50%', background:Y }} />
                    <span style={{ fontSize:'7px', fontWeight:900, color:Y }}>LIVE</span>
                  </div>
                  <span style={{ fontSize:'15px', fontWeight:900, color: timeLeft<=0 ? 'white' : urgent ? R : Y, opacity: timeLeft<=0 ? 0.4 : 1 }}>⏱ {fmtTimer(timeLeft)}</span>
                </div>
                <div style={{ fontSize:'9px', color:'white', opacity:0.4, marginBottom:'5px' }}>{fmt(v.total)}명 참여</div>
                <div onClick={() => router.push(`/vote/${v.id}`)} style={{ fontSize:'12px', fontWeight:900, color:'white', lineHeight:1.35, marginBottom:'10px', cursor:'pointer' }}>{v.question}</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'6px', marginBottom:'8px' }}>
                  {([
                    { side:'a' as const, name:v.option_a, emoji:v.emoji_a, pct:v.pa, ac:Y, bg:YS, bd:Y },
                    { side:'b' as const, name:v.option_b, emoji:v.emoji_b, pct:100-v.pa, ac:R, bg:RS, bd:R },
                  ]).map(opt => (
                    <div key={opt.side} onClick={() => handleVote(v.id, opt.side)} style={{
                      background: isVoted===opt.side ? opt.bg : 'rgba(255,255,255,0.04)',
                      border:`1.5px solid ${isVoted===opt.side ? opt.bd : 'rgba(255,255,255,0.08)'}`,
                      borderRadius:'8px', padding:'8px 4px', textAlign:'center',
                      cursor: isVoted ? 'default' : 'pointer',
                      opacity: isVoted && isVoted!==opt.side ? 0.35 : 1, transition:'all 0.2s',
                    }}>
                      <div style={{ fontSize:'16px', marginBottom:'3px' }}>{opt.emoji}</div>
                      <div style={{ fontSize:'9px', fontWeight:700, color:'white', marginBottom:'3px' }}>{opt.name}</div>
                      <div style={{ fontSize:'13px', fontWeight:900, color:opt.ac }}>{opt.pct}%</div>
                    </div>
                  ))}
                </div>
                <div style={{ height:'2px', background:'rgba(255,255,255,0.08)', borderRadius:'999px', overflow:'hidden', display:'flex' }}>
                  <div style={{ width:`${v.pa}%`, background:Y, transition:'width 0.5s' }} />
                  <div style={{ flex:1, background:R }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── 최신 투표 (카드형) ── */}
      <div style={{ marginTop:'2px', paddingBottom:'100px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'14px 16px 10px' }}>
          <span style={{ fontSize:'14px', fontWeight:900, color:'white' }}>🆕 최신 투표</span>
          <span style={{ fontSize:'11px', color:'white', opacity:0.35 }}>{allLatest.length}개</span>
        </div>

        {allLatest.length===0 && (
          <div style={{ padding:'40px 16px', textAlign:'center', fontSize:'13px', color:'white', opacity:0.4 }}>아직 투표가 없어요</div>
        )}

        <div style={{ display:'flex', flexDirection:'column', gap:'10px', padding:'0 14px' }}>
          {allLatest.map(v => {
            const isVoted = voted[v.id]
            const isCommentOpen = commentVoteId === v.id
            const ca = Math.round(v.pa * v.total / 100)
            const cb = v.total - ca
            const grad = getCatGrad(v.category)

            return (
              <div key={v.id} style={{
                borderRadius:'16px', overflow:'hidden',
                border:`1px solid rgba(255,255,255,0.08)`,
                background: CARD,
              }}>
                {/* 썸네일 헤더 - 이모지 그라디언트 */}
                <div style={{
                  background: grad,
                  padding:'16px 16px 12px',
                  position:'relative',
                }}>
                  {/* 카테고리 + 시간 */}
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px' }}>
                    <span style={{ fontSize:'10px', fontWeight:800, color:'rgba(255,255,255,0.5)', letterSpacing:'0.04em' }}>{v.category}</span>
                    <span style={{ fontSize:'9px', color:'rgba(255,255,255,0.3)' }}>{timeAgo(v.created_at)}</span>
                  </div>

                  {/* 질문 */}
                  <div style={{ fontSize:'15px', fontWeight:900, color:'white', lineHeight:1.35, marginBottom:'14px', letterSpacing:'-0.02em' }}>
                    {v.question}
                  </div>

                  {/* 이모지 큰 배지 */}
                  <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'6px', background:'rgba(255,255,255,0.08)', borderRadius:'999px', padding:'6px 12px', border:'1px solid rgba(255,215,0,0.2)' }}>
                      <span style={{ fontSize:'18px' }}>{v.emoji_a}</span>
                      <span style={{ fontSize:'12px', fontWeight:800, color:Y }}>{v.option_a}</span>
                    </div>
                    <span style={{ fontSize:'11px', fontWeight:900, color:'rgba(255,255,255,0.2)' }}>vs</span>
                    <div style={{ display:'flex', alignItems:'center', gap:'6px', background:'rgba(255,255,255,0.08)', borderRadius:'999px', padding:'6px 12px', border:'1px solid rgba(255,59,59,0.2)' }}>
                      <span style={{ fontSize:'18px' }}>{v.emoji_b}</span>
                      <span style={{ fontSize:'12px', fontWeight:800, color:R }}>{v.option_b}</span>
                    </div>
                  </div>
                </div>

                {/* 투표 버튼 영역 */}
                <div style={{ padding:'12px 14px', borderBottom:'0.5px solid rgba(255,255,255,0.06)' }}>
                  {!isVoted ? (
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
                      {([
                        { side:'a' as const, name:v.option_a, emoji:v.emoji_a, color:Y, bg:YS, bd:YB },
                        { side:'b' as const, name:v.option_b, emoji:v.emoji_b, color:R, bg:RS, bd:RB },
                      ]).map(opt => (
                        <div key={opt.side} onClick={e => { e.stopPropagation(); handleVote(v.id, opt.side) }} style={{
                          borderRadius:'10px', padding:'10px',
                          display:'flex', alignItems:'center', gap:'8px',
                          border:`1.5px solid rgba(255,255,255,0.08)`,
                          background:'rgba(255,255,255,0.04)',
                          cursor:'pointer', transition:'all 0.2s',
                        }}>
                          <span style={{ fontSize:'20px' }}>{opt.emoji}</span>
                          <div>
                            <div style={{ fontSize:'8px', color:opt.color, fontWeight:800, marginBottom:'1px' }}>{opt.side.toUpperCase()}</div>
                            <div style={{ fontSize:'12px', fontWeight:800, color:'white' }}>{opt.name}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
                      {([
                        { side:'a' as const, name:v.option_a, emoji:v.emoji_a, pct:v.pa, cnt:ca, color:Y, bg:YS, bd:YB },
                        { side:'b' as const, name:v.option_b, emoji:v.emoji_b, pct:100-v.pa, cnt:cb, color:R, bg:RS, bd:RB },
                      ]).map(opt => (
                        <div key={opt.side} style={{
                          borderRadius:'10px', padding:'10px',
                          display:'flex', alignItems:'center', gap:'8px',
                          border:`1.5px solid ${isVoted===opt.side ? opt.bd : 'rgba(255,255,255,0.05)'}`,
                          background: isVoted===opt.side ? opt.bg : 'rgba(255,255,255,0.02)',
                          opacity: isVoted!==opt.side ? 0.4 : 1,
                          position:'relative', overflow:'hidden',
                        }}>
                          {/* 진행바 */}
                          <div style={{ position:'absolute', left:0, top:0, bottom:0, width:`${opt.pct}%`, background: isVoted===opt.side ? (opt.side==='a' ? 'rgba(255,215,0,0.06)' : 'rgba(255,59,59,0.06)') : 'transparent', transition:'width 0.8s' }} />
                          <span style={{ fontSize:'20px' }}>{opt.emoji}</span>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontSize:'12px', fontWeight:800, color:'white', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{opt.name}</div>
                            <div style={{ fontSize:'10px', color:'rgba(255,255,255,0.35)' }}>{fmt(opt.cnt)}명</div>
                          </div>
                          <div style={{ fontSize:'16px', fontWeight:900, color:opt.color, flexShrink:0 }}>{opt.pct}%</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 진행바 */}
                  {isVoted && (
                    <div style={{ height:'2px', background:'rgba(255,255,255,0.06)', borderRadius:'999px', overflow:'hidden', display:'flex', marginTop:'8px' }}>
                      <div style={{ width:`${v.pa}%`, background:Y, transition:'width 0.8s' }} />
                      <div style={{ flex:1, background:R }} />
                    </div>
                  )}
                </div>

                {/* 하단 바 - 참여인원 + 댓글 + 하트 */}
                <div style={{ padding:'10px 14px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                    <span style={{ fontSize:'10px', color:'rgba(255,255,255,0.35)' }}>👥 {fmt(v.total)}명</span>
                    {v.total > 100 && <span style={{ fontSize:'8px', fontWeight:800, padding:'2px 7px', borderRadius:'999px', background:YS, color:Y }}>인기</span>}
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
                    {/* 댓글 버튼 - 투표 안 해도 볼 수 있음 */}
                    <div onClick={e => toggleComments(v.id, e)} style={{ display:'flex', alignItems:'center', gap:'4px', cursor:'pointer' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={isCommentOpen ? Y : 'rgba(255,255,255,0.4)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                      </svg>
                      <span style={{ fontSize:'10px', color: isCommentOpen ? Y : 'rgba(255,255,255,0.4)', fontWeight:700 }}>댓글</span>
                    </div>
                    {/* 하트 - 노란색 */}
                    <div onClick={e => handleLike(v.id, e)} style={{ display:'flex', alignItems:'center', gap:'4px', cursor:'pointer', position:'relative' }}>
                      <HeartBurst active={burstId===v.id} />
                      <svg width="14" height="14" viewBox="0 0 24 24"
                        fill={liked[v.id] ? Y : 'none'}
                        stroke={liked[v.id] ? Y : 'rgba(255,255,255,0.4)'}
                        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
                      </svg>
                      <span style={{ fontSize:'10px', fontWeight:800, color: liked[v.id] ? Y : 'rgba(255,255,255,0.35)', minWidth:'14px' }}>
                        {(likeCounts[v.id]||0) > 0 ? likeCounts[v.id] : ''}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 댓글창 - 투표 안 해도 볼 수 있음, 작성은 투표 후 */}
                {isCommentOpen && (
                  <div style={{ borderTop:'0.5px solid rgba(255,255,255,0.06)', background:'rgba(255,255,255,0.02)', padding:'10px 14px' }}>
                    <div style={{ maxHeight:'150px', overflowY:'auto', marginBottom:'8px' }}>
                      {commentsLoading ? (
                        <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.3)', textAlign:'center', padding:'10px' }}>불러오는 중...</div>
                      ) : comments.length===0 ? (
                        <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.3)', textAlign:'center', padding:'10px' }}>
                          {isVoted ? '첫 댓글을 달아보세요! 👋' : '댓글이 없어요. 투표 후 첫 댓글을 달아보세요!'}
                        </div>
                      ) : comments.map(c => (
                        <div key={c.id} style={{ display:'flex', gap:'8px', marginBottom:'10px', alignItems:'flex-start' }}>
                          <div style={{ width:'20px', height:'20px', borderRadius:'50%', flexShrink:0, background: c.choice==='a' ? YS : RS, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'8px', fontWeight:800, color: c.choice==='a' ? Y : R }}>익</div>
                          <div style={{ flex:1 }}>
                            <span style={{ fontSize:'8px', fontWeight:800, color: c.choice==='a' ? Y : R }}>{c.choice==='a' ? v.option_a : v.option_b}파 </span>
                            <span style={{ fontSize:'12px', color:'rgba(255,255,255,0.85)' }}>{c.content}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    {/* 댓글 입력 - 투표 후에만 작성 가능 */}
                    <div style={{ display:'flex', gap:'6px', alignItems:'center' }}>
                      <input
                        ref={isCommentOpen ? commentInputRef : undefined}
                        value={commentText}
                        onChange={e => setCommentText(e.target.value)}
                        placeholder={isVoted ? '댓글 달기...' : '투표 후 댓글을 달 수 있어요'}
                        disabled={!isVoted}
                        onKeyDown={e => e.key==='Enter' && handleComment(v.id)}
                        style={{
                          flex:1, background:'rgba(255,255,255,0.07)',
                          border:'0.5px solid rgba(255,255,255,0.1)',
                          borderRadius:'999px', padding:'9px 14px',
                          fontSize:'12px', color: isVoted ? 'white' : 'rgba(255,255,255,0.3)',
                          outline:'none', fontFamily:font,
                        }}
                      />
                      {isVoted && (
                        <div onClick={() => handleComment(v.id)} style={{ width:'32px', height:'32px', borderRadius:'50%', flexShrink:0, background: commentText ? Y : 'rgba(255,255,255,0.08)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', transition:'all 0.2s' }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={commentText ? '#0A0A0A' : 'rgba(255,255,255,0.3)'} strokeWidth="2.5" strokeLinecap="round">
                            <line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>
                          </svg>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

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
