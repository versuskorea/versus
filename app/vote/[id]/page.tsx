'use client'
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import BottomNav from '@/components/BottomNav'
import { supabase } from '@/lib/supabase'

const BG = '#0A0A0A'
const CARD = '#141414'
const Y = '#FFD700'
const YS = 'rgba(255,215,0,0.12)'
const YB = 'rgba(255,215,0,0.3)'
const PU = '#7C6FFF'
const PUS = 'rgba(124,111,255,0.12)'
const PUB = 'rgba(124,111,255,0.3)'
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

function fmt(n: number) {
  return n >= 10000 ? (n/10000).toFixed(1)+'만' : n >= 1000 ? (n/1000).toFixed(1)+'k' : ''+n
}
function timer(ms: number) {
  if (ms <= 0) return '00:00'
  const s = Math.floor(ms/1000)
  return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`
}

export default function VoteDetail() {
  const router = useRouter()
  const { id } = useParams() as { id: string }
  const [vote, setVote] = useState<Vote | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [myChoice, setMyChoice] = useState<'a'|'b'|null>(null)
  const [liked, setLiked] = useState(false)
  const [shared, setShared] = useState(false)
  const [comment, setComment] = useState('')
  const [filter, setFilter] = useState('전체')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    fetchVote(); fetchComments()
    try {
      const s = JSON.parse(localStorage.getItem('versus_voted')||'{}')
      if (s[id]) setMyChoice(s[id])
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
    const { data } = await supabase.from('comments').select('*').eq('vote_id', id).order('created_at', { ascending: true })
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
    if (data) { setComments(p => [...p, data]); setComment('') }
    setSubmitting(false)
  }

  function handleShare() {
    navigator.clipboard.writeText(window.location.href)
    setShared(true); setTimeout(() => setShared(false), 2000)
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
  const filtered = filter==='전체' ? comments : filter.includes(vote.option_a) ? comments.filter(c=>c.choice==='a') : comments.filter(c=>c.choice==='b')

  return (
    <div style={{ maxWidth:'390px', margin:'0 auto', minHeight:'100vh', background:BG, fontFamily:font }}>

      <div style={{ background:BG, padding:'10px 16px', display:'flex', alignItems:'center', justifyContent:'space-between', borderBottom:'0.5px solid rgba(255,255,255,0.06)', position:'sticky', top:0, zIndex:50 }}>
        <div onClick={() => router.back()} style={{ width:'34px', height:'34px', borderRadius:'50%', background:CARD, border:`1px solid ${YB}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'16px', color:'white', cursor:'pointer' }}>←</div>
        <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
          <span style={{ fontSize:'12px', fontWeight:700, color:'white', opacity:0.5 }}>{vote.category}</span>
          {vote.is_realtime && (
            <span style={{ fontSize:'12px', fontWeight:900, color: expired ? 'white' : urgent ? '#FF3B3B' : Y, opacity: expired ? 0.4 : 1, fontVariantNumeric:'tabular-nums' }}>
              {expired ? '종료됨' : `⏱ ${timer(timeLeft)}`}
            </span>
          )}
        </div>
        <div onClick={handleShare} style={{ width:'34px', height:'34px', borderRadius:'50%', background: shared ? YS : CARD, border:`1px solid ${shared ? Y : YB}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'15px', cursor:'pointer', transition:'all 0.2s' }}>
          {shared ? '✅' : '↗️'}
        </div>
      </div>

      {expired && (
        <div style={{ background:CARD, padding:'10px 16px', textAlign:'center' }}>
          <span style={{ fontSize:'12px', color:'white', opacity:0.4 }}>⏰ 이 투표는 종료됐어요</span>
        </div>
      )}

      <div style={{ background:CARD, margin:'12px', borderRadius:'16px', padding:'16px', border:`1px solid ${YB}` }}>
        {vote.is_realtime && (
          <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'10px' }}>
            <div style={{ background: expired ? '#333' : Y, borderRadius:'999px', padding:'3px 10px', display:'inline-flex', alignItems:'center', gap:'4px' }}>
              {!expired && <div style={{ width:'4px', height:'4px', borderRadius:'50%', background:'#0A0A0A' }} />}
              <span style={{ fontSize:'8px', fontWeight:900, color: expired ? 'rgba(255,255,255,0.4)' : '#0A0A0A' }}>{expired ? 'ENDED' : 'LIVE'}</span>
            </div>
            <span style={{ fontSize:'10px', color:'white', opacity:0.5 }}>⚡ 실시간 결정</span>
          </div>
        )}

        <div style={{ fontSize:'20px', fontWeight:900, color:'white', lineHeight:1.3, marginBottom:'18px', letterSpacing:'-0.025em' }}>{vote.question}</div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'12px' }}>
          {([
            { side:'a' as const, name:vote.option_a, emoji:vote.emoji_a, pct:vote.pa, ac:Y, bg:YS, bd:Y },
            { side:'b' as const, name:vote.option_b, emoji:vote.emoji_b, pct:100-vote.pa, ac:PU, bg:PUS, bd:PU },
          ]).map(opt => (
            <div key={opt.side} onClick={() => handleVote(opt.side)} style={{
              borderRadius:'16px', padding:'18px 12px', textAlign:'center',
              cursor: myChoice||expired ? 'default' : 'pointer',
              border:`2px solid ${myChoice===opt.side ? opt.bd : 'rgba(255,255,255,0.08)'}`,
              background: myChoice===opt.side ? opt.bg : myChoice ? 'rgba(255,255,255,0.03)' : '#1e1e1e',
              opacity: myChoice && myChoice!==opt.side ? 0.4 : 1,
              transition:'all 0.25s',
            }}>
              <div style={{ fontSize:'32px', marginBottom:'8px' }}>{opt.emoji}</div>
              <div style={{ fontSize:'8px', fontWeight:900, color:'white', opacity:0.35, marginBottom:'4px' }}>{opt.side.toUpperCase()}</div>
              <div style={{ fontSize:'14px', fontWeight:800, color:'white', marginBottom: showResult ? '8px' : 0 }}>{opt.name}</div>
              {showResult && vote.total>0 && (
                <div style={{ fontSize:'24px', fontWeight:900, color:opt.ac }}>{opt.pct}%</div>
              )}
            </div>
          ))}
        </div>

        {showResult && vote.total>0 && (
          <div style={{ height:'6px', background:'rgba(255,255,255,0.08)', borderRadius:'999px', overflow:'hidden', display:'flex', marginBottom:'10px' }}>
            <div style={{ width:`${vote.pa}%`, background:Y, transition:'width 0.8s' }} />
            <div style={{ flex:1, background:PU }} />
          </div>
        )}

        <div style={{ fontSize:'11px', color:'white', opacity:0.4, textAlign:'center', marginBottom: myChoice ? '14px' : 0 }}>
          {expired ? `${fmt(vote.total)}명 참여 · 종료됨` : myChoice ? `${fmt(vote.total)}명 참여` : '탭해서 투표하세요'}
        </div>

        {myChoice && (
          <div style={{ display:'flex', gap:'8px' }}>
            <div onClick={() => setLiked(l=>!l)} style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:'6px', padding:'10px', borderRadius:'12px', cursor:'pointer', background: liked ? YS : 'rgba(255,255,255,0.05)', border:`1.5px solid ${liked ? Y : 'rgba(255,255,255,0.08)'}`, transition:'all 0.2s' }}>
              <span style={{ fontSize:'16px' }}>{liked ? '❤️' : '🤍'}</span>
              <span style={{ fontSize:'12px', fontWeight:800, color: liked ? Y : 'white' }}>좋아요</span>
            </div>
            <div onClick={handleShare} style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:'6px', padding:'10px', borderRadius:'12px', cursor:'pointer', background: shared ? YS : 'rgba(255,255,255,0.05)', border:`1.5px solid ${shared ? Y : 'rgba(255,255,255,0.08)'}`, transition:'all 0.2s' }}>
              <span style={{ fontSize:'16px' }}>{shared ? '✅' : '↗️'}</span>
              <span style={{ fontSize:'12px', fontWeight:800, color: shared ? Y : 'white' }}>{shared ? '복사됨!' : '공유'}</span>
            </div>
          </div>
        )}
      </div>

      {myChoice && vote.total>0 && (
        <div style={{ background:CARD, margin:'0 12px 12px', borderRadius:'16px', padding:'14px', border:`1px solid ${YB}` }}>
          <div style={{ fontSize:'13px', fontWeight:900, color:'white', marginBottom:'14px' }}>📊 통계</div>
          <div style={{ display:'flex', gap:'10px' }}>
            <div style={{ flex:1, background:YS, borderRadius:'12px', padding:'12px', textAlign:'center', border:`1px solid ${YB}` }}>
              <div style={{ fontSize:'11px', color:Y, fontWeight:700, marginBottom:'4px' }}>{vote.option_a}파</div>
              <div style={{ fontSize:'28px', fontWeight:900, color:Y }}>{vote.pa}%</div>
              <div style={{ fontSize:'10px', color:'white', opacity:0.5, marginTop:'2px' }}>{fmt(vote.count_a)}명</div>
            </div>
            <div style={{ flex:1, background:PUS, borderRadius:'12px', padding:'12px', textAlign:'center', border:`1px solid ${PUB}` }}>
              <div style={{ fontSize:'11px', color:PU, fontWeight:700, marginBottom:'4px' }}>{vote.option_b}파</div>
              <div style={{ fontSize:'28px', fontWeight:900, color:PU }}>{100-vote.pa}%</div>
              <div style={{ fontSize:'10px', color:'white', opacity:0.5, marginTop:'2px' }}>{fmt(vote.count_b)}명</div>
            </div>
          </div>
        </div>
      )}

      <div style={{ background:CARD, margin:'0 12px', borderRadius:'16px', padding:'14px', border:`1px solid ${YB}`, marginBottom:'100px' }}>
        <div style={{ fontSize:'13px', fontWeight:900, color:'white', marginBottom:'12px' }}>💬 댓글 {comments.length}개</div>
        <div style={{ display:'flex', gap:'6px', marginBottom:'14px', flexWrap:'wrap' }}>
          {['전체', `🟡 ${vote.option_a}파`, `🟣 ${vote.option_b}파`].map(f => (
            <div key={f} onClick={() => setFilter(f)} style={{
              fontSize:'11px', fontWeight:700, padding:'5px 12px', borderRadius:'999px', cursor:'pointer',
              background: filter===f ? Y : 'rgba(255,255,255,0.07)',
              color: filter===f ? '#0A0A0A' : 'white',
              border:`1px solid ${filter===f ? Y : 'rgba(255,255,255,0.1)'}`,
            }}>{f}</div>
          ))}
        </div>
        {filtered.length===0 ? (
          <div style={{ textAlign:'center', padding:'20px', fontSize:'12px', color:'white', opacity:0.4 }}>첫 댓글을 달아보세요!</div>
        ) : filtered.map(c => (
          <div key={c.id} style={{ display:'flex', gap:'8px', marginBottom:'14px' }}>
            <div style={{ width:'30px', height:'30px', borderRadius:'50%', flexShrink:0, background: c.choice==='a' ? YS : PUS, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'11px', fontWeight:800, color: c.choice==='a' ? Y : PU }}>익</div>
            <div style={{ flex:1 }}>
              <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'3px' }}>
                <span style={{ fontSize:'11px', fontWeight:800, color:'white' }}>익명</span>
                <span style={{ fontSize:'8px', fontWeight:700, padding:'1px 6px', borderRadius:'999px', background: c.choice==='a' ? YS : PUS, color: c.choice==='a' ? Y : PU }}>{c.choice==='a' ? vote.option_a : vote.option_b}파</span>
              </div>
              <div style={{ fontSize:'13px', color:'white', lineHeight:1.5 }}>{c.content}</div>
            </div>
          </div>
        ))}
        {!expired && (
          <div style={{ display:'flex', gap:'8px', alignItems:'center', marginTop:'8px' }}>
            <input value={comment} onChange={e => setComment(e.target.value)}
              placeholder={myChoice ? '댓글 달기...' : '투표 후 댓글 달 수 있어요'}
              disabled={!myChoice}
              onKeyDown={e => e.key==='Enter' && handleComment()}
              style={{ flex:1, background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'999px', padding:'10px 14px', fontSize:'13px', color:'white', outline:'none', fontFamily:font }} />
            <div onClick={handleComment} style={{ width:'36px', height:'36px', borderRadius:'50%', flexShrink:0, background: comment&&myChoice ? Y : 'rgba(255,255,255,0.08)', border:`1px solid ${comment&&myChoice ? Y : 'rgba(255,255,255,0.1)'}`, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', transition:'all 0.2s' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={comment&&myChoice ? '#0A0A0A' : 'rgba(255,255,255,0.3)'} strokeWidth="2.5" strokeLinecap="round">
                <line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>
              </svg>
            </div>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
