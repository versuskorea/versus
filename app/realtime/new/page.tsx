'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import BottomNav from '@/components/BottomNav'
import { supabase } from '@/lib/supabase'

const GRAD = 'linear-gradient(135deg, #0A0A0A 0%, #1a0a2e 50%, #0a1a0a 100%)'
const Y = '#FFD700'
const YS = 'rgba(255,215,0,0.12)'
const YB = 'rgba(255,215,0,0.3)'
const font = '-apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", sans-serif'

const ABUSE_LIST = ['시발','시바','씨발','씨바','ㅅㅂ','ㅆㅂ','개새끼','개새','ㄱㅅㄲ','새끼','병신','ㅂㅅ','벙신','지랄','ㅈㄹ','존나','ㅈㄴ','좆','ㅈ같','미친','ㅁㅊ','꺼져','닥쳐','보지','자지','죽어','죽여','자살','fuck','shit','bitch']
function checkAbuse(text: string) { return ABUSE_LIST.some(w => text.toLowerCase().replace(/\s/g,'').includes(w.toLowerCase())) }

export default function RealtimeNew() {
  const router = useRouter()
  const [question, setQuestion] = useState('')
  const [optionA, setOptionA] = useState('')
  const [optionB, setOptionB] = useState('')
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState('')

  const canSubmit = question.trim() && optionA.trim() && optionB.trim()

  async function handleSubmit() {
    if (!canSubmit || loading || checking) return
    setError('')
    setChecking(true)
    await new Promise(r => setTimeout(r, 600))

    if (checkAbuse(`${question} ${optionA} ${optionB}`)) {
      setChecking(false); setError('부적절한 표현이 포함되어 있어요.'); return
    }
    if (optionA.trim().toLowerCase() === optionB.trim().toLowerCase()) {
      setChecking(false); setError('A와 B 선택지가 동일해요.'); return
    }

    setChecking(false); setLoading(true)
    try {
      const { data, error: err } = await supabase.from('votes').insert({
        question: question.trim(), option_a: optionA.trim(), option_b: optionB.trim(),
        emoji_a: '🔴', emoji_b: '🔵', category: '⚡ 실시간', is_realtime: true,
        expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      }).select().single()
      if (err || !data) throw new Error()
      try {
        const created = JSON.parse(localStorage.getItem('versus_created') || '[]')
        if (!created.includes(data.id)) { created.unshift(data.id); localStorage.setItem('versus_created', JSON.stringify(created)) }
      } catch {}
      router.push('/')
    } catch {
      setError('저장 실패. 다시 시도해주세요.'); setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: '390px', margin: '0 auto', minHeight: '100vh', background: GRAD, fontFamily: font }}>
      <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backdropFilter: 'blur(10px)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div onClick={() => router.back()} style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', color: 'white', cursor: 'pointer' }}>←</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: Y }} />
          <span style={{ fontSize: '13px', fontWeight: 800, color: 'white' }}>실시간 결정</span>
        </div>
        <div style={{ width: '34px' }} />
      </div>

      <div style={{ padding: '20px 20px 0' }}>
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: YS, border: `1px solid ${YB}`, borderRadius: '999px', padding: '4px 10px', marginBottom: '12px' }}>
            <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: Y }} />
            <span style={{ fontSize: '9px', fontWeight: 800, color: Y }}>1시간 후 자동 삭제</span>
          </div>
          <div style={{ fontSize: '22px', fontWeight: 900, color: 'white', letterSpacing: '-0.03em', marginBottom: '6px', lineHeight: 1.3 }}>지금 고민 중인 거<br />물어봐요 ⚡</div>
        </div>

        {/* 질문 */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '11px', fontWeight: 800, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.06em', marginBottom: '8px' }}>고민</div>
          <textarea value={question} onChange={e => setQuestion(e.target.value)} placeholder="예) 점심 짜장면 vs 짬뽕 뭐 먹을까요?" maxLength={100}
            style={{ width: '100%', background: 'rgba(255,255,255,0.07)', border: `1.5px solid rgba(255,255,255,0.1)`, borderRadius: '14px', padding: '14px 16px', fontSize: '15px', color: 'white', outline: 'none', resize: 'none', height: '90px', fontFamily: 'inherit', lineHeight: 1.5 }}
            onFocus={e => { e.target.style.borderColor = Y }} onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)' }} />
          <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)', textAlign: 'right', marginTop: '4px' }}>{question.length} / 100</div>
        </div>

        {/* A/B */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '28px' }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 800, color: Y, marginBottom: '8px', letterSpacing: '0.06em' }}>A</div>
            <input value={optionA} onChange={e => setOptionA(e.target.value)} placeholder="짜장면" maxLength={20}
              style={{ width: '100%', background: YS, border: `1.5px solid ${YB}`, borderRadius: '12px', padding: '12px 14px', fontSize: '14px', color: 'white', outline: 'none', fontFamily: 'inherit' }}
              onFocus={e => { e.target.style.borderColor = Y }} onBlur={e => { e.target.style.borderColor = YB }} />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#1A6FFF', marginBottom: '8px', letterSpacing: '0.06em' }}>B</div>
            <input value={optionB} onChange={e => setOptionB(e.target.value)} placeholder="짬뽕" maxLength={20}
              style={{ width: '100%', background: 'rgba(26,111,255,0.1)', border: '1.5px solid rgba(26,111,255,0.3)', borderRadius: '12px', padding: '12px 14px', fontSize: '14px', color: 'white', outline: 'none', fontFamily: 'inherit' }}
              onFocus={e => { e.target.style.borderColor = '#1A6FFF' }} onBlur={e => { e.target.style.borderColor = 'rgba(26,111,255,0.3)' }} />
          </div>
        </div>

        {/* 미리보기 */}
        {question && optionA && optionB && (
          <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '14px', padding: '14px 16px', marginBottom: '24px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ fontSize: '10px', fontWeight: 800, color: 'rgba(255,255,255,0.3)', marginBottom: '8px', letterSpacing: '0.06em' }}>미리보기</div>
            <div style={{ fontSize: '14px', fontWeight: 800, color: 'white', marginBottom: '10px', lineHeight: 1.4 }}>{question}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, padding: '5px 14px', borderRadius: '999px', background: YS, border: `1px solid ${YB}`, color: Y }}>{optionA}</span>
              <span style={{ fontSize: '11px', fontWeight: 900, color: 'rgba(255,255,255,0.3)' }}>vs</span>
              <span style={{ fontSize: '12px', fontWeight: 700, padding: '5px 14px', borderRadius: '999px', background: 'rgba(26,111,255,0.15)', border: '1px solid rgba(26,111,255,0.3)', color: '#1A6FFF' }}>{optionB}</span>
            </div>
          </div>
        )}

        {error && (
          <div style={{ background: 'rgba(255,59,59,0.1)', border: '1px solid rgba(255,59,59,0.3)', borderRadius: '12px', padding: '12px 14px', marginBottom: '16px' }}>
            <div style={{ fontSize: '13px', color: '#FF3B3B', fontWeight: 700 }}>⚠️ {error}</div>
          </div>
        )}

        <div onClick={handleSubmit} style={{
          background: checking ? YS : loading ? 'rgba(255,255,255,0.08)' : canSubmit ? Y : 'rgba(255,255,255,0.08)',
          color: canSubmit ? (checking || loading ? 'rgba(255,255,255,0.6)' : '#0A0A0A') : 'rgba(255,255,255,0.2)',
          borderRadius: '999px', padding: '16px', fontSize: '15px', fontWeight: 900, textAlign: 'center',
          cursor: canSubmit && !loading && !checking ? 'pointer' : 'default',
          border: checking ? `1.5px solid ${Y}` : 'none', transition: 'all 0.25s',
        }}>
          {checking ? '⚡ 확인 중...' : loading ? '올리는 중...' : '⚡ 지금 바로 올리기'}
        </div>

        <div style={{ textAlign: 'center', marginTop: '12px', fontSize: '11px', color: 'rgba(255,255,255,0.2)' }}>
          1시간 후 자동 삭제 · 카테고리 없음
        </div>
      </div>

      <BottomNav />
    </div>
  )
}
