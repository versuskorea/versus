'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import BottomNav from '@/components/BottomNav'
import TopBar from '@/components/TopBar'
import { supabase } from '@/lib/supabase'

const BG = '#F5F5F7'
const WHITE = '#FFFFFF'
const Y = '#FFD700'
const YD = '#B8860B'
const YS = 'rgba(255,215,0,0.15)'
const YB = 'rgba(255,215,0,0.4)'
const R = '#FF3B3B'
const RD = '#CC2222'
const RS = 'rgba(255,59,59,0.1)'
const RB = 'rgba(255,59,59,0.3)'
const DARK = '#0A0A0A'
const GRAY = '#8E8E93'
const LGRAY = '#E5E5EA'
const font = '-apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif'
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
  const angles = [0,45,90,135,180,225,270,315]
  return (
    <div style={{ position:'absolute', inset:0, pointerEvents:'none', display:'flex', alignItems:'center', justifyContent:'center', zIndex:10 }}>
      <style>{angles.map((a,i) => `@keyframes hb${i}{0%{transform:translate(0,0) scale(1);opacity:1}100%{transform:translate(${Math.round(Math.cos(a*Math.PI/180)*20)}px,${Math.round(Math.sin(a*Math.PI/180)*20)}px) scale(0);opacity:0}}`).join('')}</style>
      {angles.map((a,i) => (
        <div key={i} style={{ position:'absolute', width:'5px', height:'5px', borderRadius:'50%', background:i%2===0?Y:'#FFE44D', animation:`hb${i} 0.5s ease-out forwards` }} />
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
  const [voted, setVoted] = useState<Record<string,'a'|'b'>>({})
  const [liked, setLiked] = useState<Record<string,boolean>>({})
  const [likeCounts, setLikeCounts] = useState<Record<string,number>>({})
  const [burstId, setBurstId] = useState<string|null>(null)
  const [openCommentId, setOpenCommentId] = useState<string|null>(null)
  const [commentsByVote, setCommentsByVote] = useState<Record<string,Comment[]>>({})
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
      const ex = JSON.parse(localStorage.getItem('versus_voted')||'{}'); setVoted(ex)
      const lk = JSON.parse(localStorage.getItem('versus_liked')||'{}'); setLiked(lk)
      const lc = JSON.parse(localStorage.getItem('versus_likecount')||'{}'); setLikeCounts(lc)
    } catch {}
    const t = setInterval(() => setNow(Date.now()), 1000)
    const channel = supabase.channel('home-votes')
      .on('postgres_changes', { event:'*', schema:'public', table:'votes' }, () => {
        loadVotes().then(data => {
          setVotes(data)
          setAllLatest(data.filter((v: Vote) => !v.is_realtime).slice(0, 10))
        })
      }).subscribe()
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

  function onTouchStart(e: React.TouchEvent) { if (window.scrollY===0) touchStartY.current = e.touches[0].clientY }
  function onTouchMove(e: React.TouchEvent) {
    if (window.scrollY===0) { const dy = e.touches[0].clientY - touchStartY.current; if (dy>0 && dy<80) { setPullY(dy); setPulling(true) } }
  }
  async function onTouchEnd() { if (pullY>50) await handleRefresh(); setPullY(0); setPulling(false) }

  async function handleVote(voteId: string, side: 'a'|'b') {
    if (voted[voteId]) return
    setVoted(p => { const n={...p,[voteId]:side}; try{const ex=JSON.parse(localStorage.getItem('versus_voted')||'{}');ex[voteId]=side;localStorage.setItem('versus_voted',JSON.stringify(n))}catch{}; return n })
    await supabase.from('vote_results').insert({ vote_id: voteId, choice: side })
    const update = (arr: Vote[]) => arr.map(v => {
      if (v.id!==voteId) return v
      const nt = v.total+1
      const nca = side==='a' ? Math.round(v.pa*v.total/100)+1 : Math.round(v.pa*v.total/100)
      return { ...v, total: nt, pa: Math.round((nca/nt)*100) }
    })
    setVotes(update); setAllLatest(update)
  }

  function handleLike(voteId: string, e: React.MouseEvent) {
    e.stopPropagation()
    const isNowLiked = !liked[voteId]
    setLiked(p => { const n={...p,[voteId]:isNowLiked}; try{localStorage.setItem('versus_liked',JSON.stringify(n))}catch{}; return n })
    setLikeCounts(p => { const n={...p,[voteId]:(p[voteId]||0)+(isNowLiked?1:-1)}; try{localStorage.setItem('versus_likecount',JSON.stringify(n))}catch{}; return n })
    if (isNowLiked) { setBurstId(voteId); setTimeout(()=>setBurstId(null),500) }
  }

  async function toggleComments(voteId: string, e: React.MouseEvent) {
    e.stopPropagation()
    if (openCommentId===voteId) { setOpenCommentId(null); return }
    setOpenCommentId(voteId); setCommentText('')
    if (!commentsByVote[voteId]) {
      setCommentsLoading(true)
      const { data } = await supabase.from('comments').select('*').eq('vote_id', voteId).order('created_at', { ascending: false }).limit(20)
      if (data) setCommentsByVote(prev => ({ ...prev, [voteId]: data }))
      setCommentsLoading(false)
    }
    setTimeout(() => commentInputRef.current?.focus(), 150)
  }

  async function handleComment(voteId: string, e?: React.MouseEvent) {
    e?.stopPropagation()
    if (!commentText.trim() || !voted[voteId]) return
    const choice = voted[voteId]
    const { data } = await supabase.from('comments').insert({ vote_id: voteId, content: commentText.trim(), choice }).select().single()
    if (data) { setCommentsByVote(prev => ({ ...prev, [voteId]: [data, ...(prev[voteId]||[])] })); setCommentText('') }
  }

  function onCardTouchStart(e: React.TouchEvent) { cardTouchStartX.current=e.touches[0].clientX; cardTouchStartY.current=e.touches[0].clientY; cardIsDragging.current=false; setCardTransition(false) }
  function onCardTouchMove(e: React.TouchEvent) {
    const dx=e.touches[0].clientX-cardTouchStartX.current; const dy=Math.abs(e.touches[0].clientY-cardTouchStartY.current)
    if (Math.abs(dx)>8&&dy<Math.abs(dx)*0.5) {
      cardIsDragging.current=true
      const atStart=hotIdx===0&&dx>0; const atEnd=hotIdx===currentVotes.length-1&&dx<0
      setCardOffset(dx*((atStart||atEnd)?0.25:1))
    }
  }
  function onCardTouchEnd(e: React.TouchEvent) {
    if (!cardIsDragging.current) return
    const dx=cardTouchStartX.current-e.changedTouches[0].clientX; const dy=Math.abs(cardTouchStartY.current-e.changedTouches[0].clientY)
    if (Math.abs(dx)>60&&dy<Math.abs(dx)*0.5) {
      const dir=dx>0?1:-1; const next=hotIdx+dir
      if (next>=0&&next<currentVotes.length) { setCardTransition(true); setCardOffset(-dir*400); setTimeout(()=>{setHotIdx(next);setCardTransition(false);setCardOffset(0)},250); return }
    }
    setCardTransition(true); setCardOffset(0); setTimeout(()=>setCardTransition(false),250); cardIsDragging.current=false
  }

  const weekStart = new Date(Date.now()-7*24*60*60*1000).toISOString()
  const hotVotes = [...votes].filter(v=>v.is_featured).slice(0,10)
  const userVotes = [...votes].filter(v=>!v.is_realtime&&v.created_at>=weekStart).sort((a,b)=>b.total-a.total).slice(0,5)
  const legendVotes = [...votes].filter(v=>!v.is_realtime&&v.total>0).sort((a,b)=>b.total-a.total).slice(0,10)
  const realtimeVotes = votes.filter(v=>v.is_realtime).slice(0,5)
  const tabVotes: Record<string,Vote[]> = { '🔥 오늘의 이슈':hotVotes, '👥 유저의 선택':userVotes, '🏆 레전드':legendVotes }
  const currentVotes = tabVotes[activeTab]
  const hot = currentVotes[hotIdx % Math.max(currentVotes.length,1)]
  const hotIsVoted = hot ? voted[hot.id] : null

  if (loading) return (
    <div style={{ maxWidth:'390px', margin:'0 auto', minHeight:'100vh', background:BG, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:font }}>
      <div style={{ fontSize:'14px', color:GRAY }}>불러오는 중...</div>
    </div>
  )

  return (
    <div onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
      style={{ maxWidth:'390px', margin:'0 auto', minHeight:'100vh', background:BG, fontFamily:font }}>

      {/* TopBar - 화이트 */}
      <div style={{ background:WHITE, borderBottom:`1px solid ${LGRAY}`, position:'sticky', top:0, zIndex:50 }}>
        <TopBar />
      </div>

      {/* Pull to refresh */}
      <div style={{ height:pulling||refreshing?`${Math.min(pullY,50)}px`:'0px', transition:pulling?'none':'height 0.3s', overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center', background:BG }}>
        <div style={{ fontSize:'12px', color:GRAY }}>{refreshing?'새로고침 중...':pullY>50?'놓으면 새로고침':'↓ 새로고침'}</div>
      </div>

      {/* ── 핫이슈 위젯 ── */}
      <div style={{ background:WHITE, marginBottom:'8px' }}>
        {/* 탭 */}
        <div style={{ display:'flex', borderBottom:`1px solid ${LGRAY}`, overflowX:'auto', scrollbarWidth:'none' }}>
          {['🔥 오늘의 이슈','👥 유저의 선택','🏆 레전드'].map(tab => (
            <div key={tab} onClick={() => { setActiveTab(tab); setHotIdx(0); setCardOffset(0) }} style={{
              padding:'12px 14px 11px', fontSize:'12px', whiteSpace:'nowrap', cursor:'pointer', flexShrink:0,
              fontWeight:activeTab===tab?800:500,
              color:activeTab===tab?DARK:GRAY,
              borderBottom:activeTab===tab?`2.5px solid ${DARK}`:'2.5px solid transparent',
            }}>{tab}</div>
          ))}
        </div>

        {/* 핫 카드 */}
        <div style={{ padding:'14px 14px 0', overflow:'hidden' }}
          onTouchStart={onCardTouchStart} onTouchMove={onCardTouchMove} onTouchEnd={onCardTouchEnd}>
          {hot ? (
            <div style={{
              background: DARK,
              borderRadius:'16px', padding:'16px',
              position:'relative', overflow:'hidden',
              height:`${CARD_H}px`, display:'flex', flexDirection:'column',
              transform:`translateX(${cardOffset}px)`,
              transition:cardTransition?'transform 0.25s cubic-bezier(0.4,0,0.2,1)':'none',
              willChange:'transform',
            }}>
              {/* 골드 글로우 */}
              <div style={{ position:'absolute', top:'-80px', right:'-40px', width:'200px', height:'200px', borderRadius:'50%', background:'radial-gradient(circle, rgba(255,215,0,0.12) 0%, transparent 70%)', pointerEvents:'none' }} />

              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px' }}>
                <span style={{ fontSize:'11px', fontWeight:700, color:'rgba(255,255,255,0.5)', letterSpacing:'0.02em' }}>{hot.category}</span>
                <span style={{ fontSize:'10px', color:'rgba(255,255,255,0.3)' }}>{hotIdx+1} / {currentVotes.length}</span>
              </div>

              <div onClick={() => router.push(`/vote/${hot.id}`)} style={{ fontSize:'17px', fontWeight:900, color:'white', lineHeight:1.3, marginBottom:'12px', letterSpacing:'-0.03em', cursor:'pointer', flex:'0 0 auto' }}>
                {hot.question}
              </div>

              {/* AB 버튼 */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', flex:1 }}>
                {([
                  { side:'a' as const, name:hot.option_a, emoji:hot.emoji_a, pct:hot.pa, label:'A', ac:Y, bg:'rgba(255,215,0,0.15)', bd:Y },
                  { side:'b' as const, name:hot.option_b, emoji:hot.emoji_b, pct:100-hot.pa, label:'B', ac:'#FF6B9D', bg:'rgba(255,107,157,0.15)', bd:'#FF6B9D' },
                ]).map(opt => (
                  <div key={opt.side} onClick={() => handleVote(hot.id, opt.side)} style={{
                    borderRadius:'12px', padding:'12px 8px', textAlign:'center',
                    cursor:hotIsVoted?'default':'pointer',
                    border:`1.5px solid ${hotIsVoted===opt.side?opt.bd:'rgba(255,255,255,0.1)'}`,
                    background:hotIsVoted===opt.side?opt.bg:'rgba(255,255,255,0.06)',
                    opacity:hotIsVoted&&hotIsVoted!==opt.side?0.3:1,
                    transition:'all 0.25s',
                    display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
                  }}>
                    <div style={{ fontSize:'22px', marginBottom:'5px' }}>{opt.emoji}</div>
                    <div style={{ fontSize:'8px', fontWeight:900, color:opt.ac, marginBottom:'3px', letterSpacing:'0.1em' }}>{opt.label}</div>
                    <div style={{ fontSize:'13px', fontWeight:700, color:'white', marginBottom:hotIsVoted?'6px':0 }}>{opt.name}</div>
                    {hotIsVoted && <div style={{ fontSize:'20px', fontWeight:900, color:opt.ac }}>{opt.pct}%</div>}
                  </div>
                ))}
              </div>

              <div style={{ marginTop:'10px', flexShrink:0 }}>
                {hotIsVoted && (
                  <div style={{ height:'3px', background:'rgba(255,255,255,0.1)', borderRadius:'999px', overflow:'hidden', display:'flex', marginBottom:'6px' }}>
                    <div style={{ width:`${hot.pa}%`, background:Y, transition:'width 0.8s' }} />
                    <div style={{ flex:1, background:'#FF6B9D' }} />
                  </div>
                )}
                <div style={{ fontSize:'10px', color:'rgba(255,255,255,0.3)', display:'flex', justifyContent:'space-between' }}>
                  <span>{fmt(hot.total)}명 참여 · {hotIsVoted?'✓ 투표 완료':'← 밀어서 다음 →'}</span>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ background:LGRAY, borderRadius:'16px', padding:'40px 14px', textAlign:'center' }}>
              <div style={{ fontSize:'13px', color:GRAY }}>등록된 핫이슈가 없어요</div>
            </div>
          )}
        </div>

        {/* 인디케이터 */}
        <div style={{ display:'flex', justifyContent:'center', gap:'4px', padding:'12px 0 14px' }}>
          {currentVotes.map((_,i) => (
            <div key={i} onClick={() => { setHotIdx(i); setCardOffset(0) }} style={{
              width:i===hotIdx?'20px':'5px', height:'5px', borderRadius:'999px', cursor:'pointer',
              background:i===hotIdx?DARK:LGRAY, transition:'all 0.25s',
            }} />
          ))}
        </div>
      </div>

      {/* ── 실시간 결정 ── */}
      <div style={{ background:WHITE, marginBottom:'8px', paddingBottom:'14px' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 16px 12px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
            <div style={{ width:'6px', height:'6px', borderRadius:'50%', background:R }} />
            <span style={{ fontSize:'14px', fontWeight:800, color:DARK }}>실시간 결정</span>
            <span style={{ fontSize:'11px', fontWeight:700, color:R, background:RS, padding:'2px 7px', borderRadius:'999px' }}>{realtimeVotes.length}</span>
          </div>
          <span onClick={() => router.push('/realtime')} style={{ fontSize:'12px', color:GRAY, cursor:'pointer' }}>더보기 →</span>
        </div>

        <div style={{ display:'flex', gap:'10px', padding:'0 16px', overflowX:'auto', scrollbarWidth:'none' }}>
          <div onClick={() => router.push('/realtime/new')} style={{ flexShrink:0, width:'100px', borderRadius:'14px', padding:'14px 10px', border:`1.5px dashed ${LGRAY}`, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'8px', cursor:'pointer', background:BG }}>
            <div style={{ fontSize:'24px' }}>💭</div>
            <div style={{ fontSize:'11px', fontWeight:700, color:DARK, textAlign:'center', lineHeight:1.4 }}>고민<br />올리기</div>
            <div style={{ background:DARK, color:'white', borderRadius:'999px', padding:'4px 10px', fontSize:'9px', fontWeight:800 }}>+ 올리기</div>
          </div>

          {realtimeVotes.map(v => {
            const isVoted = voted[v.id]
            const timeLeft = v.expires_at ? new Date(v.expires_at).getTime()-now : 0
            const urgent = timeLeft>0&&timeLeft<300000
            return (
              <div key={v.id} style={{ flexShrink:0, width:'190px', background:BG, borderRadius:'14px', padding:'12px', border:`1px solid ${LGRAY}` }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'8px' }}>
                  <span style={{ fontSize:'7px', fontWeight:900, color:R, background:RS, padding:'2px 7px', borderRadius:'999px' }}>LIVE</span>
                  <span style={{ fontSize:'13px', fontWeight:800, color:urgent?R:DARK }}>{fmtTimer(timeLeft)}</span>
                </div>
                <div style={{ fontSize:'9px', color:GRAY, marginBottom:'5px' }}>{fmt(v.total)}명 참여</div>
                <div onClick={() => router.push(`/vote/${v.id}`)} style={{ fontSize:'12px', fontWeight:800, color:DARK, lineHeight:1.35, marginBottom:'10px', cursor:'pointer' }}>{v.question}</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'6px' }}>
                  {([
                    { side:'a' as const, name:v.option_a, emoji:v.emoji_a, pct:v.pa, c:'#FFD700' },
                    { side:'b' as const, name:v.option_b, emoji:v.emoji_b, pct:100-v.pa, c:'#FF6B9D' },
                  ]).map(opt => (
                    <div key={opt.side} onClick={() => handleVote(v.id, opt.side)} style={{
                      background:isVoted===opt.side?'#F0F0F0':WHITE,
                      border:`1px solid ${isVoted===opt.side?DARK:LGRAY}`,
                      borderRadius:'8px', padding:'8px 4px', textAlign:'center',
                      cursor:isVoted?'default':'pointer',
                      opacity:isVoted&&isVoted!==opt.side?0.4:1, transition:'all 0.2s',
                    }}>
                      <div style={{ fontSize:'14px', marginBottom:'2px' }}>{opt.emoji}</div>
                      <div style={{ fontSize:'9px', fontWeight:700, color:DARK }}>{opt.name}</div>
                      {isVoted && <div style={{ fontSize:'12px', fontWeight:900, color:DARK, marginTop:'2px' }}>{opt.pct}%</div>}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── 최신 투표 (카드형) ── */}
      <div style={{ background:WHITE, paddingBottom:'100px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'14px 16px 10px', borderBottom:`1px solid ${LGRAY}` }}>
          <span style={{ fontSize:'15px', fontWeight:800, color:DARK }}>최신 투표</span>
          <span style={{ fontSize:'11px', color:GRAY }}>{allLatest.length}개</span>
        </div>

        {allLatest.length===0 && (
          <div style={{ padding:'40px 16px', textAlign:'center', fontSize:'13px', color:GRAY }}>아직 투표가 없어요</div>
        )}

        {allLatest.map((v, idx) => {
          const isVoted = voted[v.id]
          const isCommentOpen = openCommentId===v.id
          const vComments = commentsByVote[v.id] || []
          const ca = Math.round(v.pa*v.total/100)
          const cb = v.total - ca

          return (
            <div key={v.id} style={{ borderBottom:`1px solid ${LGRAY}` }}>
              <div style={{ padding:'16px 16px 12px' }}>

                {/* 헤더 */}
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px' }}>
                  <span
                    onClick={e => { e.stopPropagation(); router.push(`/category/${encodeURIComponent(v.category)}`) }}
                    style={{ fontSize:'11px', fontWeight:700, color:GRAY, cursor:'pointer', background:BG, padding:'3px 10px', borderRadius:'999px' }}>
                    {v.category}
                  </span>
                  <span style={{ fontSize:'10px', color:GRAY }}>{timeAgo(v.created_at)}</span>
                </div>

                {/* 질문 → 투표 페이지 */}
                <div
                  onClick={() => router.push(`/vote/${v.id}`)}
                  style={{ fontSize:'16px', fontWeight:800, color:DARK, lineHeight:1.4, marginBottom:'16px', letterSpacing:'-0.02em', cursor:'pointer' }}>
                  {v.question}
                </div>

                {/* AB 동그란 버튼 */}
                <div style={{ display:'flex', gap:'12px', alignItems:'center', justifyContent:'center', marginBottom:'14px' }}>
                  {([
                    { side:'a' as const, name:v.option_a, emoji:v.emoji_a, pct:v.pa, cnt:ca, color:YD, bg:YS, bd:'#FFD700', label:'A' },
                    { side:'b' as const, name:v.option_b, emoji:v.emoji_b, pct:100-v.pa, cnt:cb, color:'#CC1F6A', bg:'rgba(255,107,157,0.1)', bd:'#FF6B9D', label:'B' },
                  ]).map(opt => {
                    const isSelected = isVoted===opt.side
                    const isOther = isVoted && !isSelected
                    return (
                      <div key={opt.side}
                        onClick={e => { e.stopPropagation(); handleVote(v.id, opt.side) }}
                        style={{
                          display:'flex', flexDirection:'column', alignItems:'center', gap:'6px',
                          cursor:isVoted?'default':'pointer',
                          transition:'all 0.3s',
                          opacity:isOther?0.35:1,
                          flex:1,
                        }}>
                        {/* 동그란 버튼 - 선택시 커짐 */}
                        <div style={{
                          width:isSelected?'72px':'56px',
                          height:isSelected?'72px':'56px',
                          borderRadius:'50%',
                          background:isSelected?opt.bg:WHITE,
                          border:`2px solid ${isSelected?opt.bd:LGRAY}`,
                          display:'flex', alignItems:'center', justifyContent:'center',
                          fontSize:isSelected?'28px':'22px',
                          transition:'all 0.3s cubic-bezier(0.34,1.56,0.64,1)',
                          boxShadow:isSelected?`0 4px 20px ${opt.side==='a'?'rgba(255,215,0,0.3)':'rgba(255,107,157,0.3)'}`:'0 1px 4px rgba(0,0,0,0.08)',
                        }}>
                          {opt.emoji}
                        </div>
                        {/* 텍스트 */}
                        <div style={{ textAlign:'center' }}>
                          <div style={{ fontSize:'8px', fontWeight:800, color:isSelected?opt.color:GRAY, letterSpacing:'0.08em', marginBottom:'2px' }}>{opt.label}</div>
                          <div style={{ fontSize:'12px', fontWeight:700, color:isSelected?DARK:GRAY }}>{opt.name}</div>
                          {isVoted && (
                            <div style={{ fontSize:isSelected?'18px':'13px', fontWeight:900, color:opt.color, marginTop:'2px', transition:'font-size 0.3s' }}>
                              {opt.pct}%
                            </div>
                          )}
                          {isVoted && (
                            <div style={{ fontSize:'9px', color:GRAY }}>{fmt(opt.cnt)}명</div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* 진행바 */}
                {isVoted && (
                  <div style={{ height:'4px', background:LGRAY, borderRadius:'999px', overflow:'hidden', display:'flex', marginBottom:'12px' }}>
                    <div style={{ width:`${v.pa}%`, background:'#FFD700', transition:'width 0.8s', borderRadius:'999px 0 0 999px' }} />
                    <div style={{ flex:1, background:'#FF6B9D', borderRadius:'0 999px 999px 0' }} />
                  </div>
                )}

                {/* 하단 */}
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <span style={{ fontSize:'11px', color:GRAY }}>👥 {fmt(v.total)}명 참여</span>
                  <div style={{ display:'flex', alignItems:'center', gap:'14px' }}>
                    {/* 말풍선 댓글 버튼 */}
                    <div onClick={e => toggleComments(v.id, e)} style={{ display:'flex', alignItems:'center', gap:'4px', cursor:'pointer' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill={isCommentOpen?DARK:'none'} stroke={isCommentOpen?DARK:GRAY} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                      </svg>
                      {vComments.length>0 && <span style={{ fontSize:'11px', color:GRAY, fontWeight:600 }}>{vComments.length}</span>}
                    </div>
                    {/* 하트 */}
                    <div onClick={e => handleLike(v.id, e)} style={{ display:'flex', alignItems:'center', gap:'4px', cursor:'pointer', position:'relative' }}>
                      <HeartBurst active={burstId===v.id} />
                      <svg width="16" height="16" viewBox="0 0 24 24" fill={liked[v.id]?Y:'none'} stroke={liked[v.id]?YD:GRAY} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
                      </svg>
                      {(likeCounts[v.id]||0)>0 && <span style={{ fontSize:'11px', color:liked[v.id]?YD:GRAY, fontWeight:600 }}>{likeCounts[v.id]}</span>}
                    </div>
                  </div>
                </div>
              </div>

              {/* 댓글창 - 말풍선 스타일, 고정 높이 */}
              {isCommentOpen && (
                <div style={{ borderTop:`1px solid ${LGRAY}`, background:BG, padding:'12px 16px' }}>
                  {/* 댓글 목록 */}
                  <div style={{ minHeight:'60px', maxHeight:'140px', overflowY:'auto', marginBottom:'10px' }}>
                    {commentsLoading ? (
                      <div style={{ fontSize:'12px', color:GRAY, textAlign:'center', padding:'20px' }}>불러오는 중...</div>
                    ) : vComments.length===0 ? (
                      <div style={{ fontSize:'12px', color:GRAY, textAlign:'center', padding:'20px' }}>
                        {isVoted ? '첫 댓글을 달아보세요' : '댓글이 없어요'}
                      </div>
                    ) : vComments.map(c => (
                      <div key={c.id} style={{ display:'flex', gap:'8px', marginBottom:'10px', alignItems:'flex-start' }}>
                        {/* 아바타 */}
                        <div style={{ width:'24px', height:'24px', borderRadius:'50%', flexShrink:0, background:c.choice==='a'?YS:'rgba(255,107,157,0.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'9px', fontWeight:800, color:c.choice==='a'?YD:'#CC1F6A' }}>
                          {c.choice==='a'?v.emoji_a:v.emoji_b}
                        </div>
                        {/* 말풍선 */}
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:'8px', color:c.choice==='a'?YD:'#CC1F6A', fontWeight:700, marginBottom:'3px' }}>
                            {c.choice==='a'?v.option_a:v.option_b}파
                          </div>
                          <div style={{
                            background:WHITE,
                            borderRadius:'14px 14px 14px 4px',
                            padding:'8px 12px',
                            fontSize:'13px', color:DARK, lineHeight:1.4,
                            border:`1px solid ${LGRAY}`,
                            display:'inline-block', maxWidth:'100%',
                          }}>{c.content}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* 댓글 입력 */}
                  <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
                    <input
                      ref={isCommentOpen?commentInputRef:undefined}
                      value={commentText}
                      onChange={e => setCommentText(e.target.value)}
                      placeholder={isVoted?'댓글 달기...':'투표 후 댓글 달 수 있어요'}
                      disabled={!isVoted}
                      onClick={e => e.stopPropagation()}
                      onKeyDown={e => { e.stopPropagation(); if(e.key==='Enter') handleComment(v.id) }}
                      style={{
                        flex:1, background:WHITE,
                        border:`1px solid ${LGRAY}`,
                        borderRadius:'22px', padding:'9px 14px',
                        fontSize:'13px', color:DARK,
                        outline:'none', fontFamily:font,
                      }}
                    />
                    {isVoted && (
                      <div onClick={e => handleComment(v.id, e)} style={{ width:'34px', height:'34px', borderRadius:'50%', flexShrink:0, background:commentText?DARK:LGRAY, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', transition:'all 0.2s' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={commentText?'white':GRAY} strokeWidth="2.5" strokeLinecap="round">
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

        {hasMore && !latestLoading && allLatest.length>0 && (
          <div onClick={loadMore} style={{ padding:'18px', textAlign:'center', cursor:'pointer' }}>
            <div style={{ display:'inline-block', padding:'10px 28px', borderRadius:'999px', border:`1.5px solid ${LGRAY}`, fontSize:'13px', fontWeight:700, color:DARK }}>더 보기</div>
          </div>
        )}
        {latestLoading && <div style={{ padding:'18px', textAlign:'center', fontSize:'12px', color:GRAY }}>불러오는 중...</div>}
        {!hasMore && allLatest.length>0 && <div style={{ padding:'18px', textAlign:'center', fontSize:'11px', color:LGRAY }}>모두 불러왔어요</div>}
      </div>

      <BottomNav />
    </div>
  )
}
