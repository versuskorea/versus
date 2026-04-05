'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import BottomNav from '@/components/BottomNav'
import { supabase } from '@/lib/supabase'

const GRAD = 'linear-gradient(135deg, #0A0A0A 0%, #1a0a2e 50%, #0a1a0a 100%)'
const Y = '#FFD700'
const YS = 'rgba(255,215,0,0.12)'
const YB = 'rgba(255,215,0,0.3)'
const font = '-apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", sans-serif'

type Vote = { id: string; question: string; option_a: string; option_b: string; emoji_a: string; emoji_b: string; category: string; total: number }

function fmt(n: number) { return n >= 10000 ? (n / 10000).toFixed(1) + '만' : n >= 1000 ? (n / 1000).toFixed(1) + 'k' : '' + n }

export default function Search() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Vote[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  useEffect(() => {
    if (!query.trim()) { setResults([]); setSearched(false); return }
    const timer = setTimeout(handleSearch, 400)
    return () => clearTimeout(timer)
  }, [query])

  async function handleSearch() {
    if (!query.trim()) return
    setLoading(true); setSearched(true)
    const { data } = await supabase.from('votes').select('*, vote_results(choice)').or(`question.ilike.%${query}%,option_a.ilike.%${query}%,option_b.ilike.%${query}%`).eq('is_realtime', false).order('created_at', { ascending: false }).limit(20)
    if (data) setResults(data.map((v: any) => {
      const results = v.vote_results || []
      const total = results.length
      return { ...v, total }
    }))
    setLoading(false)
  }

  const popularKeywords = ['아이폰 vs 갤럭시', '짜장면 vs 짬뽕', '재택 vs 출근', '결혼 vs 비혼', '치킨 vs 피자']

  return (
    <div style={{ maxWidth: '390px', margin: '0 auto', minHeight: '100vh', background: GRAD, fontFamily: font }}>
      {/* 검색 탑바 */}
      <div style={{ background: 'rgba(0,0,0,0.3)', padding: '8px 16px 10px', display: 'flex', alignItems: 'center', gap: '10px', backdropFilter: 'blur(10px)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div onClick={() => router.back()} style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', color: 'white', cursor: 'pointer', flexShrink: 0 }}>←</div>
        <input autoFocus value={query} onChange={e => setQuery(e.target.value)}
          placeholder="투표 검색..."
          style={{ flex: 1, background: 'rgba(255,255,255,0.1)', border: `1.5px solid ${query ? YB : 'rgba(255,255,255,0.1)'}`, borderRadius: '999px', padding: '9px 14px', fontSize: '14px', color: 'white', outline: 'none' }}
        />
        {query && <div onClick={() => setQuery('')} style={{ fontSize: '16px', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', flexShrink: 0 }}>✕</div>}
      </div>

      <div style={{ paddingBottom: '100px' }}>
        {loading && <div style={{ textAlign: 'center', padding: '40px', fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>검색 중...</div>}

        {!loading && searched && results.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: '36px', marginBottom: '12px' }}>🔍</div>
            <div style={{ fontSize: '14px', fontWeight: 800, color: 'white', marginBottom: '6px' }}>검색 결과가 없어요</div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>다른 키워드로 검색해보세요</div>
          </div>
        )}

        {!loading && !searched && (
          <div style={{ padding: '24px 16px' }}>
            <div style={{ fontSize: '12px', fontWeight: 800, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.06em', marginBottom: '12px' }}>인기 검색어</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {popularKeywords.map(keyword => (
                <div key={keyword} onClick={() => setQuery(keyword)} style={{ padding: '7px 14px', borderRadius: '999px', background: YS, fontSize: '12px', fontWeight: 700, color: Y, cursor: 'pointer', border: `1px solid ${YB}` }}>
                  {keyword}
                </div>
              ))}
            </div>
          </div>
        )}

        {!loading && results.length > 0 && (
          <>
            <div style={{ padding: '12px 16px 4px', fontSize: '11px', fontWeight: 800, color: 'rgba(255,255,255,0.4)' }}>검색결과 {results.length}개</div>
            {results.map(v => (
              <div key={v.id} onClick={() => router.push(`/vote/${v.id}`)} style={{ padding: '14px 16px', borderBottom: '0.5px solid rgba(255,255,255,0.06)', cursor: 'pointer' }}>
                <div style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.4)', marginBottom: '5px' }}>{v.category}</div>
                <div style={{ fontSize: '14px', fontWeight: 800, color: 'white', marginBottom: '8px' }}>{v.question}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, padding: '4px 12px', borderRadius: '999px', background: YS, color: Y, border: `1px solid ${YB}` }}>{v.emoji_a} {v.option_a}</span>
                  <span style={{ fontSize: '10px', fontWeight: 900, color: 'rgba(255,255,255,0.2)' }}>vs</span>
                  <span style={{ fontSize: '11px', fontWeight: 700, padding: '4px 12px', borderRadius: '999px', background: 'rgba(26,111,255,0.15)', color: '#1A6FFF', border: '1px solid rgba(26,111,255,0.3)' }}>{v.emoji_b} {v.option_b}</span>
                </div>
                <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>👥 {fmt(v.total)}명</span>
              </div>
            ))}
          </>
        )}
      </div>
      <BottomNav />
    </div>
  )
}
