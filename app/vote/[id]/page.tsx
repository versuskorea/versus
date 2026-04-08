'use client'
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import BottomNav from '@/components/BottomNav'
import { supabase } from '@/lib/supabase'
import { CATEGORIES } from '@/lib/categories'

const BG = '#0A0A0A'
const CARD = '#141414'
const Y = '#FFD700'
const YS = 'rgba(255,215,0,0.1)'
const YB = 'rgba(255,215,0,0.3)'
const R = '#FF3B3B'
const RS = 'rgba(255,59,59,0.1)'
const font = '-apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", sans-serif'

const ABUSE = ['fuck','shit','bitch']
function hasAbuse(t: string) { return ABUSE.some(w => t.toLowerCase().includes(w)) }

type Vote = {
  id: string; question: string; option_a: string; option_b: string
  emoji_a: string; emoji_b: string; category: string
  is_realtime: boolean; expires_at: string | null; created_at: string
  count_a: number; count_b: number; total: number; pa: number
}
type Comment = { id: string; content: string; choice: 'a' | 'b'; created_at: string }
type Reply = { id: string; content: string; choice: 'a' | 'b'; created_at: string }

function fmt(n: number) {
  return n >= 10000 ? (n/10000).toFixed(1)+'만' : n >= 1000 ? (n/1000).toFixed(1)+'k' : ''+n
}
function timer(ms: number) {
  if (ms <= 0) return '00:00'
  const s = Math.floor(ms/1000)
  return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`
}
function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime()
  const min = Math.floor(diff/60000)
  const hour = Math.floor(diff/3600000)
  if (min < 1) return '방금'
  if (min < 60) return `${min}분 전`
  if (hour < 24) return `${hour}시간 전`
  return `${Math.floor(hour/24)}일 전`
}

export default function VoteDetail() {
  const router = useRouter()
  const { id } = useParams() as { id: string }
  const [vote, setVote] = useState<Vote | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [myChoice, setMyChoice] = useState<'a'|'b'|null>(null)
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [shared, setShared] = useState(false)
  const [comment, setComment] = useState('')
  const [filter, setFilter] = useState<'전체'|'a'|'b'>('전체')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [now, setNow] = useState(Date.now())
  const [menuOpen, setMenuOpen] = useState(false)
  const [commentLikes, setCommentLikes] = useState<Record<string, number>>({})
  const [likedComments, setLikedComments] = useState<Record<string, boolean>>({})
  const [replyTo, setReplyTo] = useState<string|null>(null)
  const [replyText, setReplyText] = useState('')
  const [replies, setReplies] = useState<Record<string, Reply[]>>({})

  useEffect(() => {
    fetchVote(); fetchComments()
    try {
      const s = JSON.parse(localStorage.getItem('versus_voted')||'{}')
      if (s[id]) setMyChoice(s[id])
      const lc = JSON.parse(localStorage.getItem('versus_likecount')||'{}')
      setLikeCount(lc[id] || 0)
      const lk = JSON.parse(localStorage.getItem('versus_liked')||'{}')
      setLiked(!!lk[id])
    } catch {}
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [id])

  async function fetchVote() {
    const { data } = await supabase.from('votes').select('*, vote_results(choice)').eq('id', id).single()
    if (!data) { setLoading(false); return }
    const r = data.vote_results || []
    const ca = r.filter((x: any) => x.choice==='a').length
    const cb = r.filter((x: any) => x.choice==='b').length
    const total = ca + cb
    setVote({ ...data, count_a: ca, count_b: cb, total, pa: total>0 ? Math.round((ca/total)*100) : 50 })
    setLoading(false)
  }

  async function fetchComments() {
    const { data } = await supabase.from('comments').select('*').eq('vote_id', id).order('created_at', { ascending: false })
    if (data) setComments(data)
  }

  async function handleVote(side: 'a'|'b') {
    if (myChoice || !vote) return
    setMyChoice(side)
    try {
      const s = JSON.parse(localStorage.getItem('versus_voted')||'{}')
      s[id] = side; localStorage.setItem('versus_voted', JSON.stringify(s))
    } catch {}
    await supabase.from('vote_results').insert({ vote_id: id, choice: side })
    setVote(v => v ? {
      ...v,
      count_a: side==='a' ? v.count_a+1 : v.count_a,
      count_b: side==='b' ? v.count_b+1 : v.count_b,
      total: v.total+1,
      pa: side==='a' ? Math.round(((v.count_a+1)/(v.total+1))*100) : Math.round((v.count_a/(v.total+1))*100),
    } : v)
  }

  async function handleComment() {
    if (!comment.trim() || !myChoice || submitting) return
    if (hasAbuse(comment)) { alert('부적절한 표현이 포함되어 있어요.'); return }
    setSubmitting(true)
    const { data } = await supabase.from('comments').insert({ vote_id: id, content: comment.trim(), choice: myChoice }).select().single()
    if (data) { setComments(p => [data, ...p]); setComment('') }
    setSubmitting(false)
  }

  function handleLikeVote() {
    const next = !liked
    setLiked(next)
    setLikeCount(c => c + (next ? 1 : -1))
    try {
      const lk = JSON.parse(localStorage.getItem('versus_liked')||'{}')
      lk[id] = next; localStorage.setItem('versus_liked', JSON.stringify(lk))
      const lc = JSON.parse(localStorage.getItem('versus_likecount')||'{}')
      lc[id] = likeCount + (next ? 1 : -1); localStorage.setItem('versus_likecount', JSON.stringify(lc))
    } catch {}
  }

  function handleLikeComment(commentId: string) {
    const isLiked = likedComments[commentId]
    setLikedComments(p => ({ ...p, [commentId]: !isLiked }))
    setCommentLikes(p => ({ ...p, [commentId]: (p[commentId]||0) + (isLiked ? -1 : 1) }))
  }

  function handleShare() {
    navigator.clipboard.writeText(window.location.href)
    setShared(true); setTimeout(() => setShared(false), 2000)
  }

  function addReply(commentId: string, content: string) {
    if (!content.trim() || !myChoice) return
    const newReply: Reply = {
      id: Date.now().toString(),
      content: content.trim(),
      choice: myChoice,
      created_at: new Date().toISOString(),
    }
    setReplies(p => ({ ...p, [commentId]: [...(p[commentId]||[]), newReply] }))
    setReplyText('')
    setReplyTo(null)
  }

  if (loading) return (
    <div style={{ maxWidth:'390px', margin:'0 auto', minHeight:'100vh', background:BG, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:font }}>
      <div style={{ fontSize:'14px', color:'white', opacity:0.5 }}>불러오는 중...</div>
    </div>
  )
  if (!vote) return (
    <div style={{ maxWidth:'390px', margin:'0 auto', minHeight:'100vh', background:BG, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:font }}>
      <div style={{ fontSize:'14px', color:'white', opacity:0.4 }}>투표를 찾을 수 없어요</div>
    </div>
  )

  const expired = vote.is_realtime && vote.expires_at ? new Date(vote.expires_at).getTime() <= now : false
  const timeLeft = vote.is_realtime && vote.expires_at ? new Date(vote.expires_at).getTime() - now : 0
  const urgent = timeLeft > 0 && timeLeft < 300000
  const showResult = !!myChoice
  const filtered = filter==='전체' ? comments : comments.filter(c => c.choice === filter)

  return (
    <div style={{ maxWidth:'390px', margin:'0 auto', minHeight:'100vh', background:BG, fontFamily:font, paddingBottom:'100px' }}>

      {/* ── TopBar ── */}
      <div style={{
        background:'rgba(10,10,10,0.96)',
        padding:'10px 16px',
        display:'flex', alignItems:'center', justifyContent:'space-between',
        borderBottom:'0.5px solid rgba(255,255,255,0.07)',
        position:'sticky', top:0, zIndex:50,
        backdropFilter:'blur(10px)',
      }}>
        {/* 왼쪽: 뒤로가기 + 로고 */}
        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
          <div onClick={() => router.back()} style={{ width:'34px', height:'34px', borderRadius:'50%', background:CARD, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'16px', color:'white', cursor:'pointer', flexShrink:0 }}>←</div>
          <div style={{ fontSize:'18px', fontWeight:900, letterSpacing:'-0.04em', color:'white', display:'flex', alignItems:'center' }}>
            VERSUS
            <span style={{ background:Y, color:'#0A0A0A', fontSize:'7px', padding:'2px 5px', borderRadius:'4px', marginLeft:'5px', fontWeight:900 }}>VS</span>
          </div>
        </div>

        {/* 오른쪽: 실시간 타이머 + 공유 + 검색 + 햄버거 */}
        <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
          {vote.is_realtime && (
            <div style={{ fontSize:'13px', fontWeight:900, color: expired?'rgba(255,255,255,0.3)':urgent?R:Y, fontVariantNumeric:'tabular-nums' }}>
              {expired ? '종료' : `⏱${timer(timeLeft)}`}
            </div>
          )}
        
          <div onClick={() => router.push('/search')} style={{ width:'32px', height:'32px', borderRadius:'50%', background:'rgba(255,255,255,0.08)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </div>
          <div onClick={() => setMenuOpen(true)} style={{ width:'32px', height:'32px', borderRadius:'50%', background:'rgba(255,255,255,0.08)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          </div>
        </div>
      </div>

      {/* ── 햄버거 메뉴 ── */}
      {menuOpen && (
        <>
          <div onClick={() => setMenuOpen(false)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:200 }} />
          <div style={{ position:'fixed', top:0, bottom:0, width:'240px', background:'#1A1A2E', zIndex:201, display:'flex', flexDirection:'column', boxShadow:'-4px 0 24px rgba(0,0,0,0.5)', right:'max(0px, calc(50vw - 195px))' }}>
            <div style={{ padding:'16px', display:'flex', alignItems:'center', justifyContent:'space-between', borderBottom:'0.5px solid rgba(255,255,255,0.08)' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'4px' }}>
                <span style={{ fontSize:'16px', fontWeight:900, color:'white' }}>VERSUS</span>
                <span style={{ background:Y, color:'#0A0A0A', fontSize:'7px', padding:'1px 4px', borderRadius:'3px', fontWeight:900 }}>VS</span>
              </div>
              <div onClick={() => setMenuOpen(false)} style={{ fontSize:'20px', color:'rgba(255,255,255,0.4)', cursor:'pointer' }}>✕</div>
            </div>
            <div style={{ flex:1, overflowY:'auto', padding:'12px 0' }}>
              <div style={{ fontSize:'10px', fontWeight:800, color:'rgba(255,255,255,0.3)', letterSpacing:'0.08em', padding:'8px 16px 4px' }}>카테고리</div>
              <div onClick={() => { router.push('/hot'); setMenuOpen(false) }} style={{ display:'flex', alignItems:'center', gap:'12px', padding:'11px 16px', cursor:'pointer', borderBottom:'0.5px solid rgba(255,255,255,0.05)' }}>
                <span style={{ fontSize:'18px' }}>🔥</span><span style={{ fontSize:'14px', fontWeight:700, color:'white' }}>인기 투표</span>
              </div>
              {CATEGORIES.map(cat => (
                <div key={cat} onClick={() => { router.push(`/category/${encodeURIComponent(cat)}`); setMenuOpen(false) }} style={{ display:'flex', alignItems:'center', gap:'12px', padding:'11px 16px', cursor:'pointer', borderBottom:'0.5px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ fontSize:'18px' }}>{cat.split(' ')[0]}</span>
                  <span style={{ fontSize:'14px', fontWeight:700, color:'white' }}>{cat.split(' ').slice(1).join(' ')}</span>
                </div>
              ))}
              <div style={{ fontSize:'10px', fontWeight:800, color:'rgba(255,255,255,0.3)', letterSpacing:'0.08em', padding:'16px 16px 8px' }}>메뉴</div>
              {[
                { label:'홈', path:'/', emoji:'🏠' },
                { label:'소울픽', path:'/soul', emoji:'🎯' },
                { label:'투표 만들기', path:'/create', emoji:'✏️' },
              ].map(item => (
                <div key={item.path} onClick={() => { router.push(item.path); setMenuOpen(false) }} style={{ display:'flex', alignItems:'center', gap:'12px', padding:'11px 16px', cursor:'pointer', borderBottom:'0.5px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ fontSize:'18px' }}>{item.emoji}</span>
                  <span style={{ fontSize:'14px', fontWeight:700, color:'white' }}>{item.label}</span>
                </div>
              ))}
            </div>
            <div style={{ padding:'14px 16px', borderTop:`3px solid ${Y}`, textAlign:'center' }}>
              <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.3)' }}>VERSUS · 세상의 모든 A vs B</div>
            </div>
          </div>
        </>
      )}

      {/* ── 포스트 영역 ── */}
      <div style={{ padding:'16px 18px', borderBottom:'6px solid #111' }}>
        {/* 작성자 정보 */}
        <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'14px' }}>
          <div style={{ width:'40px', height:'40px', borderRadius:'50%', background:`linear-gradient(135deg, ${Y}, #FF8C00)`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'18px', flexShrink:0 }}>
            {vote.category.split(' ')[0]}
          </div>
          <div style={{ flex:1 }}>
            <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
              <span style={{ fontSize:'13px', fontWeight:800, color:'white' }}>익명</span>
              {myChoice && (
                <span style={{ fontSize:'9px', fontWeight:800, padding:'2px 7px', borderRadius:'999px', background: myChoice==='a'?YS:RS, color: myChoice==='a'?Y:R, border:`1px solid ${myChoice==='a'?YB:'rgba(255,59,59,0.3)'}` }}>
                  {myChoice==='a'?vote.option_a:vote.option_b}파
                </span>
              )}
            </div>
            <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.35)', marginTop:'2px' }}>
              {vote.category} · {timeAgo(vote.created_at)} · 👥 {fmt(vote.total)}명 참여
            </div>
          </div>
        </div>

        {/* 질문 */}
        <div style={{ fontSize:'22px', fontWeight:900, color:'white', lineHeight:1.35, letterSpacing:'-0.04em', marginBottom:'18px' }}>
          {vote.question}
        </div>

        {/* AB 투표 버튼 */}
        <div style={{ display:'flex', flexDirection:'column', gap:'8px', marginBottom:'12px' }}>
          {([
            { side:'a' as const, name:vote.option_a, emoji:vote.emoji_a, pct:vote.pa, cnt:vote.count_a, color:Y, bg:YS, bd:YB },
            { side:'b' as const, name:vote.option_b, emoji:vote.emoji_b, pct:100-vote.pa, cnt:vote.count_b, color:R, bg:RS, bd:'rgba(255,59,59,0.3)' },
          ]).map(opt => (
            <div key={opt.side} onClick={() => handleVote(opt.side)} style={{
              display:'flex', alignItems:'center', gap:'12px',
              padding:'12px 14px', borderRadius:'14px',
              cursor: myChoice||expired ? 'default' : 'pointer',
              border:`1.5px solid ${myChoice===opt.side ? opt.bd : myChoice ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.09)'}`,
              background: myChoice===opt.side ? opt.bg : myChoice ? 'rgba(255,255,255,0.02)' : CARD,
              opacity: myChoice && myChoice!==opt.side ? 0.35 : 1,
              transition:'all 0.2s', position:'relative', overflow:'hidden',
            }}>
              {showResult && <div style={{ position:'absolute', left:0, top:0, bottom:0, width:`${opt.pct}%`, background: myChoice===opt.side ? (opt.side==='a'?'rgba(255,215,0,0.07)':'rgba(255,59,59,0.07)') : 'rgba(255,255,255,0.02)', transition:'width 0.8s', borderRadius:'14px' }} />}
              <div style={{ width:'44px', height:'44px', borderRadius:'50%', background:'rgba(255,255,255,0.07)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'22px', flexShrink:0, position:'relative' }}>
                {opt.emoji}
              </div>
              <div style={{ flex:1, position:'relative' }}>
                <div style={{ fontSize:'9px', fontWeight:900, color:myChoice===opt.side?opt.color:'rgba(255,255,255,0.35)', letterSpacing:'0.08em', marginBottom:'3px' }}>{opt.side.toUpperCase()}</div>
                <div style={{ fontSize:'15px', fontWeight:800, color:'white' }}>{opt.name}</div>
              </div>
              {showResult && (
                <div style={{ textAlign:'right', position:'relative', flexShrink:0 }}>
                  <div style={{ fontSize:'22px', fontWeight:900, color:opt.color, lineHeight:1 }}>{opt.pct}%</div>
                  <div style={{ fontSize:'10px', color:'rgba(255,255,255,0.35)', marginTop:'2px' }}>{fmt(opt.cnt)}명</div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* 진행바 */}
        {showResult && vote.total > 0 && (
          <div style={{ height:'3px', borderRadius:'999px', overflow:'hidden', display:'flex', background:'rgba(255,255,255,0.06)', marginBottom:'14px' }}>
            <div style={{ width:`${vote.pa}%`, background:Y, transition:'width 0.8s' }} />
            <div style={{ flex:1, background:R }} />
          </div>
        )}

        {/* 하단 액션 */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div style={{ display:'flex', gap:'14px' }}>
            <div style={{ fontSize:'12px', color:'rgba(255,255,255,0.35)', display:'flex', alignItems:'center', gap:'4px' }}>👥 {fmt(vote.total)}명</div>
            <div style={{ fontSize:'12px', color:'rgba(255,255,255,0.35)', display:'flex', alignItems:'center', gap:'4px' }}>💬 {comments.length}</div>
          </div>
          <div style={{ display:'flex', gap:'10px', alignItems:'center' }}>
            <div onClick={handleShare} style={{ display:'flex', alignItems:'center', gap:'4px', cursor:'pointer', fontSize:'12px', color: shared ? Y : 'rgba(255,255,255,0.35)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={shared ? Y : 'rgba(255,255,255,0.35)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
              {shared ? '복사됨' : '공유'}
            </div>
            <div onClick={handleLikeVote} style={{ display:'flex', alignItems:'center', gap:'4px', cursor:'pointer', padding:'5px 12px', borderRadius:'999px', background: liked ? YS : 'rgba(255,255,255,0.05)', border:`1px solid ${liked ? YB : 'rgba(255,255,255,0.08)'}`, transition:'all 0.2s' }}>
              <span style={{ fontSize:'14px' }}>{liked ? '♥' : '♡'}</span>
              <span style={{ fontSize:'12px', fontWeight:700, color: liked ? Y : 'rgba(255,255,255,0.4)' }}>{likeCount > 0 ? likeCount : ''}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 댓글 섹션 ── */}
      <div style={{ background:BG }}>
        <div style={{ padding:'14px 18px 10px', display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom:'0.5px solid rgba(255,255,255,0.06)' }}>
          <span style={{ fontSize:'14px', fontWeight:800, color:'white' }}>댓글 {comments.length}</span>
          <div style={{ display:'flex', gap:'6px' }}>
            {([['전체','전체'], ['a', `${vote.option_a}파`], ['b', `${vote.option_b}파`]] as [string,string][]).map(([val, label]) => (
              <div key={val} onClick={() => setFilter(val as any)} style={{
                fontSize:'10px', fontWeight:700,
                padding:'4px 10px', borderRadius:'999px', cursor:'pointer',
                background: filter===val ? Y : 'rgba(255,255,255,0.06)',
                color: filter===val ? '#0A0A0A' : 'rgba(255,255,255,0.4)',
                border:`1px solid ${filter===val ? Y : 'rgba(255,255,255,0.08)'}`,
              }}>{label}</div>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding:'40px 18px', textAlign:'center', fontSize:'13px', color:'rgba(255,255,255,0.3)' }}>
            {myChoice ? '첫 댓글을 달아보세요!' : '투표 후 댓글을 달 수 있어요'}
          </div>
        ) : filtered.map(c => {
          const cLikes = commentLikes[c.id] || 0
          const cLiked = likedComments[c.id] || false
          const cReplies = replies[c.id] || []
          const isReplyOpen = replyTo === c.id
          return (
            <div key={c.id} style={{ padding:'14px 18px', borderBottom:'0.5px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display:'flex', alignItems:'flex-start', gap:'9px', marginBottom:'7px' }}>
                <div style={{ width:'30px', height:'30px', borderRadius:'50%', flexShrink:0, background: c.choice==='a' ? YS : RS, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'12px', border:`1px solid ${c.choice==='a' ? YB : 'rgba(255,59,59,0.3)'}` }}>
                  {c.choice==='a' ? vote.emoji_a : vote.emoji_b}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'6px', flexWrap:'wrap' }}>
                    <span style={{ fontSize:'12px', fontWeight:700, color:'rgba(255,255,255,0.7)' }}>익명</span>
                    <span style={{ fontSize:'9px', fontWeight:800, padding:'2px 7px', borderRadius:'4px', background: c.choice==='a' ? YS : RS, color: c.choice==='a' ? Y : R }}>
                      {c.choice==='a' ? vote.option_a : vote.option_b}파
                    </span>
                    <span style={{ fontSize:'10px', color:'rgba(255,255,255,0.25)', marginLeft:'auto' }}>{timeAgo(c.created_at)}</span>
                  </div>
                </div>
              </div>
              <div style={{ fontSize:'14px', color:'rgba(255,255,255,0.88)', lineHeight:1.55, paddingLeft:'39px', marginBottom:'8px' }}>{c.content}</div>
              <div style={{ display:'flex', gap:'14px', paddingLeft:'39px' }}>
                <div onClick={() => handleLikeComment(c.id)} style={{ display:'flex', alignItems:'center', gap:'4px', cursor:'pointer' }}>
                  <span style={{ fontSize:'13px', color: cLiked ? Y : 'rgba(255,255,255,0.3)' }}>{cLiked ? '♥' : '♡'}</span>
                  <span style={{ fontSize:'11px', color: cLiked ? Y : 'rgba(255,255,255,0.3)', fontWeight:600 }}>{cLikes > 0 ? cLikes : '좋아요'}</span>
                </div>
                <div onClick={() => setReplyTo(isReplyOpen ? null : c.id)} style={{ display:'flex', alignItems:'center', gap:'4px', cursor:'pointer' }}>
                  <span style={{ fontSize:'11px', color: isReplyOpen ? Y : 'rgba(255,255,255,0.3)', fontWeight:600 }}>
                    💬 {cReplies.length > 0 ? `대댓글 ${cReplies.length}` : '대댓글'}
                  </span>
                </div>
              </div>
              {cReplies.length > 0 && (
                <div style={{ marginTop:'10px', paddingLeft:'39px' }}>
                  {cReplies.map(r => (
                    <div key={r.id} style={{ background:'rgba(255,255,255,0.03)', borderRadius:'10px', padding:'10px 12px', marginBottom:'6px', border:'0.5px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'5px' }}>
                        <div style={{ width:'20px', height:'20px', borderRadius:'50%', background: r.choice==='a' ? YS : RS, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'10px' }}>
                          {r.choice==='a' ? vote.emoji_a : vote.emoji_b}
                        </div>
                        <span style={{ fontSize:'11px', fontWeight:700, color:'rgba(255,255,255,0.5)' }}>익명</span>
                        <span style={{ fontSize:'9px', fontWeight:800, padding:'1px 6px', borderRadius:'4px', background: r.choice==='a' ? YS : RS, color: r.choice==='a' ? Y : R }}>
                          {r.choice==='a' ? vote.option_a : vote.option_b}파
                        </span>
                        <span style={{ fontSize:'10px', color:'rgba(255,255,255,0.2)', marginLeft:'auto' }}>{timeAgo(r.created_at)}</span>
                      </div>
                      <div style={{ fontSize:'13px', color:'rgba(255,255,255,0.7)', lineHeight:1.5, paddingLeft:'26px' }}>{r.content}</div>
                    </div>
                  ))}
                </div>
              )}
              {isReplyOpen && (
                <div style={{ marginTop:'8px', paddingLeft:'39px', display:'flex', gap:'6px', alignItems:'center' }}>
                  <input value={replyText} onChange={e => setReplyText(e.target.value)}
                    placeholder={myChoice ? `${myChoice==='a'?vote.option_a:vote.option_b}파로 대댓글...` : '투표 먼저!'}
                    disabled={!myChoice}
                    onKeyDown={e => e.key==='Enter' && addReply(c.id, replyText)}
                    style={{ flex:1, background:'rgba(255,255,255,0.06)', border:'0.5px solid rgba(255,255,255,0.1)', borderRadius:'999px', padding:'8px 12px', fontSize:'16px', color:'white', outline:'none', fontFamily:font }} />
                  <div onClick={() => addReply(c.id, replyText)} style={{ width:'30px', height:'30px', borderRadius:'50%', flexShrink:0, background: replyText&&myChoice ? Y : 'rgba(255,255,255,0.07)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', transition:'all 0.2s' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={replyText&&myChoice?'#0A0A0A':'rgba(255,255,255,0.3)'} strokeWidth="2.5" strokeLinecap="round">
                      <line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>
                    </svg>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ── 댓글 입력창 (하단 고정) ── */}
      {!expired && (
        <div style={{ position:'fixed', bottom:'60px', left:'50%', transform:'translateX(-50%)', width:'100%', maxWidth:'390px', padding:'10px 14px', background:'rgba(10,10,10,0.97)', borderTop:'0.5px solid rgba(255,255,255,0.08)', backdropFilter:'blur(10px)', zIndex:40, display:'flex', gap:'8px', alignItems:'center' }}>
          {myChoice && (
            <div style={{ width:'28px', height:'28px', borderRadius:'50%', flexShrink:0, background: myChoice==='a' ? YS : RS, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'13px' }}>
              {myChoice==='a' ? vote.emoji_a : vote.emoji_b}
            </div>
          )}
          <input
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder={myChoice ? `${myChoice==='a'?vote.option_a:vote.option_b}파로 댓글 달기...` : '투표 후 댓글 달 수 있어요'}
            disabled={!myChoice}
            onKeyDown={e => e.key==='Enter' && handleComment()}
            style={{ flex:1, background:'rgba(255,255,255,0.07)', border:'0.5px solid rgba(255,255,255,0.1)', borderRadius:'22px', padding:'10px 14px', fontSize:'16px', color: myChoice?'white':'rgba(255,255,255,0.3)', outline:'none', fontFamily:font }}
          />
          <div onClick={handleComment} style={{ width:'36px', height:'36px', borderRadius:'50%', flexShrink:0, background: comment&&myChoice ? Y : 'rgba(255,255,255,0.07)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', transition:'all 0.2s' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={comment&&myChoice?'#0A0A0A':'rgba(255,255,255,0.3)'} strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>
            </svg>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  )
}
