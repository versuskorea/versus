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
const R = '#FF3B3B'
const RS = 'rgba(255,59,59,0.12)'
const RB = 'rgba(255,59,59,0.3)'
const font = '-apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", sans-serif'

type Vote = {
  id: string; question: string; option_a: string; option_b: string
  emoji_a: string; emoji_b: string; category: string
  created_at: string; total: number; pa: number
  count_a: number; count_b: number
}

function fmt(n: number) {
  return n >= 10000 ? (n/10000).toFixed(1)+'만' : n >= 1000 ? (n/1000).toFixed(1)+'k' : ''+n
}
function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime()
  const min = Math.floor(diff/60000)
  const hour = Math.floor(diff/3600000)
  const day = Math.floor(diff/86400000)
  if (min < 1) return '방금'
  if (min < 60) return `${min}분 전`
  if (hour < 24) return `${hour}시간 전`
  if (day < 7) return `${day}일 전`
  return new Date(d).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })
}

export default function CategoryPage() {
  const router = useRouter()
  const params = useParams()
  const category = decodeURIComponent(params.slug as string)
  const emoji = category.split(' ')[0]
  const name = category.split(' ').slice(1).join(' ')

  const [votes, setVotes] = useState<Vote[]>([])
  const [loading, setLoading] = useState(true)
  const [sort, setSort] = useState<'latest'|'popular'>('latest')
  const [voted, setVoted] = useState<Record<string,'a'|'b'>>({})

  useEffect(() => {
    try {
      const ex = JSON.parse(localStorage.getItem('versus_voted')||'{}')
      setVoted(ex)
    } catch {}
    fetchVotes()
  }, [category, sort])

  async function fetchVotes() {
    setLoading(true)
    const { data } = await supabase
      .from('votes').select('*, vote_results(choice)')
      .eq('category', category).eq('is_realtime', false)
      .order('created_at', { ascending: false }).limit(30)

    if (data) {
      const processed = data.map((v: any) => {
        const r = v.vote_results || []
        const count_a = r.filter((x: any) => x.choice==='a').length
        const count_b = r.filter((x: any) => x.choice==='b').length
        const total = count_a + count_b
        return { ...v, count_a, count_b, total, pa: total>0 ? Math.round((count_a/total)*100) : 50 }
      })
      if (sort==='popular') processed.sort((a: Vote, b: Vote) => b.total - a.total)
      setVotes(processed)
    }
    setLoading(false)
  }

  async function handleVote(voteId: string, side: 'a'|'b', e: React.MouseEvent) {
    e.stopPropagation()
    if (voted[voteId]) return
    setVoted(p => { const n={...p,[voteId]:side}; try{const ex=JSON.parse(localStorage.getItem('versus_voted')||'{}');ex[voteId]=side;localStorage.setItem('versus_voted',JSON.stringify(n))}catch{}; return n })
    await supabase.from('vote_results').insert({ vote_id: voteId, choice: side })
    setVotes(prev => prev.map(v => {
      if (v.id!==voteId) return v
      const nt = v.total+1
      const nca = side==='a' ? v.count_a+1 : v.count_a
      return { ...v, total: nt, count_a: nca, pa: Math.round((nca/nt)*100) }
    }))
  }

  return (
    <div style={{ maxWidth:'390px', margin:'0 auto', minHeight:'100vh', background:BG, fontFamily:font }}>

      {/* 탑바 */}
      <div style={{ background:'rgba(10,10,10,0.96)', padding:'12px 16px', display:'flex', alignItems:'center', gap:'10px', borderBottom:'0.5px solid rgba(255,255,255,0.07)', position:'sticky', top:0, zIndex:50, backdropFilter:'blur(10px)' }}>
        <div onClick={() => router.back()} style={{ width:'36px', height:'36px', borderRadius:'50%', background:CARD, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'16px', color:'white', cursor:'pointer', flexShrink:0 }}>←</div>
        <div style={{ display:'flex', alignItems:'center', gap:'8px', flex:1 }}>
          <div style={{ width:'36px', height:'36px', borderRadius:'50%', background:YS, border:`1px solid ${YB}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'18px' }}>{emoji}</div>
          <span style={{ fontSize:'17px', fontWeight:900, color:'white', letterSpacing:'-0.02em' }}>{name}</span>
        </div>
        <span style={{ fontSize:'12px', color:'rgba(255,255,255,0.3)', fontWeight:700 }}>{votes.length}개</span>
      </div>

      {/* 정렬 탭 */}
      <div style={{ display:'flex', borderBottom:'0.5px solid rgba(255,255,255,0.07)', background:BG }}>
        {[['latest','최신순'],['popular','인기순']].map(([val,label]) => (
          <div key={val} onClick={() => setSort(val as 'latest'|'popular')} style={{
            flex:1, padding:'12px 0', textAlign:'center',
            fontSize:'13px', fontWeight:sort===val?900:600,
            color:sort===val?Y:'rgba(255,255,255,0.35)',
            borderBottom:sort===val?`2.5px solid ${Y}`:'2.5px solid transparent',
            cursor:'pointer', transition:'all 0.2s',
          }}>{label}</div>
        ))}
      </div>

      {/* 리스트 */}
      <div style={{ paddingBottom:'100px' }}>
        {loading ? (
          <div style={{ textAlign:'center', padding:'60px', fontSize:'13px', color:'rgba(255,255,255,0.3)' }}>불러오는 중...</div>
        ) : votes.length===0 ? (
          <div style={{ textAlign:'center', padding:'60px 20px' }}>
            <div style={{ fontSize:'48px', marginBottom:'14px' }}>{emoji}</div>
            <div style={{ fontSize:'16px', fontWeight:800, color:'white', marginBottom:'6px' }}>아직 투표가 없어요</div>
            <div style={{ fontSize:'13px', color:'rgba(255,255,255,0.4)', marginBottom:'20px' }}>첫 번째 투표를 만들어보세요!</div>
            <div onClick={() => router.push('/create')} style={{ display:'inline-block', background:Y, color:'#0A0A0A', borderRadius:'999px', padding:'12px 28px', fontSize:'14px', fontWeight:900, cursor:'pointer' }}>
              투표 만들기 →
            </div>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:'0' }}>
            {votes.map(v => {
              const isVoted = voted[v.id]
              const ca = Math.round(v.pa*v.total/100)
              const cb = v.total - ca

              return (
                <div key={v.id} style={{ margin:'10px 14px 0', borderRadius:'16px', overflow:'hidden', background:CARD, border:'1px solid rgba(255,255,255,0.07)' }}>

                  {/* 카드 상단 */}
                  <div style={{ padding:'14px 16px 12px', borderBottom:'0.5px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'7px' }}>
                      <span style={{ fontSize:'12px', fontWeight:700, color:'rgba(255,255,255,0.4)', letterSpacing:'0.02em' }}>{v.category}</span>
                      <span style={{ fontSize:'11px', color:'rgba(255,255,255,0.25)' }}>{timeAgo(v.created_at)}</span>
                    </div>
                    <div onClick={() => router.push(`/vote/${v.id}`)} style={{ fontSize:'16px', fontWeight:800, color:'white', lineHeight:1.35, letterSpacing:'-0.02em', cursor:'pointer' }}>
                      {v.question}
                    </div>
                  </div>

                  {/* AB 버튼 - 좌우 반반 */}
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr' }}>
                    {([
                      { side:'a' as const, name:v.option_a, emoji:v.emoji_a, pct:v.pa, cnt:ca, color:Y, bg:YS, bd:YB },
                      { side:'b' as const, name:v.option_b, emoji:v.emoji_b, pct:100-v.pa, cnt:cb, color:R, bg:RS, bd:RB },
                    ]).map((opt, idx) => (
                      <div key={opt.side}
                        onClick={e => handleVote(v.id, opt.side, e)}
                        style={{
                          padding:'13px 14px',
                          display:'flex', alignItems:'center', gap:'10px',
                          cursor:isVoted?'default':'pointer',
                          borderRight:idx===0?'0.5px solid rgba(255,255,255,0.06)':'none',
                          background:isVoted===opt.side?opt.bg:'transparent',
                          opacity:isVoted&&isVoted!==opt.side?0.35:1,
                          transition:'all 0.2s', position:'relative', overflow:'hidden',
                        }}>
                        {/* 진행바 배경 */}
                        {isVoted && <div style={{ position:'absolute', left:0, top:0, bottom:0, width:`${opt.pct}%`, background:isVoted===opt.side?(opt.side==='a'?'rgba(255,215,0,0.06)':'rgba(255,59,59,0.06)'):'rgba(255,255,255,0.02)', transition:'width 0.8s' }} />}
                        {/* 이모지 원 */}
                        <div style={{ width:'42px', height:'42px', borderRadius:'50%', background:'rgba(255,255,255,0.07)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'20px', flexShrink:0, border:`1px solid ${isVoted===opt.side?opt.bd:'rgba(255,255,255,0.08)'}`, position:'relative' }}>
                          {opt.emoji}
                        </div>
                        <div style={{ flex:1, minWidth:0, position:'relative' }}>
                          <div style={{ fontSize:'10px', fontWeight:900, color:isVoted===opt.side?opt.color:'rgba(255,255,255,0.3)', letterSpacing:'0.1em', marginBottom:'3px' }}>{opt.side.toUpperCase()}</div>
                          <div style={{ fontSize:'14px', fontWeight:800, color:'white', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{opt.name}</div>
                        </div>
                        {isVoted && (
                          <div style={{ textAlign:'right', flexShrink:0, position:'relative' }}>
                            <div style={{ fontSize:'19px', fontWeight:900, color:opt.color, lineHeight:1 }}>{opt.pct}%</div>
                            <div style={{ fontSize:'10px', color:'rgba(255,255,255,0.3)', marginTop:'2px' }}>{fmt(opt.cnt)}명</div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* 진행바 */}
                  {isVoted && (
                    <div style={{ height:'2px', display:'flex', background:'rgba(255,255,255,0.05)' }}>
                      <div style={{ width:`${v.pa}%`, background:Y, transition:'width 0.8s' }} />
                      <div style={{ flex:1, background:R }} />
                    </div>
                  )}

                  {/* 카드 하단 */}
                  <div style={{ padding:'10px 16px', display:'flex', alignItems:'center', justifyContent:'space-between', borderTop:'0.5px solid rgba(255,255,255,0.05)' }}>
                    <span style={{ fontSize:'12px', color:'rgba(255,255,255,0.35)' }}>👥 {fmt(v.total)}명 참여</span>
                    <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
                      {v.total>100 && <span style={{ fontSize:'10px', fontWeight:800, padding:'2px 8px', borderRadius:'999px', background:YS, color:Y }}>인기</span>}
                      <div onClick={() => router.push(`/vote/${v.id}`)} style={{ fontSize:'12px', color:'rgba(255,255,255,0.3)', cursor:'pointer', display:'flex', alignItems:'center', gap:'3px' }}>
                        댓글 보기 →
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
            <div style={{ height:'10px' }} />
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
