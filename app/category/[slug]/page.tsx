'use client'
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import BottomNav from '@/components/BottomNav'
import { supabase } from '@/lib/supabase'

type Vote = {
  id: string
  question: string
  option_a: string
  option_b: string
  emoji_a: string
  emoji_b: string
  category: string
  created_at: string
  total: number
  pa: number
}

function fmt(n: number) {
  return n >= 10000 ? (n / 10000).toFixed(1) + '만' : n >= 1000 ? (n / 1000).toFixed(1) + 'k' : '' + n
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const min = Math.floor(diff / 60000)
  const hour = Math.floor(diff / 3600000)
  const day = Math.floor(diff / 86400000)
  if (min < 1) return '방금'
  if (min < 60) return `${min}분 전`
  if (hour < 24) return `${hour}시간 전`
  if (day < 7) return `${day}일 전`
  return new Date(dateStr).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })
}

export default function CategoryPage() {
  const router = useRouter()
  const params = useParams()
  const category = decodeURIComponent(params.slug as string)
  const emoji = category.split(' ')[0]
  const name = category.split(' ').slice(1).join(' ')

  const [votes, setVotes] = useState<Vote[]>([])
  const [loading, setLoading] = useState(true)
  const [sort, setSort] = useState<'latest' | 'popular'>('latest')

  useEffect(() => { fetchVotes() }, [category, sort])

  async function fetchVotes() {
    setLoading(true)
    const { data } = await supabase
      .from('votes')
      .select('*, vote_results(choice)')
      .eq('category', category)
      .eq('is_realtime', false)
      .order('created_at', { ascending: false })
      .limit(30)

    if (data) {
      const processed = data.map((v: any) => {
        const results = v.vote_results || []
        const count_a = results.filter((r: any) => r.choice === 'a').length
        const count_b = results.filter((r: any) => r.choice === 'b').length
        const total = count_a + count_b
        return { ...v, total, pa: total > 0 ? Math.round((count_a / total) * 100) : 50 }
      })
      if (sort === 'popular') {
        processed.sort((a: Vote, b: Vote) => b.total - a.total)
      }
      setVotes(processed)
    }
    setLoading(false)
  }

  return (
    <div style={{ maxWidth: '390px', margin: '0 auto', minHeight: '100vh', background: '#F5F5F5', fontFamily: '-apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", sans-serif' }}>

      {/* 탑바 */}
      <div style={{ background: 'white', padding: '8px 16px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '0.5px solid #F0F0F0', position: 'sticky', top: 0, zIndex: 50 }}>
        <div onClick={() => router.back()} style={{ width: '34px', height: '34px', borderRadius: '50%', background: '#F5F5F5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', cursor: 'pointer' }}>←</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '18px' }}>{emoji}</span>
          <span style={{ fontSize: '15px', fontWeight: 900, color: '#0A0A0A' }}>{name}</span>
        </div>
        <div style={{ width: '34px' }} />
      </div>

      {/* 정렬 탭 */}
      <div style={{ background: 'white', borderBottom: '0.5px solid #F0F0F0', display: 'flex' }}>
        {[['latest', '최신순'], ['popular', '인기순']].map(([val, label]) => (
          <div key={val} onClick={() => setSort(val as 'latest' | 'popular')} style={{
            flex: 1, padding: '10px 0', textAlign: 'center', fontSize: '13px',
            fontWeight: sort === val ? 900 : 600,
            color: sort === val ? '#0A0A0A' : '#C0C0C0',
            borderBottom: sort === val ? '2.5px solid #0A0A0A' : '2.5px solid transparent',
            cursor: 'pointer',
          }}>{label}</div>
        ))}
      </div>

      {/* 리스트 */}
      <div style={{ background: 'white', marginTop: '8px', paddingBottom: '100px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', fontSize: '13px', color: '#C0C0C0' }}>불러오는 중...</div>
        ) : votes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: '36px', marginBottom: '12px' }}>{emoji}</div>
            <div style={{ fontSize: '14px', fontWeight: 800, color: '#0A0A0A', marginBottom: '6px' }}>아직 투표가 없어요</div>
            <div onClick={() => router.push('/create')} style={{ display: 'inline-block', background: '#0A0A0A', color: 'white', borderRadius: '999px', padding: '10px 24px', fontSize: '13px', fontWeight: 800, cursor: 'pointer', marginTop: '12px' }}>
              첫 투표 만들기 →
            </div>
          </div>
        ) : (
          votes.map(v => (
            <div key={v.id} onClick={() => router.push(`/vote/${v.id}`)} style={{ padding: '14px 16px', borderBottom: '0.5px solid #F8F8F8', cursor: 'pointer' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                <span style={{ fontSize: '10px', fontWeight: 700, color: '#888' }}>{v.category}</span>
                <span style={{ fontSize: '9px', color: '#C0C0C0' }}>{timeAgo(v.created_at)}</span>
              </div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#0A0A0A', marginBottom: '8px' }}>{v.question}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, padding: '4px 12px', borderRadius: '999px', background: '#FFF0F0', color: '#FF3B3B', border: '1.5px solid #FFD0D0' }}>{v.emoji_a} {v.option_a}</span>
                <span style={{ fontSize: '10px', fontWeight: 900, color: '#C0C0C0' }}>vs</span>
                <span style={{ fontSize: '11px', fontWeight: 700, padding: '4px 12px', borderRadius: '999px', background: '#EEF4FF', color: '#1A6FFF', border: '1.5px solid #C8DCFF' }}>{v.emoji_b} {v.option_b}</span>
              </div>
              {v.total > 0 && (
                <div style={{ marginBottom: '6px' }}>
                  <div style={{ height: '3px', background: '#F0F0F0', borderRadius: '999px', overflow: 'hidden', display: 'flex', marginBottom: '3px' }}>
                    <div style={{ width: `${v.pa}%`, background: '#FF3B3B' }} />
                    <div style={{ flex: 1, background: '#1A6FFF' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: '#C0C0C0' }}>
                    <span style={{ color: '#FF3B3B', fontWeight: 700 }}>{v.pa}%</span>
                    <span style={{ color: '#1A6FFF', fontWeight: 700 }}>{100 - v.pa}%</span>
                  </div>
                </div>
              )}
              <span style={{ fontSize: '10px', color: '#C0C0C0' }}>👥 {fmt(v.total)}명</span>
            </div>
          ))
        )}
      </div>

      <BottomNav />
    </div>
  )
}
