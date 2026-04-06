'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import BottomNav from '@/components/BottomNav'
import { supabase } from '@/lib/supabase'
import { CATEGORIES } from '@/lib/categories'

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

function HeartBurst({ active }: { active: boolean }) {
  if (!active) return null
  const angles = [0, 45, 90, 135, 180, 225, 270, 315]
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
      <style>{angles.map((a, i) => `
        @keyframes hbf${i}{0%{transform:translate(0,0) scale(1);opacity:1}100%{transform:translate(${Math.round(Math.cos(a*Math.PI/180)*22)}px,${Math.round(Math.sin(a*Math.PI/180)*22)}px) scale(0);opacity:0}}
      `).join('')}</style>
      {angles.map((a, i) => (
        <div key={i} style={{
          position: 'absolute', width: '5px', height: '5px', borderRadius: '50%',
          background: i % 2 === 0 ? Y : '#FFE44D',
          animation: `hbf${i} 0.5s ease-out forwards`,
        }} />
      ))}
    </div>
  )
}

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

const SHEET_H = 44

export default function Feed() {
  const router = useRouter()
  const [votes, setVotes] = useState<Vote[]>([])
  const [current, setCurrent] = useState(0)
  const [voted, setVoted] = useState<Record<string, 'a' | 'b'>>({})
  const [liked, setLiked] = useState<Record<string, boolean>>({})
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({})
  const [burstId, setBurstId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)

  const touchStartY = useRef(0)
  const touchStartX = useRef(0)
  const isSwiping = useRef(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const commentInputRef = useRef<HTMLInputElement>(null)

  // 시트 드래그용
  const sheetDragStartY = useRef(0)
  const sheetDragOffset = useRef(0)
  const [sheetTranslateY, setSheetTranslateY] = useState(0)
  const [isSheetDragging, setIsSheetDragging] = useState(false)

  const [showComments, setShowComments] = useState(false)
  const [commentsMounted, setCommentsMounted] = useState(false)
  const [showStats, setShowStats] = useState(false)
  const [statsMounted, setStatsMounted] = useState(false)
  const [comments, setComments] = useState<Comment[]>([])
  const [commentText, setCommentText] = useState('')
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [sharedId, setSharedId] = useState<string | null>(null)

  const [slideOffset, setSlideOffset] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)
  const [keyboardHeight, setKeyboardHeight] = useState(0)
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false)

  useEffect(() => { fetchVotes() }, [])

  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const handler = () => {
      const kbHeight = window.innerHeight - vv.height
      if (kbHeight > 100) {
        setKeyboardHeight(kbHeight)
        setIsKeyboardOpen(true)
      } else {
        setKeyboardHeight(0)
        setIsKeyboardOpen(false)
      }
    }
    vv.addEventListener('resize', handler)
    return () => vv.removeEventListener('resize', handler)
  }, [])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const sheetOpen = showComments || showStats
    const handleTouchStart = (e: TouchEvent) => {
      if (sheetOpen) return
      touchStartY.current = e.touches[0].clientY
      touchStartX.current = e.touches[0].clientX
      isSwiping.current = false
      setSlideOffset(0)
    }
    const handleTouchMove = (e: TouchEvent) => {
      if (sheetOpen) return
      const dy = touchStartY.current - e.touches[0].clientY
      const dx = Math.abs(touchStartX.current - e.touches[0].clientX)
      if (Math.abs(dy) > 15 && dx < Math.abs(dy) * 0.6) {
        e.preventDefault()
        isSwiping.current = true
        setSlideOffset(-dy)
      } else if (dx > Math.abs(dy) * 0.6) {
        // 수평이면 스와이프 취소
        isSwiping.current = false
      }
    }
    const handleTouchEnd = (e: TouchEvent) => {
      if (sheetOpen || !isSwiping.current) return
      const dy = touchStartY.current - e.changedTouches[0].clientY
      const dx = Math.abs(touchStartX.current - e.changedTouches[0].clientX)
      if (Math.abs(dy) > 80 && dx < 40) {
        setIsAnimating(true)
        if (dy > 0) {
          setSlideOffset(-window.innerHeight)
          setTimeout(() => { setCurrent(i => Math.min(i + 1, votes.length - 1)); setSlideOffset(0); setIsAnimating(false) }, 280)
        } else {
          setSlideOffset(window.innerHeight)
          setTimeout(() => { setCurrent(i => Math.max(i - 1, 0)); setSlideOffset(0); setIsAnimating(false) }, 280)
        }
      } else {
        setIsAnimating(true); setSlideOffset(0)
        setTimeout(() => setIsAnimating(false), 200)
      }
      isSwiping.current = false
    }
    el.addEventListener('touchstart', handleTouchStart, { passive: true })
    el.addEventListener('touchmove', handleTouchMove, { passive: false })
    el.addEventListener('touchend', handleTouchEnd, { passive: true })
    return () => {
      el.removeEventListener('touchstart', handleTouchStart)
      el.removeEventListener('touchmove', handleTouchMove)
      el.removeEventListener('touchend', handleTouchEnd)
    }
  }, [showComments, showStats, votes.length])

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

  function handleLike() {
    if (!v) return
    const isNowLiked = !liked[v.id]
    setLiked(p => ({ ...p, [v.id]: isNowLiked }))
    setLikeCounts(p => ({ ...p, [v.id]: (p[v.id] || 0) + (isNowLiked ? 1 : -1) }))
    if (isNowLiked) { setBurstId(v.id); setTimeout(() => setBurstId(null), 500) }
  }

  function openComments() {
    setShowStats(false); setStatsMounted(false)
    setSheetTranslateY(0); setIsSheetDragging(false)
    setShowComments(true)
    if (v) fetchComments(v.id)
    requestAnimationFrame(() => requestAnimationFrame(() => {
      setCommentsMounted(true)
    }))
  }

  function openStats() {
    setShowComments(false); setCommentsMounted(false)
    setSheetTranslateY(0); setIsSheetDragging(false)
    setShowStats(true)
    requestAnimationFrame(() => requestAnimationFrame(() => setStatsMounted(true)))
  }

  function closeSheets() {
    setCommentsMounted(false); setStatsMounted(false)
    setSheetTranslateY(0)
    setTimeout(() => { setShowComments(false); setShowStats(false) }, 300)
    setKeyboardHeight(0); setIsKeyboardOpen(false)
    commentInputRef.current?.blur()
  }

  // 시트 드래그 핸들러
  function onSheetDragStart(e: React.TouchEvent) {
    sheetDragStartY.current = e.touches[0].clientY
    sheetDragOffset.current = 0
    setIsSheetDragging(true)
  }
  function onSheetDragMove(e: React.TouchEvent) {
    const dy = e.touches[0].clientY - sheetDragStartY.current
    if (dy > 0) {
      sheetDragOffset.current = dy
      setSheetTranslateY(dy)
    }
  }
  function onSheetDragEnd() {
    setIsSheetDragging(false)
    if (sheetDragOffset.current > 80) {
      // 충분히 아래로 드래그 → 닫기
      closeSheets()
    } else {
      // 복귀
      setSheetTranslateY(0)
    }
    sheetDragOffset.current = 0
  }

  function handleShare() {
    if (!v) return
    navigator.clipboard.writeText(`${window.location.origin}/vote/${v.id}`)
    setSharedId(v.id)
    setTimeout(() => setSharedId(null), 2000)
  }

  const v = votes[current]
  const isVoted = v ? voted[v.id] : null
  const isLiked = v ? liked[v.id] : false
  const likeCount = v ? (likeCounts[v.id] || 0) : 0
  const sheetOpen = showComments || showStats
  const sheetH = `${SHEET_H}vh`

  // 댓글창 높이: 키보드 열려도 고정, 키보드 위로만 올라감
  const commentSheetBottom = isKeyboardOpen ? keyboardHeight : 0
  const commentSheetHeight = `${SHEET_H}vh`

  if (loading) return (
    <div style={{ maxWidth: '390px', margin: '0 auto', height: '100svh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0A0A0A' }}>
      <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)' }}>불러오는 중...</div>
    </div>
  )

  if (!v) return (
    <div style={{ maxWidth: '390px', margin: '0 auto', height: '100svh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', background: '#0A0A0A' }}>
      <div style={{ fontSize: '40px' }}>🗳️</div>
      <div style={{ fontSize: '16px', fontWeight: 800, color: 'white' }}>아직 투표가 없어요</div>
      <div onClick={() => router.push('/create')} style={{ background: Y, color: '#0A0A0A', borderRadius: '999px', padding: '10px 24px', fontSize: '13px', fontWeight: 800, cursor: 'pointer' }}>투표 만들기 →</div>
      <BottomNav />
    </div>
  )

  return (
    <>
      <style>{`
        @keyframes gradMove {
          0%   { background-position: 0% 50% }
          25%  { background-position: 100% 0% }
          50%  { background-position: 100% 100% }
          75%  { background-position: 0% 100% }
          100% { background-position: 0% 50% }
        }
        .animated-bg {
          background: linear-gradient(135deg, #0d0d1a, #2a0a3e, #0a2a1a, #3e1a00, #001a3e, #1a001a);
          background-size: 600% 600%;
          animation: gradMove 5s ease infinite;
        }
      `}</style>

      <div
        ref={containerRef}
        className="animated-bg"
        style={{
          maxWidth: '390px', margin: '0 auto', height: '100svh',
          overflow: 'hidden', position: 'relative',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", sans-serif',
          userSelect: 'none',
        }}
      >
        {/* TopBar */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 50, padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'linear-gradient(to bottom, rgba(10,5,30,0.9) 0%, transparent 100%)' }}>
          <div style={{ fontSize: '18px', fontWeight: 900, letterSpacing: '-0.04em', color: 'white', display: 'flex', alignItems: 'center', gap: '3px' }}>
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
        <div style={{
        height: sheetOpen ? `${100 - SHEET_H}svh` : '100svh',
          transition: isSheetDragging ? 'none' : 'height 0.32s cubic-bezier(0.32,0.72,0,1)',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transform: `translateY(${slideOffset}px)`,
            transition: isAnimating ? 'transform 0.28s cubic-bezier(0.4,0,0.2,1)' : 'none',
            willChange: 'transform',
          }}>
            <div style={{ flex: 1, padding: '0 64px 0 20px' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: Y, marginBottom: '6px', letterSpacing: '0.04em' }}>{v.category}</div>
              <div style={{ fontSize: sheetOpen ? '15px' : '22px', fontWeight: 900, color: 'white', lineHeight: 1.3, marginBottom: '6px', letterSpacing: '-0.03em', transition: 'font-size 0.3s' }}>{v.question}</div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginBottom: sheetOpen ? '10px' : '20px', transition: 'all 0.3s' }}>{fmt(v.total)}명 참여</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[
                  { side: 'a' as const, name: v.option_a, emoji: v.emoji_a, pct: v.pa },
                  { side: 'b' as const, name: v.option_b, emoji: v.emoji_b, pct: 100 - v.pa },
                ].map(opt => (
                  <div key={opt.side} onClick={() => handleVote(v.id, opt.side)} style={{
                    borderRadius: '12px', padding: sheetOpen ? '8px 12px' : '14px 16px',
                    display: 'flex', alignItems: 'center', gap: '10px',
                    cursor: isVoted ? 'default' : 'pointer',
                    border: `1.5px solid ${isVoted === opt.side ? Y : isVoted ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.12)'}`,
                    background: isVoted === opt.side ? YS : 'rgba(255,255,255,0.05)',
                    opacity: isVoted && isVoted !== opt.side ? 0.3 : 1,
                    transition: 'all 0.25s', position: 'relative', overflow: 'hidden',
                    boxShadow: isVoted === opt.side ? `0 0 20px rgba(255,215,0,0.2)` : 'none',
                  }}>
                    {isVoted && <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${opt.pct}%`, background: isVoted === opt.side ? 'rgba(255,215,0,0.08)' : 'rgba(255,255,255,0.03)', transition: 'width 0.8s' }} />}
                    <span style={{ fontSize: sheetOpen ? '18px' : '24px', flexShrink: 0, transition: 'font-size 0.3s' }}>{opt.emoji}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '7px', fontWeight: 900, color: 'rgba(255,255,255,0.2)', marginBottom: '1px' }}>{opt.side.toUpperCase()}</div>
                      <div style={{ fontSize: sheetOpen ? '12px' : '15px', fontWeight: 800, color: 'white', transition: 'font-size 0.3s' }}>{opt.name}</div>
                    </div>
                    {isVoted && <div style={{ fontSize: '15px', fontWeight: 900, color: isVoted === opt.side ? Y : 'rgba(255,255,255,0.35)' }}>{opt.pct}%</div>}
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
              <div onClick={handleLike} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', cursor: 'pointer', position: 'relative' }}>
                <HeartBurst active={burstId === v.id} />
                <svg width="28" height="28" viewBox="0 0 24 24" fill={isLiked ? Y : 'none'} stroke={Y} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
                </svg>
                <span style={{ fontSize: '10px', fontWeight: 700, color: isLiked ? Y : 'rgba(255,255,255,0.6)', minWidth: '30px', textAlign: 'center' }}>
                  {likeCount > 0 ? likeCount : '좋아요'}
                </span>
              </div>
              <div onClick={openComments} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={showComments ? Y : 'white'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                </svg>
                <span style={{ fontSize: '10px', fontWeight: 700, color: showComments ? Y : 'rgba(255,255,255,0.6)' }}>
                  {v.comments_count > 0 ? v.comments_count : '댓글'}
                </span>
              </div>
              <div onClick={handleShare} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                <ShareIcon />
                <span style={{ fontSize: '10px', fontWeight: 600, color: sharedId === v.id ? Y : 'rgba(255,255,255,0.6)' }}>{sharedId === v.id ? '복사됨' : '공유'}</span>
              </div>
              <div onClick={openStats} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                <StatsIcon />
                <span style={{ fontSize: '10px', fontWeight: 600, color: showStats ? Y : 'rgba(255,255,255,0.6)' }}>통계</span>
              </div>
            </div>
          </div>

          {!sheetOpen && votes.length > 1 && (
            <div style={{ position: 'absolute', bottom: '28px', left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', opacity: 0.35, pointerEvents: 'none' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><polyline points="18 15 12 9 6 15" /></svg>
              <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'white' }} />
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><polyline points="6 9 12 15 18 9" /></svg>
            </div>
          )}
          {!sheetOpen && (
            <div style={{ position: 'absolute', right: '4px', top: '50%', transform: 'translateY(-50%)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {votes.map((_, i) => (
                <div key={i} onClick={() => setCurrent(i)} style={{
                  width: '3px', height: i === current ? '20px' : '4px', borderRadius: '999px',
                  background: i === current ? Y : 'rgba(255,255,255,0.2)', transition: 'all 0.3s', cursor: 'pointer',
                }} />
              ))}
            </div>
          )}
        </div>

        <div style={{ height: '60px', background: 'rgba(6,6,20,0.98)' }}>
          <BottomNav />
        </div>
      </div>

      {/* ── 댓글 시트 ── */}
      {showComments && (
        <div
          style={{
            position: 'fixed',
            left: '50%',
            width: '100%', maxWidth: '390px',
            bottom: `${commentSheetBottom}px`,
            height: commentSheetHeight,
            zIndex: 100,
            display: 'flex', flexDirection: 'column',
            background: 'rgba(10,8,20,0.98)',
            borderRadius: '20px 20px 0 0',
            border: '0.5px solid rgba(255,255,255,0.1)',
            backdropFilter: 'blur(20px)',
            // 슬라이드업 + 드래그
            transform: commentsMounted
              ? `translateX(-50%) translateY(${sheetTranslateY}px)`
              : 'translateX(-50%) translateY(100%)',
            transition: isSheetDragging
              ? 'none'
              : 'transform 0.32s cubic-bezier(0.32,0.72,0,1)',
          }}
        >
          {/* 드래그 핸들 막대 */}
          <div
            onTouchStart={onSheetDragStart}
            onTouchMove={onSheetDragMove}
            onTouchEnd={onSheetDragEnd}
            style={{ padding: '10px 0 6px', display: 'flex', justifyContent: 'center', cursor: 'grab', flexShrink: 0 }}>
            <div style={{ width: '36px', height: '4px', borderRadius: '999px', background: 'rgba(255,255,255,0.2)' }} />
          </div>

          {/* 헤더 */}
          <div style={{ padding: '4px 16px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '0.5px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
            <span style={{ fontSize: '14px', fontWeight: 800, color: 'white' }}>💬 댓글 {v.comments_count}개</span>
            <div onClick={closeSheets} style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '14px', color: 'rgba(255,255,255,0.6)' }}>✕</div>
          </div>

          {/* 댓글 목록 */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
            {commentsLoading ? (
              <div style={{ textAlign: 'center', padding: '20px', fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>불러오는 중...</div>
            ) : comments.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px', fontSize: '13px', color: 'rgba(255,255,255,0.3)' }}>
                {isVoted ? '첫 댓글을 달아보세요! 👋' : '투표 후 댓글 달 수 있어요'}
              </div>
            ) : comments.map(c => (
              <div key={c.id} style={{ display: 'flex', gap: '8px', marginBottom: '12px', alignItems: 'flex-end' }}>
                <div style={{
                  width: '26px', height: '26px', borderRadius: '50%', flexShrink: 0,
                  background: c.choice === 'a' ? YS : 'rgba(26,111,255,0.25)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '9px', fontWeight: 800,
                  color: c.choice === 'a' ? '#B8860B' : '#4A8FFF',
                  border: `1px solid ${c.choice === 'a' ? YB : 'rgba(26,111,255,0.3)'}`,
                }}>익</div>
                <div style={{ flex: 1 }}>
                  <span style={{
                    fontSize: '8px', fontWeight: 800, padding: '2px 7px', borderRadius: '999px',
                    background: c.choice === 'a' ? YS : 'rgba(26,111,255,0.2)',
                    color: c.choice === 'a' ? '#B8860B' : '#4A8FFF',
                    marginBottom: '4px', display: 'inline-block',
                  }}>{c.choice === 'a' ? v.option_a : v.option_b}파</span>
                  <div style={{
                    background: 'rgba(255,255,255,0.08)',
                    borderRadius: '18px 18px 18px 4px',
                    padding: '9px 13px',
                    fontSize: '13px', color: 'rgba(255,255,255,0.9)',
                    lineHeight: 1.5,
                    border: '0.5px solid rgba(255,255,255,0.06)',
                    display: 'inline-block', maxWidth: '100%',
                  }}>{c.content}</div>
                </div>
              </div>
            ))}
          </div>

          {/* 입력창 - 키보드 열려도 크기 고정 */}
          <div style={{
            padding: '8px 12px 16px',
            borderTop: '0.5px solid rgba(255,255,255,0.08)',
            display: 'flex', gap: '8px', alignItems: 'center',
            flexShrink: 0,
            background: 'rgba(10,8,20,0.98)',
          }}>
            <input
              ref={commentInputRef}
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              placeholder={isVoted ? '댓글 달기...' : '먼저 투표해주세요!'}
              disabled={!isVoted}
              onKeyDown={e => e.key === 'Enter' && handleComment()}
              style={{
                flex: 1,
                background: 'rgba(255,255,255,0.08)',
                border: '0.5px solid rgba(255,255,255,0.1)',
                borderRadius: '22px',
                padding: '11px 16px',
                fontSize: '13px', color: 'white', outline: 'none',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", sans-serif',
              }}
            />
            <div onClick={handleComment} style={{
              width: '38px', height: '38px', borderRadius: '50%', flexShrink: 0,
              background: commentText && isVoted ? Y : 'rgba(255,255,255,0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
              transition: 'background 0.2s',
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke={commentText && isVoted ? '#0A0A0A' : 'rgba(255,255,255,0.3)'}
                strokeWidth="2.5" strokeLinecap="round">
                <line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" />
              </svg>
            </div>
          </div>
        </div>
      )}

      {/* ── 통계 시트 ── */}
      {showStats && (
        <div style={{
          position: 'fixed', left: '50%',
          width: '100%', maxWidth: '390px',
          bottom: 0, height: sheetH, zIndex: 100,
          background: 'rgba(10,8,20,0.98)', borderRadius: '20px 20px 0 0',
          overflow: 'hidden', backdropFilter: 'blur(20px)',
          border: '0.5px solid rgba(255,255,255,0.1)',
          display: 'flex', flexDirection: 'column',
          transform: statsMounted
            ? `translateX(-50%) translateY(${sheetTranslateY}px)`
            : 'translateX(-50%) translateY(100%)',
          transition: isSheetDragging ? 'none' : 'transform 0.32s cubic-bezier(0.32,0.72,0,1)',
        }}>
          {/* 드래그 핸들 막대 */}
          <div
            onTouchStart={onSheetDragStart}
            onTouchMove={onSheetDragMove}
            onTouchEnd={onSheetDragEnd}
            style={{ padding: '10px 0 6px', display: 'flex', justifyContent: 'center', cursor: 'grab', flexShrink: 0 }}>
            <div style={{ width: '36px', height: '4px', borderRadius: '999px', background: 'rgba(255,255,255,0.2)' }} />
          </div>

          <div style={{ padding: '4px 16px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '0.5px solid rgba(255,255,255,0.08)' }}>
            <span style={{ fontSize: '14px', fontWeight: 800, color: 'white' }}>📊 통계</span>
            <div onClick={closeSheets} style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '14px', color: 'rgba(255,255,255,0.6)' }}>✕</div>
          </div>
          <div style={{ padding: '16px', overflowY: 'auto', flex: 1 }}>
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '28px', fontWeight: 900, color: 'white', marginBottom: '2px' }}>{fmt(v.total)}명</div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>총 참여자</div>
            </div>
            <div style={{ marginBottom: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '12px', fontWeight: 800, color: Y }}>{v.option_a} {v.pa}%</span>
                <span style={{ fontSize: '12px', fontWeight: 800, color: '#4A8FFF' }}>{100 - v.pa}% {v.option_b}</span>
              </div>
              <div style={{ height: '8px', borderRadius: '999px', overflow: 'hidden', display: 'flex' }}>
                <div style={{ width: `${v.pa}%`, background: Y, transition: 'width 0.8s' }} />
                <div style={{ flex: 1, background: '#1A6FFF' }} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div style={{ background: YS, border: `1px solid ${YB}`, borderRadius: '14px', padding: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '22px', marginBottom: '4px' }}>{v.emoji_a}</div>
                <div style={{ fontSize: '11px', fontWeight: 800, color: 'white', marginBottom: '4px' }}>{v.option_a}</div>
                <div style={{ fontSize: '22px', fontWeight: 900, color: Y }}>{v.pa}%</div>
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>{fmt(v.count_a)}명</div>
              </div>
              <div style={{ background: 'rgba(26,111,255,0.12)', border: '1px solid rgba(26,111,255,0.3)', borderRadius: '14px', padding: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '22px', marginBottom: '4px' }}>{v.emoji_b}</div>
                <div style={{ fontSize: '11px', fontWeight: 800, color: 'white', marginBottom: '4px' }}>{v.option_b}</div>
                <div style={{ fontSize: '22px', fontWeight: 900, color: '#4A8FFF' }}>{100 - v.pa}%</div>
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>{fmt(v.count_b)}명</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
