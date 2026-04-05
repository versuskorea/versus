'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import BottomNav from '@/components/BottomNav'
import TopBar from '@/components/TopBar'

const GRAD = 'linear-gradient(135deg, #0A0A0A 0%, #1a0a2e 50%, #0a1a0a 100%)'
const GRAD_R = 'linear-gradient(135deg, #0A0A0A 0%, #1a1500 100%)'
const Y = '#FFD700'
const YS = 'rgba(255,215,0,0.12)'
const YB = 'rgba(255,215,0,0.3)'
const font = '-apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", sans-serif'

const allQuestions = [
  { id: 'q1',  q: '탕수육 어떻게 먹어?',          a: '부먹',      b: '찍먹',       ea: '🥘', eb: '🥣' },
  { id: 'q2',  q: '먼저 고백 vs 기다리기?',        a: '먼저 고백', b: '기다리기',   ea: '💌', eb: '🤐' },
  { id: 'q3',  q: '평생 하나만 먹을 수 있다면?',   a: '짜장면',    b: '짬뽕',       ea: '🍜', eb: '🍲' },
  { id: 'q4',  q: '재택근무 vs 출근, 평생?',       a: '재택',      b: '출근',       ea: '🏠', eb: '🏢' },
  { id: 'q5',  q: '아이폰 vs 갤럭시?',             a: '아이폰',    b: '갤럭시',     ea: '🍎', eb: '🤖' },
  { id: 'q6',  q: '아침형 vs 야행성?',             a: '아침형',    b: '야행성',     ea: '🌅', eb: '🌙' },
  { id: 'q7',  q: '결혼 vs 비혼?',                 a: '결혼',      b: '비혼',       ea: '💍', eb: '🙅' },
  { id: 'q8',  q: '대기업 vs 스타트업?',           a: '대기업',    b: '스타트업',   ea: '🏢', eb: '🚀' },
  { id: 'q9',  q: '계획형 vs 즉흥형?',             a: '계획형',    b: '즉흥형',     ea: '📋', eb: '🎲' },
  { id: 'q10', q: '집순이/집돌이 vs 밖에 나가기?', a: '집에서',    b: '나가서',     ea: '🛋️', eb: '🚪' },
  { id: 'q11', q: '국내 vs 해외?',                 a: '국내',      b: '해외',       ea: '🇰🇷', eb: '✈️' },
  { id: 'q12', q: '맵찔이 vs 매운 거 좋아?',       a: '맵찔이',    b: '매운 거',    ea: '😅', eb: '🔥' },
  { id: 'q13', q: '연락 자주 vs 각자 생활?',       a: '자주',      b: '각자',       ea: '📱', eb: '🤙' },
  { id: 'q14', q: '저축형 vs 소비형?',             a: '저축',      b: '소비',       ea: '💰', eb: '🛍️' },
  { id: 'q15', q: '칼퇴 vs 야근도 OK?',            a: '칼퇴',      b: '야근',       ea: '🏃', eb: '💼' },
  { id: 'q16', q: '스타벅스 vs 메가커피?',         a: '스타벅스',  b: '메가커피',   ea: '☕', eb: '💚' },
  { id: 'q17', q: '맥북 vs 윈도우?',               a: '맥북',      b: '윈도우',     ea: '💻', eb: '🖥️' },
  { id: 'q18', q: '호텔 vs 에어비앤비?',           a: '호텔',      b: '에어비앤비', ea: '🏨', eb: '🏡' },
  { id: 'q19', q: '강아지 vs 고양이?',             a: '강아지',    b: '고양이',     ea: '🐶', eb: '🐱' },
  { id: 'q20', q: '서울 vs 지방?',                 a: '서울',      b: '지방',       ea: '🏙️', eb: '🌄' },
]

const configs = [
  { count: 5 as const,  icon: '⚡', tag: '빠른 테스트',  time: '약 1분', accuracy: 40, soulmate: 12847, matchPreview: '~12,847명', chips: ['부먹 vs 찍먹', '아이폰 vs 갤럭시', '+3개'] },
  { count: 10 as const, icon: '🎯', tag: '기본 테스트',  time: '약 2분', accuracy: 70, soulmate: 3241,  matchPreview: '~3,241명',  chips: ['결혼 vs 비혼', '재택 vs 출근', '+8개'] },
  { count: 20 as const, icon: '💎', tag: '정밀 테스트',  time: '약 4분', accuracy: 95, soulmate: 247,   matchPreview: '~247명',    chips: ['서울 vs 지방', '강아지 vs 고양이', '+18개'] },
]

type Step = 'intro' | 'quiz' | 'result'
type CountType = 5 | 10 | 20

export default function Soul() {
  const [step, setStep] = useState<Step>('intro')
  const [count, setCount] = useState<CountType>(10)
  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState<Record<string, 'a' | 'b'>>({})
  const [selected, setSelected] = useState<'a' | 'b' | null>(null)
  const [copied, setCopied] = useState(false)

  const questions = allQuestions.slice(0, count)
  const currentQ = questions[current]
  const nextQ = questions[current + 1]
  const cfg = configs.find(c => c.count === count)!

  function handleSelect(side: 'a' | 'b') {
    if (selected) return
    setSelected(side)
    setTimeout(() => {
      setAnswers(p => ({ ...p, [currentQ.id]: side }))
      setSelected(null)
      if (current + 1 >= count) setStep('result')
      else setCurrent(i => i + 1)
    }, 400)
  }

  function handleStart(n: CountType) {
    setCount(n); setAnswers({}); setCurrent(0); setSelected(null); setStep('quiz')
  }

  function handleRetry(n?: CountType) {
    setAnswers({}); setCurrent(0); setSelected(null)
    if (n) { setCount(n); setStep('quiz') } else setStep('intro')
  }

  function handleCopyLink() {
    navigator.clipboard.writeText(`${window.location.origin}/soul`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ── INTRO ──
  if (step === 'intro') return (
    <div style={{ maxWidth: '390px', margin: '0 auto', minHeight: '100vh', background: GRAD, fontFamily: font }}>
      <TopBar />

      <div style={{ padding: '20px 16px 10px' }}>
        {/* 헤더 */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: YS, border: `1px solid ${YB}`, borderRadius: '999px', padding: '4px 10px', marginBottom: '16px' }}>
          <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: Y }} />
          <span style={{ fontSize: '9px', fontWeight: 800, color: Y }}>SOUL MATCH</span>
        </div>
        <div style={{ fontSize: '22px', fontWeight: 900, color: 'white', letterSpacing: '-0.03em', marginBottom: '6px', lineHeight: 1.3 }}>
          나랑 똑같은<br />사람 몇 명?
        </div>
        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginBottom: '24px' }}>문항이 많을수록 더 정확해요</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingBottom: '100px' }}>
          {configs.map((c, idx) => (
            <div key={c.count} onClick={() => handleStart(c.count)} style={{
              borderRadius: '16px', padding: '16px',
              border: `2px solid ${idx === 0 ? Y : 'rgba(255,255,255,0.15)'}`,
              background: idx === 0 ? YS : 'rgba(255,255,255,0.03)',
              cursor: 'pointer',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '18px' }}>{c.icon}</span>
                <span style={{ fontSize: '9px', color: idx === 0 ? Y : 'rgba(255,255,255,0.4)', fontWeight: 700 }}>{c.time}</span>
              </div>
              <div style={{ fontSize: '15px', fontWeight: 900, color: 'white', marginBottom: '3px' }}>{c.count}문항</div>
              <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginBottom: '10px' }}>
                {c.tag} · 예상 매칭 {c.matchPreview}
              </div>
              <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginBottom: '10px' }}>
                {c.chips.map(chip => (
                  <span key={chip} style={{ fontSize: '8px', fontWeight: 700, padding: '3px 8px', borderRadius: '999px', background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' }}>{chip}</span>
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ flex: 1, marginRight: '12px' }}>
                  <div style={{ height: '3px', background: 'rgba(255,255,255,0.1)', borderRadius: '999px', overflow: 'hidden' }}>
                    <div style={{ width: `${c.accuracy}%`, height: '100%', background: idx === 0 ? Y : 'rgba(255,255,255,0.5)', borderRadius: '999px' }} />
                  </div>
                </div>
                <div style={{ fontSize: '10px', fontWeight: 900, padding: '7px 16px', borderRadius: '999px', background: idx === 0 ? Y : 'rgba(255,255,255,0.1)', color: idx === 0 ? '#0A0A0A' : 'rgba(255,255,255,0.7)', flexShrink: 0 }}>시작하기 →</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <BottomNav />
    </div>
  )

  // ── QUIZ ──
  if (step === 'quiz') return (
    <div style={{ maxWidth: '390px', margin: '0 auto', minHeight: '100vh', background: GRAD, fontFamily: font }}>
      <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backdropFilter: 'blur(10px)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div onClick={() => handleRetry()} style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: 'white', cursor: 'pointer' }}>←</div>
        <span style={{ fontSize: '11px', fontWeight: 800, color: 'white' }}>소울메이트 · {count}문항</span>
        <span onClick={() => handleRetry()} style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}>닫기</span>
      </div>

      {/* 진행바 */}
      <div style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.04)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
          <span style={{ fontSize: '10px', fontWeight: 800, color: 'white' }}>{current + 1} <span style={{ color: 'rgba(255,255,255,0.3)' }}>/ {count}</span></span>
          <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)' }}>{cfg.icon} {cfg.tag}</span>
        </div>
        <div style={{ height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '999px', overflow: 'hidden' }}>
          <div style={{ width: `${((current + 1) / count) * 100}%`, height: '100%', background: Y, borderRadius: '999px', transition: 'width 0.3s' }} />
        </div>
      </div>

      <div style={{ padding: '20px 16px' }}>
        <div style={{ fontSize: '10px', fontWeight: 800, color: 'rgba(255,255,255,0.3)', marginBottom: '6px' }}>Q{current + 1}.</div>
        <div style={{ fontSize: '20px', fontWeight: 900, color: 'white', lineHeight: 1.4, marginBottom: '20px', letterSpacing: '-0.025em' }}>{currentQ.q}</div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
          {([
            { side: 'a' as const, name: currentQ.a, emoji: currentQ.ea },
            { side: 'b' as const, name: currentQ.b, emoji: currentQ.eb },
          ]).map(opt => (
            <div key={opt.side} onClick={() => handleSelect(opt.side)} style={{
              borderRadius: '14px', padding: '20px 10px', textAlign: 'center',
              cursor: selected ? 'default' : 'pointer',
              border: `2px solid ${selected === opt.side ? Y : 'rgba(255,255,255,0.12)'}`,
              background: selected === opt.side ? YS : 'rgba(255,255,255,0.05)',
              opacity: selected && selected !== opt.side ? 0.35 : 1,
              boxShadow: selected === opt.side ? `0 0 20px rgba(255,215,0,0.2)` : 'none',
              transition: 'all 0.15s',
            }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>{opt.emoji}</div>
              <div style={{ fontSize: '13px', fontWeight: 800, color: 'white' }}>{opt.name}</div>
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'center' }}>
          <span onClick={() => handleSelect(Math.random() > 0.5 ? 'a' : 'b')} style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)', cursor: 'pointer' }}>건너뛰기 →</span>
        </div>
      </div>

      {nextQ && (
        <div style={{ padding: '0 16px' }}>
          <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '12px', padding: '12px', border: '1px solid rgba(255,255,255,0.08)', opacity: 0.6 }}>
            <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)', marginBottom: '4px' }}>다음 질문</div>
            <div style={{ fontSize: '13px', fontWeight: 800, color: 'white' }}>{nextQ.q}</div>
          </div>
        </div>
      )}
      <BottomNav />
    </div>
  )

  // ── RESULT ──
  return (
    <div style={{ maxWidth: '390px', margin: '0 auto', minHeight: '100vh', background: GRAD, fontFamily: font, paddingBottom: '100px' }}>
      <div style={{ background: GRAD_R, padding: '28px 16px 24px', textAlign: 'center', borderTop: `3px solid ${Y}`, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-40px', left: '50%', transform: 'translateX(-50%)', width: '200px', height: '200px', background: `radial-gradient(circle,rgba(255,215,0,0.15),transparent 70%)`, borderRadius: '50%', pointerEvents: 'none' }} />
        <div style={{ fontSize: '48px', marginBottom: '8px' }}>🎯</div>
        <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>{count}문항 {cfg.tag}</div>
        <div style={{ fontSize: '16px', fontWeight: 800, color: 'white', marginBottom: '20px' }}>소울메이트 발견!</div>

        <div style={{ fontSize: '48px', fontWeight: 900, color: Y, letterSpacing: '-0.04em', marginBottom: '4px' }}>{cfg.soulmate.toLocaleString()}명</div>
        <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginBottom: '16px' }}>전국에서 나랑 거의 똑같은 사람</div>

        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '20px' }}>
          {questions.slice(0, 4).map(q => {
            const ans = answers[q.id]
            return (
              <span key={q.id} style={{ fontSize: '9px', fontWeight: 700, padding: '4px 10px', borderRadius: '999px', background: YS, color: Y, border: `1px solid ${YB}` }}>
                {ans === 'a' ? q.ea : q.eb} {ans === 'a' ? q.a : q.b}
              </span>
            )
          })}
          {count > 4 && <span style={{ fontSize: '9px', fontWeight: 700, padding: '4px 10px', borderRadius: '999px', background: YS, color: Y, border: `1px solid ${YB}` }}>+{count - 4}개</span>}
        </div>

        <div onClick={handleCopyLink} style={{ background: copied ? 'rgba(255,215,0,0.8)' : Y, color: '#0A0A0A', borderRadius: '999px', padding: '14px 24px', fontSize: '13px', fontWeight: 900, cursor: 'pointer', display: 'inline-block', transition: 'all 0.2s' }}>
          {copied ? '✅ 복사됐어요!' : '🔗 공유하고 소울메이트 찾기'}
        </div>
      </div>

      <div style={{ margin: '12px 16px 0', display: 'flex', gap: '8px' }}>
        <div onClick={() => handleRetry(5)} style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '999px', padding: '10px', fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.6)', textAlign: 'center', cursor: 'pointer' }}>⚡ 5문항 다시</div>
        <div onClick={() => handleRetry(20)} style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '999px', padding: '10px', fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.6)', textAlign: 'center', cursor: 'pointer' }}>💎 20문항 다시</div>
      </div>
      <BottomNav />
    </div>
  )
}
