'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import BottomNav from '@/components/BottomNav'
import { createVote } from '@/lib/supabase'
import { getEmoji } from '@/lib/emojiMap'
import { CATEGORIES } from '@/lib/categories'

const GRAD = 'linear-gradient(135deg, #0A0A0A 0%, #1a0a2e 50%, #0a1a0a 100%)'
const Y = '#FFD700'
const YS = 'rgba(255,215,0,0.12)'
const YB = 'rgba(255,215,0,0.3)'
const font = '-apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", sans-serif'

const ABUSE_LIST = ['시발','시바','씨발','씨바','ㅅㅂ','ㅆㅂ','개새끼','개새','ㄱㅅㄲ','새끼','병신','ㅂㅅ','벙신','지랄','ㅈㄹ','존나','ㅈㄴ','좆','ㅈ같','미친','ㅁㅊ','꺼져','닥쳐','보지','자지','죽어','죽여','자살','fuck','shit','bitch']
function checkAbuse(text: string) { return ABUSE_LIST.some(w => text.toLowerCase().replace(/\s/g,'').includes(w.toLowerCase())) }
function checkSame(a: string, b: string) { return a.trim().toLowerCase() === b.trim().toLowerCase() }
function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

type CheckStatus = 'waiting' | 'checking' | 'pass' | 'fail'
type Check = { id: string; label: string; status: CheckStatus; failReason?: string; suggestion?: string }

export default function Create() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [question, setQuestion] = useState('')
  const [optionA, setOptionA] = useState('')
  const [optionB, setOptionB] = useState('')
  const [category, setCategory] = useState('')
  const [emojiA, setEmojiA] = useState('🔴')
  const [emojiB, setEmojiB] = useState('🔵')
  const [showModeration, setShowModeration] = useState(false)
  const [checks, setChecks] = useState<Check[]>([
    { id: 'abuse', label: '욕설 / 비속어 검사', status: 'waiting' },
    { id: 'options', label: 'A / B 선택지 검사', status: 'waiting' },
  ])
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  const canNext1 = question.trim().length > 0 && optionA.trim().length > 0 && optionB.trim().length > 0
  const canSubmit = category !== ''

  function updateCheck(id: string, status: CheckStatus, extra?: { failReason?: string; suggestion?: string }) {
    setChecks(prev => prev.map(c => c.id === id ? { ...c, status, ...extra } : c))
  }

  async function handleSubmit() {
    setShowModeration(true); setDone(false); setError('')
    setChecks([
      { id: 'abuse', label: '욕설 / 비속어 검사', status: 'waiting' },
      { id: 'options', label: 'A / B 선택지 검사', status: 'waiting' },
    ])
    await sleep(500)
    updateCheck('abuse', 'checking')
    await sleep(900)
    if (checkAbuse(`${question} ${optionA} ${optionB}`)) {
      updateCheck('abuse', 'fail', { failReason: '부적절한 표현이 포함되어 있어요.', suggestion: '욕설이나 비속어를 제거하고 다시 시도해주세요.' })
      return
    }
    updateCheck('abuse', 'pass')
    await sleep(400)
    updateCheck('options', 'checking')
    await sleep(700)
    if (checkSame(optionA, optionB)) {
      updateCheck('options', 'fail', { failReason: 'A와 B 선택지가 동일해요.', suggestion: '서로 다른 선택지를 입력해주세요.' })
      return
    }
    updateCheck('options', 'pass')
    await sleep(400)
    setDone(true)
    await sleep(800)
    try {
      const vote = await createVote({ question, option_a: optionA, option_b: optionB, emoji_a: emojiA, emoji_b: emojiB, category, is_realtime: false })
      try {
        const created = JSON.parse(localStorage.getItem('versus_created') || '[]')
        if (!created.includes(vote.id)) { created.unshift(vote.id); localStorage.setItem('versus_created', JSON.stringify(created)) }
      } catch {}
      router.push(`/vote/${vote.id}`)
    } catch {
      setError('저장 실패. 다시 시도해주세요.')
      setShowModeration(false)
    }
  }

  const failedCheck = checks.find(c => c.status === 'fail')

  return (
    <div style={{ maxWidth: '390px', margin: '0 auto', minHeight: '100vh', background: GRAD, fontFamily: font }}>

      {/* 검수 오버레이 */}
      {showModeration && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: '#1a1a2e', borderRadius: '24px', padding: '28px 24px', width: '100%', maxWidth: '340px', boxShadow: '0 20px 60px rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.08)' }}>
            {/* Claude AI 배지 */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginBottom: '20px' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: done ? Y : failedCheck ? '#FF3B3B' : '#1A6FFF', boxShadow: done ? `0 0 8px ${Y}` : failedCheck ? '0 0 8px #FF3B3B' : '0 0 8px #1A6FFF' }} />
              <span style={{ fontSize: '10px', fontWeight: 900, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.12em' }}>CLAUDE AI 콘텐츠 검수</span>
            </div>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ fontSize: '24px', fontWeight: 900, color: 'white', letterSpacing: '-0.03em', marginBottom: '4px' }}>
                {done ? '검수 통과 ✓' : failedCheck ? '검수 실패' : '검수 중...'}
              </div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
                {done ? '지금 투표를 등록하고 있어요' : failedCheck ? '아래 내용을 확인해주세요' : '잠깐만 기다려주세요'}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
              {checks.map(c => (
                <div key={c.id}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', borderRadius: '12px',
                    background: c.status === 'fail' ? 'rgba(255,59,59,0.1)' : c.status === 'pass' ? YS : c.status === 'checking' ? 'rgba(26,111,255,0.1)' : 'rgba(255,255,255,0.05)',
                    border: `1.5px solid ${c.status === 'fail' ? 'rgba(255,59,59,0.3)' : c.status === 'pass' ? YB : c.status === 'checking' ? 'rgba(26,111,255,0.3)' : 'rgba(255,255,255,0.08)'}`,
                    transition: 'all 0.3s',
                  }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: c.status === 'fail' ? '#FF3B3B' : c.status === 'pass' ? Y : c.status === 'checking' ? '#1A6FFF' : 'rgba(255,255,255,0.1)' }}>
                      {c.status === 'waiting' && <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>–</span>}
                      {c.status === 'checking' && <div style={{ width: '10px', height: '10px', borderRadius: '50%', border: '2px solid white', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />}
                      {c.status === 'pass' && <span style={{ color: '#0A0A0A', fontSize: '13px' }}>✓</span>}
                      {c.status === 'fail' && <span style={{ color: 'white', fontSize: '13px' }}>✕</span>}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: 800, color: c.status === 'fail' ? '#FF3B3B' : c.status === 'pass' ? Y : c.status === 'checking' ? '#1A6FFF' : 'rgba(255,255,255,0.4)' }}>{c.label}</div>
                      {c.status === 'checking' && <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>확인 중...</div>}
                      {c.status === 'pass' && <div style={{ fontSize: '10px', color: Y, marginTop: '2px' }}>통과</div>}
                    </div>
                  </div>
                  {c.status === 'fail' && c.failReason && (
                    <div style={{ padding: '10px 14px', background: 'rgba(255,59,59,0.08)', borderRadius: '0 0 12px 12px', marginTop: '-4px', border: '1.5px solid rgba(255,59,59,0.2)', borderTop: 'none' }}>
                      <div style={{ fontSize: '12px', color: '#FF3B3B', marginBottom: '4px' }}>{c.failReason}</div>
                      {c.suggestion && <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>💡 {c.suggestion}</div>}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {failedCheck && (
              <div onClick={() => setShowModeration(false)} style={{ background: Y, color: '#0A0A0A', borderRadius: '999px', padding: '12px', fontSize: '13px', fontWeight: 800, textAlign: 'center', cursor: 'pointer' }}>수정하러 가기 →</div>
            )}
            {done && (
              <div style={{ background: Y, color: '#0A0A0A', borderRadius: '999px', padding: '12px', fontSize: '13px', fontWeight: 800, textAlign: 'center' }}>등록 완료! 이동 중...</div>
            )}
            {!failedCheck && !done && (
              <div style={{ textAlign: 'center', fontSize: '11px', color: 'rgba(255,255,255,0.2)' }}>잠시만 기다려주세요</div>
            )}
          </div>
        </div>
      )}

      {/* 탑바 */}
      <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backdropFilter: 'blur(10px)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div onClick={() => router.back()} style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', color: 'white', cursor: 'pointer' }}>←</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {[1, 2].map(s => (
            <div key={s} style={{ width: '24px', height: '4px', borderRadius: '999px', background: step >= s ? Y : 'rgba(255,255,255,0.15)', transition: 'all 0.3s' }} />
          ))}
        </div>
        <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', fontWeight: 700 }}>{step} / 2</span>
      </div>

      {/* STEP 1 */}
      {step === 1 && (
        <div style={{ padding: '20px 16px', paddingBottom: '100px' }}>
          <div style={{ fontSize: '10px', fontWeight: 800, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em', marginBottom: '6px' }}>STEP 1</div>
          <div style={{ fontSize: '20px', fontWeight: 900, color: 'white', marginBottom: '24px', letterSpacing: '-0.02em' }}>질문과 선택지를<br />입력해주세요</div>

          {/* 질문 */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '11px', fontWeight: 800, color: 'rgba(255,255,255,0.5)', marginBottom: '8px', letterSpacing: '0.04em' }}>질문</div>
            <textarea value={question} onChange={e => setQuestion(e.target.value)} placeholder="예) 짜장면 vs 짬뽕, 어느 쪽?" maxLength={80}
              style={{ width: '100%', background: 'rgba(255,255,255,0.07)', border: '1.5px solid rgba(255,255,255,0.1)', borderRadius: '14px', padding: '14px 16px', fontSize: '15px', color: 'white', outline: 'none', resize: 'none', height: '90px', fontFamily: 'inherit', lineHeight: 1.5 }}
              onFocus={e => { e.target.style.borderColor = Y }} onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)' }} />
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)', textAlign: 'right', marginTop: '4px' }}>{question.length} / 80</div>
          </div>

          {/* A/B */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 800, color: Y, marginBottom: '8px' }}>A 선택지 <span style={{ fontSize: '14px' }}>{emojiA}</span></div>
              <input value={optionA} onChange={e => { setOptionA(e.target.value); setEmojiA(getEmoji(e.target.value)) }} placeholder="짜장면" maxLength={20}
                style={{ width: '100%', background: YS, border: `1.5px solid ${YB}`, borderRadius: '12px', padding: '12px 14px', fontSize: '14px', color: 'white', outline: 'none', fontFamily: 'inherit' }}
                onFocus={e => { e.target.style.borderColor = Y }} onBlur={e => { e.target.style.borderColor = YB }} />
            </div>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#1A6FFF', marginBottom: '8px' }}>B 선택지 <span style={{ fontSize: '14px' }}>{emojiB}</span></div>
              <input value={optionB} onChange={e => { setOptionB(e.target.value); setEmojiB(getEmoji(e.target.value)) }} placeholder="짬뽕" maxLength={20}
                style={{ width: '100%', background: 'rgba(26,111,255,0.1)', border: '1.5px solid rgba(26,111,255,0.3)', borderRadius: '12px', padding: '12px 14px', fontSize: '14px', color: 'white', outline: 'none', fontFamily: 'inherit' }}
                onFocus={e => { e.target.style.borderColor = '#1A6FFF' }} onBlur={e => { e.target.style.borderColor = 'rgba(26,111,255,0.3)' }} />
            </div>
          </div>

          {/* 미리보기 */}
          {question && optionA && optionB && (
            <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '14px', padding: '14px 16px', marginBottom: '20px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize: '10px', fontWeight: 800, color: 'rgba(255,255,255,0.3)', marginBottom: '8px', letterSpacing: '0.06em' }}>미리보기</div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: 'white', marginBottom: '10px', lineHeight: 1.4 }}>{question}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, padding: '5px 14px', borderRadius: '999px', background: YS, border: `1px solid ${YB}`, color: Y }}>{emojiA} {optionA}</span>
                <span style={{ fontSize: '11px', fontWeight: 900, color: 'rgba(255,255,255,0.3)' }}>vs</span>
                <span style={{ fontSize: '12px', fontWeight: 700, padding: '5px 14px', borderRadius: '999px', background: 'rgba(26,111,255,0.15)', border: '1px solid rgba(26,111,255,0.3)', color: '#1A6FFF' }}>{emojiB} {optionB}</span>
              </div>
            </div>
          )}

          <div onClick={() => canNext1 && setStep(2)} style={{ background: canNext1 ? Y : 'rgba(255,255,255,0.1)', color: canNext1 ? '#0A0A0A' : 'rgba(255,255,255,0.3)', borderRadius: '999px', padding: '14px', fontSize: '14px', fontWeight: 900, textAlign: 'center', cursor: canNext1 ? 'pointer' : 'default', transition: 'all 0.2s' }}>
            다음 →
          </div>
        </div>
      )}

      {/* STEP 2 */}
      {step === 2 && (
        <div style={{ padding: '20px 16px', paddingBottom: '100px' }}>
          <div style={{ fontSize: '10px', fontWeight: 800, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em', marginBottom: '6px' }}>STEP 2</div>
          <div style={{ fontSize: '20px', fontWeight: 900, color: 'white', marginBottom: '24px', letterSpacing: '-0.02em' }}>카테고리를<br />선택해주세요</div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '24px' }}>
            {CATEGORIES.map(cat => (
              <div key={cat} onClick={() => setCategory(cat)} style={{
                padding: '9px 16px', borderRadius: '999px', fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                background: category === cat ? Y : 'rgba(255,255,255,0.06)',
                color: category === cat ? '#0A0A0A' : 'rgba(255,255,255,0.6)',
                border: `1.5px solid ${category === cat ? Y : 'rgba(255,255,255,0.1)'}`,
                transition: 'all 0.15s',
              }}>{cat}</div>
            ))}
          </div>

          {/* 최종 확인 */}
          {category && (
            <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '14px', padding: '14px', marginBottom: '16px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize: '10px', fontWeight: 800, color: 'rgba(255,255,255,0.3)', marginBottom: '8px' }}>최종 확인</div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: 'white', marginBottom: '8px' }}>{question}</div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '999px', background: YS, color: Y, border: `1px solid ${YB}` }}>{emojiA} {optionA}</span>
                <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>vs</span>
                <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '999px', background: 'rgba(26,111,255,0.15)', color: '#1A6FFF', border: '1px solid rgba(26,111,255,0.3)' }}>{emojiB} {optionB}</span>
              </div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>{category}</div>
            </div>
          )}

          {error && (
            <div style={{ background: 'rgba(255,59,59,0.1)', border: '1px solid rgba(255,59,59,0.3)', borderRadius: '12px', padding: '12px 14px', marginBottom: '12px' }}>
              <div style={{ fontSize: '13px', color: '#FF3B3B', fontWeight: 700 }}>⚠️ {error}</div>
            </div>
          )}

          <div onClick={() => canSubmit && handleSubmit()} style={{ background: canSubmit ? Y : 'rgba(255,255,255,0.1)', color: canSubmit ? '#0A0A0A' : 'rgba(255,255,255,0.3)', borderRadius: '999px', padding: '14px', fontSize: '14px', fontWeight: 900, textAlign: 'center', cursor: canSubmit ? 'pointer' : 'default', transition: 'all 0.2s' }}>
            🎉 투표 올리기
          </div>
        </div>
      )}

      <BottomNav />
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
