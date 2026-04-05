'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getEmoji } from '@/lib/emojiMap'
import { CATEGORIES } from '@/lib/categories'

const ADMIN_PW = 'versus2024!'
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
  is_realtime: boolean; is_featured: boolean; created_at: string; total: number
}

function fmt(n: number) {
  return n >= 10000 ? (n/10000).toFixed(1)+'만' : n >= 1000 ? (n/1000).toFixed(1)+'k' : ''+n
}

export default function Admin() {
  const [authed, setAuthed] = useState(false)
  const [pw, setPw] = useState('')
  const [pwError, setPwError] = useState(false)
  const [tab, setTab] = useState<'create'|'manage'>('create')
  const [votes, setVotes] = useState<Vote[]>([])
  const [loading, setLoading] = useState(false)

  // 생성 폼
  const [question, setQuestion] = useState('')
  const [optA, setOptA] = useState('')
  const [optB, setOptB] = useState('')
  const [emojiA, setEmojiA] = useState('👍')
  const [emojiB, setEmojiB] = useState('👎')
  const [category, setCategory] = useState('🌍 시사/이슈')
  const [isFeatured, setIsFeatured] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitDone, setSubmitDone] = useState(false)

  // 관리 필터
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<'popular'|'latest'|'featured'>('popular')

  useEffect(() => {
    const saved = sessionStorage.getItem('versus_admin')
    if (saved === ADMIN_PW) setAuthed(true)
  }, [])

  useEffect(() => {
    if (authed && tab === 'manage') fetchVotes()
  }, [authed, tab])

  async function fetchVotes() {
    setLoading(true)
    const { data } = await supabase
      .from('votes')
      .select('id, question, option_a, option_b, emoji_a, emoji_b, category, is_realtime, is_featured, created_at, vote_results(choice)')
      .order('created_at', { ascending: false })
      .limit(200)
    if (data) {
      setVotes(data.map((v: any) => ({ ...v, total: (v.vote_results || []).length })))
    }
    setLoading(false)
  }

  function handleLogin() {
    if (pw === ADMIN_PW) {
      sessionStorage.setItem('versus_admin', pw)
      setAuthed(true); setPwError(false)
    } else { setPwError(true) }
  }

  async function handleCreate() {
    if (!question.trim() || !optA.trim() || !optB.trim() || submitting) return
    setSubmitting(true)
    try {
      const { error } = await supabase.from('votes').insert({
        question: question.trim(),
        option_a: optA.trim(), option_b: optB.trim(),
        emoji_a: emojiA, emoji_b: emojiB,
        category, is_realtime: false, is_featured: isFeatured,
        expires_at: null,
      })
      if (error) { alert('등록 실패: ' + error.message) }
      else {
        setQuestion(''); setOptA(''); setOptB('')
        setEmojiA('👍'); setEmojiB('👎')
        setIsFeatured(true); setSubmitDone(true)
        setTimeout(() => setSubmitDone(false), 2000)
      }
    } catch(e: any) { alert('오류: ' + e.message) }
    setSubmitting(false)
  }

  async function toggleFeatured(id: string, current: boolean) {
    setVotes(prev => prev.map(v => v.id === id ? { ...v, is_featured: !current } : v))
    const { error } = await supabase.from('votes').update({ is_featured: !current }).eq('id', id)
    if (error) {
      alert('업데이트 실패: ' + error.message)
      setVotes(prev => prev.map(v => v.id === id ? { ...v, is_featured: current } : v))
    }
  }

  async function deleteVote(id: string) {
    if (!confirm('정말 삭제할까요?')) return
    await supabase.from('votes').delete().eq('id', id)
    setVotes(prev => prev.filter(v => v.id !== id))
  }

  // 필터링된 리스트
  function getFilteredVotes() {
    let list = [...votes]
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(v =>
        v.question.toLowerCase().includes(q) ||
        v.option_a.toLowerCase().includes(q) ||
        v.option_b.toLowerCase().includes(q)
      )
    }
    if (sort === 'featured') list = list.filter(v => v.is_featured)
    else if (sort === 'popular') list.sort((a, b) => b.total - a.total)
    else if (sort === 'latest') list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    return list
  }

  // ── 로그인 ──
  if (!authed) return (
    <div style={{ maxWidth:'390px', margin:'0 auto', minHeight:'100vh', background:BG, fontFamily:font, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'20px' }}>
      <div style={{ marginBottom:'32px', textAlign:'center' }}>
        <div style={{ fontSize:'32px', marginBottom:'8px' }}>🔐</div>
        <div style={{ fontSize:'20px', fontWeight:900, color:'white' }}>VERSUS</div>
        <div style={{ fontSize:'12px', color:'white', opacity:0.4, marginTop:'4px' }}>운영자 전용</div>
      </div>
      <div style={{ width:'100%', background:CARD, borderRadius:'16px', padding:'20px', border:`1px solid ${YB}` }}>
        <input type="password" value={pw}
          onChange={e => { setPw(e.target.value); setPwError(false) }}
          onKeyDown={e => e.key==='Enter' && handleLogin()}
          placeholder="비밀번호 입력"
          style={{ width:'100%', background:'rgba(255,255,255,0.07)', border:`1px solid ${pwError ? R : 'rgba(255,255,255,0.1)'}`, borderRadius:'10px', padding:'12px 14px', fontSize:'14px', color:'white', outline:'none', fontFamily:font, marginBottom:'10px' }} />
        {pwError && <div style={{ fontSize:'12px', color:R, marginBottom:'10px' }}>비밀번호가 틀렸어요</div>}
        <div onClick={handleLogin} style={{ background:Y, color:'#0A0A0A', borderRadius:'10px', padding:'12px', fontSize:'14px', fontWeight:900, textAlign:'center', cursor:'pointer' }}>로그인</div>
      </div>
    </div>
  )

  const filteredVotes = getFilteredVotes()

  // ── 관리자 ──
  return (
    <div style={{ maxWidth:'390px', margin:'0 auto', minHeight:'100vh', background:BG, fontFamily:font }}>

      {/* 탑바 */}
      <div style={{ background:CARD, padding:'12px 16px', display:'flex', alignItems:'center', justifyContent:'space-between', borderBottom:`0.5px solid ${YB}`, position:'sticky', top:0, zIndex:50 }}>
        <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
          <span style={{ fontSize:'16px', fontWeight:900, color:Y }}>VERSUS</span>
          <span style={{ fontSize:'10px', fontWeight:700, color:'white', opacity:0.4, background:'rgba(255,255,255,0.08)', padding:'2px 8px', borderRadius:'999px' }}>운영자</span>
        </div>
        <div onClick={() => { sessionStorage.removeItem('versus_admin'); setAuthed(false) }}
          style={{ fontSize:'11px', color:'white', opacity:0.4, cursor:'pointer' }}>로그아웃</div>
      </div>

      {/* 탭 */}
      <div style={{ display:'flex', borderBottom:'0.5px solid rgba(255,255,255,0.06)' }}>
        {([['create','✏️ 투표 생성'],['manage','📋 투표 관리']] as const).map(([t, label]) => (
          <div key={t} onClick={() => setTab(t)} style={{
            flex:1, padding:'12px 0', textAlign:'center', fontSize:'13px', cursor:'pointer',
            fontWeight: tab===t ? 900 : 600,
            color: tab===t ? Y : 'white',
            opacity: tab===t ? 1 : 0.4,
            borderBottom: tab===t ? `2.5px solid ${Y}` : '2.5px solid transparent',
          }}>{label}</div>
        ))}
      </div>

      {/* ── 투표 생성 ── */}
      {tab === 'create' && (
        <div style={{ padding:'16px', paddingBottom:'60px' }}>

          {/* 핫이슈 토글 */}
          <div style={{ background:CARD, borderRadius:'14px', padding:'14px', border:`1px solid ${isFeatured ? YB : 'rgba(255,255,255,0.08)'}`, marginBottom:'12px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div>
              <div style={{ fontSize:'13px', fontWeight:800, color:'white', marginBottom:'3px' }}>🔥 핫이슈 등록</div>
              <div style={{ fontSize:'11px', color:'white', opacity:0.45 }}>홈 위젯에 바로 노출돼요</div>
            </div>
            <div onClick={() => setIsFeatured(f => !f)} style={{ width:'44px', height:'24px', borderRadius:'999px', position:'relative', cursor:'pointer', background: isFeatured ? Y : 'rgba(255,255,255,0.15)', transition:'all 0.2s' }}>
              <div style={{ position:'absolute', top:'3px', left: isFeatured ? '23px' : '3px', width:'18px', height:'18px', borderRadius:'50%', background: isFeatured ? '#0A0A0A' : 'white', transition:'all 0.2s' }} />
            </div>
          </div>

          {/* 질문 */}
          <div style={{ marginBottom:'12px' }}>
            <div style={{ fontSize:'11px', fontWeight:800, color:'white', opacity:0.5, marginBottom:'6px' }}>질문</div>
            <textarea value={question} onChange={e => setQuestion(e.target.value)}
              placeholder="예) 트럼프 이란 침공, 어떻게 생각해?" maxLength={100}
              style={{ width:'100%', background:CARD, border:'1px solid rgba(255,255,255,0.1)', borderRadius:'12px', padding:'12px 14px', fontSize:'14px', color:'white', outline:'none', resize:'none', height:'80px', fontFamily:font, lineHeight:1.5 }}
              onFocus={e => e.target.style.borderColor = YB}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
            <div style={{ fontSize:'10px', color:'white', opacity:0.3, textAlign:'right', marginTop:'3px' }}>{question.length}/100</div>
          </div>

          {/* A/B 선택지 */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'12px' }}>
            <div>
              <div style={{ fontSize:'11px', fontWeight:800, color:Y, marginBottom:'6px' }}>A 선택지 {emojiA}</div>
              <input value={optA} onChange={e => { setOptA(e.target.value); setEmojiA(getEmoji(e.target.value)) }}
                placeholder="예) 지지한다" maxLength={20}
                style={{ width:'100%', background:YS, border:`1px solid ${YB}`, borderRadius:'10px', padding:'10px 12px', fontSize:'13px', color:'white', outline:'none', fontFamily:font }} />
            </div>
            <div>
              <div style={{ fontSize:'11px', fontWeight:800, color:R, marginBottom:'6px' }}>B 선택지 {emojiB}</div>
              <input value={optB} onChange={e => { setOptB(e.target.value); setEmojiB(getEmoji(e.target.value)) }}
                placeholder="예) 반대한다" maxLength={20}
                style={{ width:'100%', background:RS, border:`1px solid ${RB}`, borderRadius:'10px', padding:'10px 12px', fontSize:'13px', color:'white', outline:'none', fontFamily:font }} />
            </div>
          </div>

          {/* 이모지 직접 입력 */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'12px' }}>
            <div>
              <div style={{ fontSize:'10px', color:'white', opacity:0.4, marginBottom:'5px' }}>A 이모지</div>
              <input value={emojiA} onChange={e => setEmojiA(e.target.value)}
                style={{ width:'100%', background:CARD, border:'1px solid rgba(255,255,255,0.1)', borderRadius:'10px', padding:'8px 12px', fontSize:'20px', color:'white', outline:'none', textAlign:'center' }} />
            </div>
            <div>
              <div style={{ fontSize:'10px', color:'white', opacity:0.4, marginBottom:'5px' }}>B 이모지</div>
              <input value={emojiB} onChange={e => setEmojiB(e.target.value)}
                style={{ width:'100%', background:CARD, border:'1px solid rgba(255,255,255,0.1)', borderRadius:'10px', padding:'8px 12px', fontSize:'20px', color:'white', outline:'none', textAlign:'center' }} />
            </div>
          </div>

          {/* 카테고리 */}
          <div style={{ marginBottom:'20px' }}>
            <div style={{ fontSize:'11px', fontWeight:800, color:'white', opacity:0.5, marginBottom:'8px' }}>카테고리</div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:'7px' }}>
              {['🌍 시사/이슈', ...CATEGORIES].map(cat => (
                <div key={cat} onClick={() => setCategory(cat)} style={{
                  padding:'7px 14px', borderRadius:'999px', fontSize:'12px', fontWeight:700, cursor:'pointer',
                  background: category===cat ? Y : 'rgba(255,255,255,0.07)',
                  color: category===cat ? '#0A0A0A' : 'white',
                  border:`1px solid ${category===cat ? Y : 'rgba(255,255,255,0.1)'}`,
                }}>{cat}</div>
              ))}
            </div>
          </div>

          {/* 미리보기 */}
          {question && optA && optB && (
            <div style={{ background:CARD, borderRadius:'14px', padding:'14px', border:`1px solid ${YB}`, marginBottom:'16px' }}>
              <div style={{ fontSize:'10px', color:'white', opacity:0.35, marginBottom:'8px' }}>미리보기</div>
              <div style={{ fontSize:'15px', fontWeight:900, color:'white', marginBottom:'10px' }}>{question}</div>
              <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
                <span style={{ fontSize:'12px', padding:'5px 14px', borderRadius:'999px', background:YS, color:Y, border:`1px solid ${YB}`, fontWeight:700 }}>{emojiA} {optA}</span>
                <span style={{ fontSize:'11px', color:'white', opacity:0.3 }}>vs</span>
                <span style={{ fontSize:'12px', padding:'5px 14px', borderRadius:'999px', background:RS, color:R, border:`1px solid ${RB}`, fontWeight:700 }}>{emojiB} {optB}</span>
              </div>
            </div>
          )}

          {/* 등록 버튼 */}
          <div onClick={handleCreate} style={{
            background: submitDone ? 'rgba(0,200,100,0.8)' : question&&optA&&optB ? Y : 'rgba(255,255,255,0.1)',
            color: question&&optA&&optB ? '#0A0A0A' : 'rgba(255,255,255,0.3)',
            borderRadius:'12px', padding:'14px', fontSize:'15px', fontWeight:900,
            textAlign:'center', cursor: question&&optA&&optB ? 'pointer' : 'default', transition:'all 0.2s',
          }}>
            {submitting ? '⏳ 등록 중...' : submitDone ? '✅ 등록 완료!' : isFeatured ? '🔥 핫이슈로 등록' : '투표 등록'}
          </div>
        </div>
      )}

      {/* ── 투표 관리 ── */}
      {tab === 'manage' && (
        <div style={{ paddingBottom:'60px' }}>

          {/* 검색 */}
          <div style={{ padding:'12px 16px 8px' }}>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="🔍 투표 검색..."
              style={{ width:'100%', background:CARD, border:'1px solid rgba(255,255,255,0.1)', borderRadius:'10px', padding:'10px 14px', fontSize:'13px', color:'white', outline:'none', fontFamily:font }}
              onFocus={e => e.target.style.borderColor = YB}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
          </div>

          {/* 정렬 탭 */}
          <div style={{ padding:'0 16px 10px', display:'flex', gap:'6px', alignItems:'center' }}>
            {([['popular','🔥 인기순'],['latest','🆕 최신순'],['featured','⭐ 핫이슈']] as const).map(([val, label]) => (
              <div key={val} onClick={() => setSort(val)} style={{
                padding:'6px 14px', borderRadius:'999px', fontSize:'11px', fontWeight:700, cursor:'pointer',
                background: sort===val ? Y : 'rgba(255,255,255,0.07)',
                color: sort===val ? '#0A0A0A' : 'white',
                border:`1px solid ${sort===val ? Y : 'rgba(255,255,255,0.1)'}`,
              }}>{label}</div>
            ))}
            <div onClick={fetchVotes} style={{ marginLeft:'auto', fontSize:'13px', color:Y, cursor:'pointer', fontWeight:700 }}>↻</div>
          </div>

          {/* 결과 수 */}
          <div style={{ padding:'0 16px 6px' }}>
            <span style={{ fontSize:'11px', color:'white', opacity:0.35 }}>{filteredVotes.length}개</span>
          </div>

          {/* 리스트 */}
          {loading ? (
            <div style={{ textAlign:'center', padding:'40px', fontSize:'13px', color:'white', opacity:0.4 }}>불러오는 중...</div>
          ) : filteredVotes.length === 0 ? (
            <div style={{ textAlign:'center', padding:'40px', fontSize:'13px', color:'white', opacity:0.4 }}>결과가 없어요</div>
          ) : (
            filteredVotes.map(v => (
              <div key={v.id} style={{ padding:'12px 16px', borderBottom:'0.5px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'6px' }}>
                  <div style={{ display:'flex', gap:'6px', alignItems:'center', flexWrap:'wrap' }}>
                    <span style={{ fontSize:'9px', color:'white', opacity:0.4 }}>{v.category}</span>
                    {v.is_featured && (
                      <span style={{ fontSize:'8px', fontWeight:800, padding:'1px 6px', borderRadius:'999px', background:YS, color:Y, border:`1px solid ${YB}` }}>🔥 핫이슈</span>
                    )}
                    {v.is_realtime && (
                      <span style={{ fontSize:'8px', fontWeight:800, padding:'1px 6px', borderRadius:'999px', background:RS, color:R, border:`1px solid ${RB}` }}>⚡ 실시간</span>
                    )}
                  </div>
                  <span style={{ fontSize:'10px', color:Y, fontWeight:700 }}>👥 {fmt(v.total)}</span>
                </div>

                <div style={{ fontSize:'13px', fontWeight:800, color:'white', marginBottom:'8px', lineHeight:1.35 }}>{v.question}</div>

                <div style={{ display:'flex', gap:'6px', marginBottom:'10px', alignItems:'center' }}>
                  <span style={{ fontSize:'10px', padding:'3px 10px', borderRadius:'999px', background:YS, color:Y, border:`1px solid ${YB}`, fontWeight:700 }}>{v.emoji_a} {v.option_a}</span>
                  <span style={{ fontSize:'9px', color:'white', opacity:0.2 }}>vs</span>
                  <span style={{ fontSize:'10px', padding:'3px 10px', borderRadius:'999px', background:RS, color:R, border:`1px solid ${RB}`, fontWeight:700 }}>{v.emoji_b} {v.option_b}</span>
                </div>

                <div style={{ display:'flex', gap:'8px' }}>
                  <div onClick={() => toggleFeatured(v.id, v.is_featured)} style={{
                    flex:1, padding:'8px', borderRadius:'8px', textAlign:'center', cursor:'pointer', fontSize:'12px', fontWeight:800,
                    background: v.is_featured ? YS : 'rgba(255,255,255,0.06)',
                    color: v.is_featured ? Y : 'white',
                    border:`1px solid ${v.is_featured ? YB : 'rgba(255,255,255,0.1)'}`,
                    transition:'all 0.15s',
                  }}>
                    {v.is_featured ? '🔥 핫이슈 ON' : '핫이슈 OFF'}
                  </div>
                  <div onClick={() => deleteVote(v.id)} style={{
                    padding:'8px 16px', borderRadius:'8px', textAlign:'center', cursor:'pointer', fontSize:'12px', fontWeight:800,
                    background:RS, color:R, border:`1px solid ${RB}`,
                  }}>삭제</div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
