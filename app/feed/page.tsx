'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import BottomNav from '@/components/BottomNav'
import { supabase } from '@/lib/supabase'
import { CATEGORIES } from '@/lib/categories'

const GRAD = 'linear-gradient(135deg, #0A0A0A 0%, #1a0a2e 50%, #0a1a0a 100%)'
const Y = '#FFD700'
const YS = 'rgba(255,215,0,0.12)'
const YB = 'rgba(255,215,0,0.35)'

type Vote = {
  id: string; question: string; option_a: string; option_b: string
  emoji_a: string; emoji_b: string; category: string
  is_realtime: boolean; created_at: string
  pa: number; total: number; count_a: number; count_b: number; comments_count: number
}
type Comment = { id: string; content: string; choice: 'a' | 'b'; created_at: string }

function fmt(n: number) {
  return n >= 10000 ? (n / 10000).toFixed(1) + '만' : n >= 1000 ? (n / 1000).toFixed(1) + 'k' : '' + n
}

const HeartIcon = ({ filled }: { filled: boolean }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill={filled ? Y : 'none'} stroke={Y} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
  </svg>
)
const CommentIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
  </svg>
)
const ShareIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
  </svg>
)
const StatsIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
  </svg>
)

export default function Feed() {
  const router = useRouter()
  const [votes, setVotes] = useState<Vote[]>([])
  const [current, setCurrent] = useState(0)
  const [voted, setVoted] = useState<Record<string, 'a' | 'b'>>({})
  const [liked, setLiked] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)
  const touchStartY = useRef(0)
  const touchStartX = useRef(0)

  const [showComments, setShowComments] = useState(false)
  const [showStats, setShowStats] = useState(false)
  const [comments, setComments] = useState<Comment[]>([])
  const [commentText, setCommentText] = useState('')
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [sharedId, setSharedId] = useState<string | null>(null)

  useEffect(() => { fetchVotes() }, [])

  async function fetchVotes() {
    setLoading(true)
    const { data, error } = await supabase.from('votes').select('*, vote_results(choice), comments(id)').eq('is_realtime', false).order('created_at', { ascending: false }).limit(20)
    if (error || !data) { setLoading(false); return }
    const processed = data.map((vote: any) => {
      const results = vote.vote_results || []
      const count_a = results.filter((r: any) => r.choice === 'a').length
      const count_b = results.filter((r: any) => r.choice === 'b').length
      const total = count_a + count_b
      return { ...vote, count_a, count_b, total, pa: total > 0 ? Math.round((count_a / total) * 100) : 50, comments_count: vote.comments?.length || 0 }
    })
    setVotes(processed)
    setLoading(false)
  }

  async function fetchComments(voteId: string) {
    setCommentsLoading(true)
    const { data } = await supabase.from('comments').select('*').eq('vote_id', voteId).order('created_at', { ascending: false }).limit(30)
    if (data) setComments(data)
    setCommentsLoading(false)
  }

  async function handleVote(voteId: string, side: 'a' | 'b') {
    if (voted[voteId]) return
    setVoted(p => ({ ...p, [voteId]: side }))
    await supabase.from('vote_results').insert({ vote_id: voteId, choice: side })
    setVotes(prev => prev.map(v => {
      if (v.id !== voteId) return v
      const newTotal = v.total + 1
      const newCountA = side === 'a' ? v.count_a + 1 : v.count_a
      return { ...v, total: newTotal, count_a: newCountA, pa: Math.round((newCountA / newTotal) * 100) }
    }))
  }

  async function handleComment() {
    if (!commentText.trim() || !v) return
    const choice = voted[v.id] || 'a'
    const { data } = await supabase.from('comments').insert({ vote_id: v.id, content: commentText.trim(), choice }).select().single()
    if (data) {
      setComments(prev => [data, ...prev])
      setCommentText('')
      setVotes(prev => prev.map(vote => vote.id === v.id ? { ...vote, comments_count: vote.comments_count + 1 } : vote))
    }
  }

  function openComments() { setShowStats(false); setShowComments(true); if (v) fetchComments(v.id) }
  function openStats() { setShowComments(false); setShowStats(true) }
  function closeSheets() { setShowComments(false); setShowStats(false) }

  function handleShare() {
    if (!v) return
    navigator.clipboard.writeText(`${window.location.origin}/vote/${v.id}`)
    setSharedId(v.id)
    setTimeout(() => setSharedId(null), 2000)
  }

  function onTouchStart(e: React.TouchEvent) {
    touchStartY.current = e.touches[0].clientY
    touchStartX.current = e.touches[0].clientX
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (showComments || showStats) return
    const dy = touchStartY.current - e.changedTouches[0].clientY
    const dx = Math.abs(touchStartX.current - e.changedTouches[0].clientX)
    if (Math.abs(dy) > 50 && dx < 30) {
      if (dy > 0) setCurrent(i => Math.min(i + 1, votes.length - 1))
      else setCurrent(i => Math.max(i - 1, 0))
    }
  }

  const v = votes[current]
  const isVoted = v ? voted[v.id] : null
  const isLiked = v ? liked[v.id] : false
  const sheetOpen = showComments || showStats
  const videoHeight = sheetOpen ? '45vh' : '100vh'

  if (loading) return (
    <div style={{ maxWidth: '390px', margin: '0 auto', height: '100vh', background: GRAD, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)' }}>불러오는 중...</div>
    </div>
  )

  if (!v) return (
    <div style={{ maxWidth: '390px', margin: '0 auto', height: '100vh', background: GRAD, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
      <div style={{ fontSize: '40px' }}>🗳️</div>
      <div style={{ fontSize: '16px', fontWeight: 800, color: 'white' }}>아직 투표가 없어요</div>
      <div onClick={() => router.push('/create')} style={{ background: Y, color: '#0A0A0A', borderRadius: '999px', padding: '10px 24px', fontSize: '13px', fontWeight: 800, cursor: 'pointer' }}>투표 만들기 →</div>
      <BottomNav />
    </div>
  )

  return (
    <div style={{ maxWidth: '390px', margin: '0 auto', height: '100vh', overflow: 'hidden', background: GRAD, position: 'relative', fontFamily: '-apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", sans-serif' }}>

      {/* 다크 TopBar */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 50, padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'linear-gradient(to bottom, rgba(10,5,30,0.9) 0%, transparent 100%)' }}>
        <div style={{ fontSize: '18px', fontWeight: 900, letterSpacing: '-0.04em', color: 'white', cursor: 'default', display: 'flex', alignItems: 'center', gap: '3px' }}>
          VERSUS
          <span style={{ background: Y, color: '#0A0A0A', fontSize: '7px', padding: '2px 5px', borderRadius: '4px', marginLeft: '4px', verticalAlign: 'middle', fontWeight: 900 }}>VS</span>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <div onClick={() => router.push('/search')} style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
          </div>
          <div onClick={() => setMenuOpen(true)} style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
          </div>
        </div>
      </div>

      {/* 햄버거 메뉴 */}
      {menuOpen && (
        <>
          <div onClick={() => setMenuOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200 }} />
          <div style={{ position: 'fixed', top: 0, bottom: 0, width: '240px', background: '#1A1A2E', zIndex: 201, display: 'flex', flexDirection: 'column', boxShadow: '-4px 0 24px rgba(0,0,0,0.5)', right: 'max(0px, calc(50vw - 195px))' }}>
            <div style={{ padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '0.5px solid rgba(255,255,255,0.08)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '16px', fontWeight: 900, color: 'white' }}>VERSUS</span>
                <span style={{ background: Y, color: '#0A0A0A', fontSize: '7px', padding: '1px 4px', borderRadius: '3px', fontWeight: 900 }}>VS</span>
              </div>
              <div onClick={() => setMenuOpen(false)} style={{ fontSize: '20px', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}>✕</div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 0' }}>
              <div style={{ fontSize: '10px', fontWeight: 800, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em', padding: '8px 16px 4px' }}>카테고리</div>
              <div onClick={() => { router.push('/hot'); setMenuOpen(false) }} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '11px 16px', cursor: 'pointer', borderBottom: '0.5px solid rgba(255,255,255,0.05)' }}>
                <span style={{ fontSize: '18px' }}>🔥</span><span style={{ fontSize: '14px', fontWeight: 700, color: 'white' }}>인기 투표</span>
              </div>
              {CATEGORIES.map(cat => (
                <div key={cat} onClick={() => { router.push(`/category/${encodeURIComponent(cat)}`); setMenuOpen(false) }} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '11px 16px', cursor: 'pointer', borderBottom: '0.5px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ fontSize: '18px' }}>{cat.split(' ')[0]}</span>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: 'white' }}>{cat.split(' ').slice(1).join(' ')}</span>
                </div>
              ))}
              <div style={{ fontSize: '10px', fontWeight: 800, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em', padding: '16px 16px 8px' }}>메뉴</div>
              {[{ label: '소울메이트', path: '/soul', emoji: '🎯' }, { label: '내 활동', path: '/my', emoji: '👤' }, { label: '투표 만들기', path: '/create', emoji: '✏️' }].map(item => (
                <div key={item.path} onClick={() => { router.push(item.path); setMenuOpen(false) }} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '11px 16px', cursor: 'pointer', borderBottom: '0.5px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ fontSize: '18px' }}>{item.emoji}</span><span style={{ fontSize: '14px', fontWeight: 700, color: 'white' }}>{item.label}</span>
                </div>
              ))}
            </div>
            <div style={{ padding: '14px 16px', borderTop: `3px solid ${Y}`, textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>VERSUS · 세상의 모든 A vs B</div>
            </div>
          </div>
        </>
      )}

      {/* 투표 영역 */}
      <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}
        style={{ height: videoHeight, transition: 'height 0.35s cubic-bezier(0.4,0,0.2,1)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', padding: '60px 0 20px' }}>
          <div style={{ flex: 1, padding: '0 64px 0 20px' }}>
            <div style={{ fontSize: '11px', fontWeight: 800, color: Y, marginBottom: '6px', letterSpacing: '0.04em' }}>{v.category}</div>
            <div style={{ fontSize: sheetOpen ? '16px' : '22px', fontWeight: 900, color: 'white', lineHeight: 1.3, marginBottom: '6px', letterSpacing: '-0.03em', transition: 'font-size 0.3s' }}>{v.question}</div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginBottom: sheetOpen ? '14px' : '20px', transition: 'all 0.3s' }}>{fmt(v.total)}명 참여</div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { side: 'a' as const, name: v.option_a, emoji: v.emoji_a, pct: v.pa },
                { side: 'b' as const, name: v.option_b, emoji: v.emoji_b, pct: 100 - v.pa },
              ].map(opt => (
                <div key={opt.side} onClick={() => handleVote(v.id, opt.side)} style={{
                  borderRadius: '12px', padding: sheetOpen ? '10px 14px' : '14px 16px',
                  display: 'flex', alignItems: 'center', gap: '10px',
                  cursor: isVoted ? 'default' : 'pointer',
                  border: `1.5px solid ${isVoted === opt.side ? Y : isVoted ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.12)'}`,
                  background: isVoted === opt.side ? YS : 'rgba(255,255,255,0.05)',
                  opacity: isVoted && isVoted !== opt.side ? 0.3 : 1,
                  transition: 'all 0.25s', position: 'relative', overflow: 'hidden',
                  boxShadow: isVoted === opt.side ? `0 0 20px rgba(255,215,0,0.2)` : 'none',
                }}>
                  {isVoted && <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${opt.pct}%`, background: isVoted === opt.side ? 'rgba(255,215,0,0.08)' : 'rgba(255,255,255,0.03)', transition: 'width 0.8s' }} />}
                  <span style={{ fontSize: sheetOpen ? '20px' : '24px', flexShrink: 0, transition: 'font-size 0.3s' }}>{opt.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '7px', fontWeight: 900, color: 'rgba(255,255,255,0.2)', marginBottom: '1px' }}>{opt.side.toUpperCase()}</div>
                    <div style={{ fontSize: sheetOpen ? '13px' : '15px', fontWeight: 800, color: 'white', transition: 'font-size 0.3s' }}>{opt.name}</div>
                  </div>
                  {isVoted && <div style={{ fontSize: '16px', fontWeight: 900, color: isVoted === opt.side ? Y : 'rgba(255,255,255,0.35)' }}>{opt.pct}%</div>}
                </div>
              ))}
            </div>

            {isVoted && (
              <div style={{ height: '2px', background: 'rgba(255,255,255,0.08)', borderRadius: '999px', overflow: 'hidden', display: 'flex', marginTop: '8px' }}>
                <div style={{ width: `${v.pa}%`, background: Y, transition: 'width 0.8s' }} />
                <div style={{ flex: 1, background: '#1A6FFF' }} />
              </div>
            )}
          </div>

          {/* 오른쪽 액션 버튼 */}
          <div style={{ position: 'absolute', right: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
            <div onClick={() => setLiked(p => ({ ...p, [v.id]: !p[v.id] }))} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
              <HeartIcon filled={isLiked} />
              <span style={{ fontSize: '10px', fontWeight: 600, color: isLiked ? Y : 'rgba(255,255,255,0.6)' }}>좋아요</span>
            </div>
            <div onClick={openComments} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
              <CommentIcon />
              <span style={{ fontSize: '10px', fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>{fmt(v.comments_count)}</span>
            </div>
            <div onClick={handleShare} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
              <ShareIcon />
              <span style={{ fontSize: '10px', fontWeight: 600, color: sharedId === v.id ? Y : 'rgba(255,255,255,0.6)' }}>{sharedId === v.id ? '복사됨' : '공유'}</span>
            </div>
            <div onClick={openStats} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
              <StatsIcon />
              <span style={{ fontSize: '10px', fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>통계</span>
            </div>
          </div>
        </div>

        {/* 인디케이터 */}
        {!sheetOpen && (
          <div style={{ position: 'absolute', bottom: '16px', left: '20px', right: '20px', display: 'flex', gap: '4px' }}>
            {votes.map((_, i) => (
              <div key={i} style={{ flex: 1, height: '2px', borderRadius: '999px', background: i === current ? Y : 'rgba(255,255,255,0.2)', transition: 'all 0.3s' }} />
            ))}
          </div>
        )}
      </div>

      {/* 댓글 시트 */}
      {showComments && (
        <div style={{ height: 'calc(55vh - 60px)', background: 'rgba(15,10,30,0.98)', borderRadius: '20px 20px 0 0', display: 'flex', flexDirection: 'column', overflow: 'hidden', backdropFilter: 'blur(20px)' }}>
          <div style={{ padding: '12px 16px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '0.5px solid rgba(255,255,255,0.08)' }}>
            <span style={{ fontSize: '14px', fontWeight: 800, color: 'white' }}>댓글 {v.comments_count}개</span>
            <div onClick={closeSheets} style={{ fontSize: '18px', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', padding: '4px' }}>✕</div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
            {commentsLoading ? (
              <div style={{ textAlign: 'center', padding: '20px', fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>불러오는 중...</div>
            ) : comments.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px', fontSize: '13px', color: 'rgba(255,255,255,0.3)' }}>첫 댓글을 달아보세요!</div>
            ) : comments.map(c => (
              <div key={c.id} style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0, background: c.choice === 'a' ? YS : 'rgba(26,111,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 800, color: c.choice === 'a' ? '#B8860B' : '#1A6FFF' }}>익</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>익명</span>
                    <span style={{ fontSize: '8px', fontWeight: 700, padding: '1px 6px', borderRadius: '999px', background: c.choice === 'a' ? YS : 'rgba(26,111,255,0.2)', color: c.choice === 'a' ? '#B8860B' : '#1A6FFF' }}>
                      {c.choice === 'a' ? v.option_a : v.option_b}파
                    </span>
                  </div>
                  <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.85)', lineHeight: 1.5 }}>{c.content}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ padding: '8px 12px 12px', borderTop: '0.5px solid rgba(255,255,255,0.08)', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input value={commentText} onChange={e => setCommentText(e.target.value)}
              placeholder={isVoted ? '댓글 달기...' : '투표 후 댓글 달 수 있어요'}
              disabled={!isVoted}
              onKeyDown={e => e.key === 'Enter' && handleComment()}
              style={{ flex: 1, background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '999px', padding: '10px 14px', fontSize: '13px', color: 'white', outline: 'none', fontFamily: 'inherit' }} />
            <div onClick={handleComment} style={{ width: '34px', height: '34px', borderRadius: '50%', flexShrink: 0, background: commentText && isVoted ? Y : 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={commentText && isVoted ? '#0A0A0A' : 'rgba(255,255,255,0.3)'} strokeWidth="2.5" strokeLinecap="round">
                <line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" />
              </svg>
            </div>
          </div>
        </div>
      )}

      {/* 통계 시트 */}
      {showStats && (
        <div style={{ height: 'calc(55vh - 60px)', background: 'rgba(15,10,30,0.98)', borderRadius: '20px 20px 0 0', overflow: 'hidden', backdropFilter: 'blur(20px)' }}>
          <div style={{ padding: '12px 16px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '0.5px solid rgba(255,255,255,0.08)' }}>
            <span style={{ fontSize: '14px', fontWeight: 800, color: 'white' }}>📊 통계</span>
            <div onClick={closeSheets} style={{ fontSize: '18px', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', padding: '4px' }}>✕</div>
          </div>
          <div style={{ padding: '20px 16px' }}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ fontSize: '32px', fontWeight: 900, color: 'white', marginBottom: '4px' }}>{fmt(v.total)}명</div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>총 참여자</div>
            </div>
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 800, color: Y }}>{v.option_a} {v.pa}%</span>
                <span style={{ fontSize: '12px', fontWeight: 800, color: '#1A6FFF' }}>{100 - v.pa}% {v.option_b}</span>
              </div>
              <div style={{ height: '8px', borderRadius: '999px', overflow: 'hidden', display: 'flex' }}>
                <div style={{ width: `${v.pa}%`, background: Y, transition: 'width 0.8s' }} />
                <div style={{ flex: 1, background: '#1A6FFF' }} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div style={{ background: YS, border: `1px solid ${YB}`, borderRadius: '14px', padding: '14px', textAlign: 'center' }}>
                <div style={{ fontSize: '24px', marginBottom: '6px' }}>{v.emoji_a}</div>
                <div style={{ fontSize: '12px', fontWeight: 800, color: 'white', marginBottom: '4px' }}>{v.option_a}</div>
                <div style={{ fontSize: '24px', fontWeight: 900, color: Y }}>{v.pa}%</div>
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>{fmt(v.count_a)}명</div>
              </div>
              <div style={{ background: 'rgba(26,111,255,0.12)', border: '1px solid rgba(26,111,255,0.3)', borderRadius: '14px', padding: '14px', textAlign: 'center' }}>
                <div style={{ fontSize: '24px', marginBottom: '6px' }}>{v.emoji_b}</div>
                <div style={{ fontSize: '12px', fontWeight: 800, color: 'white', marginBottom: '4px' }}>{v.option_b}</div>
                <div style={{ fontSize: '24px', fontWeight: 900, color: '#1A6FFF' }}>{100 - v.pa}%</div>
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>{fmt(v.count_b)}명</div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={{ height: '60px', background: 'rgba(6,6,20,0.98)' }}>
        <BottomNav />
      </div>
    </div>
  )
}
