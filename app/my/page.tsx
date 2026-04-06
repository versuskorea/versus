'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import BottomNav from '@/components/BottomNav'
import TopBar from '@/components/TopBar'
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

type Vote = { id: string; question: string; option_a: string; option_b: string; category: string; created_at: string; total: number; pa: number }

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
  return `${Math.floor(day/7)}주 전`
}

export default function MyPage() {
  const router = useRouter()
  const [activeSection, setActiveSection] = useState<'created'|'voted'|'liked'|'commented'|null>(null)
  const [createdVotes, setCreatedVotes] = useState<Vote[]>([])
  const [votedVotes, setVotedVotes] = useState<Vote[]>([])
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState({ created: 0, voted: 0, commented: 0 })

  useEffect(() => {
    loadStats()
  }, [])

  async function loadStats() {
    try {
      const created = JSON.parse(localStorage.getItem('versus_created') || '[]')
      const voted = JSON.parse(localStorage.getItem('versus_voted') || '{}')
      const commented = parseInt(localStorage.getItem('versus_comment_count') || '0')
      setStats({ created: created.length, voted: Object.keys(voted).length, commented })
    } catch {}
  }

  async function loadSection(section: 'created'|'voted'|'liked'|'commented') {
    if (activeSection === section) { setActiveSection(null); return }
    setActiveSection(section); setLoading(true)
    try {
      if (section === 'created') {
        const ids = JSON.parse(localStorage.getItem('versus_created') || '[]')
        if (ids.length > 0) {
          const { data } = await supabase.from('votes').select('*, vote_results(choice)').in('id', ids.slice(0,20))
          if (data) setCreatedVotes(data.map((v: any) => {
            const r = v.vote_results || []
            const ca = r.filter((x: any) => x.choice==='a').length
            const total = r.length
            return { ...v, total, pa: total>0 ? Math.round((ca/total)*100) : 50 }
          }))
        }
      } else if (section === 'voted') {
        const voted = JSON.parse(localStorage.getItem('versus_voted') || '{}')
        const ids = Object.keys(voted).slice(0, 20)
        if (ids.length > 0) {
          const { data } = await supabase.from('votes').select('*, vote_results(choice)').in('id', ids)
          if (data) setVotedVotes(data.map((v: any) => {
            const r = v.vote_results || []
            const ca = r.filter((x: any) => x.choice==='a').length
            const total = r.length
            return { ...v, total, pa: total>0 ? Math.round((ca/total)*100) : 50 }
          }))
        }
      }
    } catch {}
    setLoading(false)
  }

  const quickItems = [
    { key: 'created' as const, icon: '📝', label: '내가 쓴 투표', count: stats.created, color: Y, bg: YS },
    { key: 'voted' as const, icon: '🗳️', label: '참여한 투표', count: stats.voted, color: Y, bg: YS },
    { key: 'liked' as const, icon: '❤️', label: '좋아요 누른 글', count: 0, color: R, bg: RS },
    { key: 'commented' as const, icon: '💬', label: '내 댓글', count: stats.commented, color: '#7C6FFF', bg: 'rgba(124,111,255,0.12)' },
  ]

  const currentVotes = activeSection === 'created' ? createdVotes : activeSection === 'voted' ? votedVotes : []
  const voted = (() => { try { return JSON.parse(localStorage.getItem('versus_voted')||'{}') } catch { return {} } })()

  return (
    <div style={{ maxWidth:'390px', margin:'0 auto', minHeight:'100vh', background:BG, fontFamily:font }}>
      <TopBar />

      <div style={{ paddingBottom:'100px' }}>
        {/* 프로필 */}
        <div style={{ padding:'16px', display:'flex', alignItems:'center', justifyContent:'space-between', borderBottom:'0.5px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
            <div style={{ width:'46px', height:'46px', borderRadius:'50%', background:`linear-gradient(135deg, ${Y}, #FF8C00)`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'20px', fontWeight:900, color:'#0A0A0A' }}>익</div>
            <div>
              <div style={{ fontSize:'16px', fontWeight:900, color:'white' }}>익명의 투표왕</div>
              <div style={{ fontSize:'11px', color:'white', opacity:0.4, marginTop:'2px' }}>VERSUS 멤버</div>
            </div>
          </div>
          <div style={{ width:'34px', height:'34px', borderRadius:'50%', background:CARD, border:'1px solid rgba(255,255,255,0.08)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
            </svg>
          </div>
        </div>

        {/* PRO 배너 */}
        <div style={{ margin:'12px', background:'linear-gradient(135deg, #1a1400, #2a1f00)', borderRadius:'16px', padding:'14px', border:`1px solid ${YB}`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
            <span style={{ fontSize:'24px' }}>⚡</span>
            <div>
              <div style={{ fontSize:'14px', fontWeight:900, color:'white' }}>VERSUS PRO</div>
              <div style={{ fontSize:'10px', color:'white', opacity:0.45, marginTop:'2px' }}>광고 없이 무제한 이용</div>
            </div>
          </div>
          <div style={{ background:Y, color:'#0A0A0A', borderRadius:'999px', padding:'7px 16px', fontSize:'12px', fontWeight:900, cursor:'pointer' }}>업그레이드</div>
        </div>

        {/* 활동 통계 */}
        <div style={{ padding:'0 12px', marginBottom:'4px' }}>
          <div style={{ fontSize:'10px', fontWeight:800, color:'rgba(255,255,255,0.3)', letterSpacing:'0.08em', marginBottom:'8px', paddingLeft:'4px' }}>내 활동 통계</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'8px' }}>
            {[
              { label:'참여한 투표', value: stats.voted },
              { label:'올린 투표', value: stats.created },
              { label:'단 댓글', value: stats.commented },
            ].map(s => (
              <div key={s.label} style={{ background:CARD, borderRadius:'14px', padding:'14px 10px', border:'1px solid rgba(255,255,255,0.06)', textAlign:'center' }}>
                <div style={{ fontSize:'22px', fontWeight:900, color:Y, marginBottom:'4px' }}>{s.value}</div>
                <div style={{ fontSize:'9px', color:'white', opacity:0.4, fontWeight:600, lineHeight:1.3 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 내 기록 그리드 */}
        <div style={{ padding:'14px 12px 0' }}>
          <div style={{ fontSize:'10px', fontWeight:800, color:'rgba(255,255,255,0.3)', letterSpacing:'0.08em', marginBottom:'8px', paddingLeft:'4px' }}>내 기록</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
            {quickItems.map(item => (
              <div key={item.key} onClick={() => loadSection(item.key)} style={{
                background: activeSection===item.key ? item.bg : CARD,
                borderRadius:'16px', padding:'16px',
                border:`1px solid ${activeSection===item.key ? (item.key==='liked' ? RB : item.key==='commented' ? 'rgba(124,111,255,0.3)' : YB) : 'rgba(255,255,255,0.06)'}`,
                cursor:'pointer', transition:'all 0.2s',
                display:'flex', flexDirection:'column', gap:'10px',
              }}>
                <span style={{ fontSize:'24px' }}>{item.icon}</span>
                <div>
                  <div style={{ fontSize:'13px', fontWeight:800, color:'white', marginBottom:'3px' }}>{item.label}</div>
                  <div style={{ fontSize:'12px', fontWeight:700, color: activeSection===item.key ? item.color : 'rgba(255,255,255,0.35)' }}>
                    {item.count}개
                  </div>
                </div>
                <div style={{ fontSize:'12px', color:'rgba(255,255,255,0.2)', alignSelf:'flex-end' }}>›</div>
              </div>
            ))}
          </div>
        </div>

        {/* 선택된 섹션 리스트 */}
        {activeSection && (activeSection==='created' || activeSection==='voted') && (
          <div style={{ margin:'12px', background:CARD, borderRadius:'16px', border:'1px solid rgba(255,255,255,0.06)', overflow:'hidden' }}>
            {loading ? (
              <div style={{ padding:'30px', textAlign:'center', fontSize:'13px', color:'white', opacity:0.4 }}>불러오는 중...</div>
            ) : currentVotes.length === 0 ? (
              <div style={{ padding:'30px', textAlign:'center', fontSize:'13px', color:'white', opacity:0.4 }}>
                {activeSection==='created' ? '아직 올린 투표가 없어요' : '아직 참여한 투표가 없어요'}
              </div>
            ) : currentVotes.map((v, i) => (
              <div key={v.id} onClick={() => router.push(`/vote/${v.id}`)} style={{ padding:'12px 14px', borderBottom: i < currentVotes.length-1 ? '0.5px solid rgba(255,255,255,0.05)' : 'none', cursor:'pointer' }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'4px' }}>
                  <span style={{ fontSize:'10px', color:'white', opacity:0.4, fontWeight:700 }}>{v.category}</span>
                  <span style={{ fontSize:'9px', color:'white', opacity:0.25 }}>{timeAgo(v.created_at)}</span>
                </div>
                <div style={{ fontSize:'13px', fontWeight:800, color:'white', marginBottom:'6px', lineHeight:1.35 }}>{v.question}</div>
                <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'4px' }}>
                  <span style={{ fontSize:'10px', fontWeight:700, padding:'2px 8px', borderRadius:'999px', background:YS, color:Y, border:`1px solid ${YB}` }}>{v.option_a}</span>
                  <span style={{ fontSize:'9px', color:'white', opacity:0.2 }}>vs</span>
                  <span style={{ fontSize:'10px', fontWeight:700, padding:'2px 8px', borderRadius:'999px', background:RS, color:R, border:`1px solid ${RB}` }}>{v.option_b}</span>
                </div>
                {activeSection==='voted' && voted[v.id] && (
                  <div style={{ fontSize:'9px', color: voted[v.id]==='a' ? Y : R, fontWeight:700 }}>
                    내 선택: {voted[v.id]==='a' ? v.option_a : v.option_b} ({voted[v.id]==='a' ? v.pa : 100-v.pa}%)
                  </div>
                )}
                <div style={{ fontSize:'10px', color:'white', opacity:0.35, marginTop:'4px' }}>👥 {fmt(v.total)}명</div>
              </div>
            ))}
          </div>
        )}

        {activeSection==='liked' && (
          <div style={{ margin:'12px', background:CARD, borderRadius:'16px', border:'1px solid rgba(255,255,255,0.06)', padding:'30px', textAlign:'center' }}>
            <div style={{ fontSize:'13px', color:'white', opacity:0.4 }}>좋아요 기능 준비 중이에요</div>
          </div>
        )}

        {activeSection==='commented' && (
          <div style={{ margin:'12px', background:CARD, borderRadius:'16px', border:'1px solid rgba(255,255,255,0.06)', padding:'30px', textAlign:'center' }}>
            <div style={{ fontSize:'13px', color:'white', opacity:0.4 }}>댓글 목록 기능 준비 중이에요</div>
          </div>
        )}

        {/* 설정 */}
        <div style={{ padding:'14px 12px 0' }}>
          <div style={{ fontSize:'10px', fontWeight:800, color:'rgba(255,255,255,0.3)', letterSpacing:'0.08em', marginBottom:'8px', paddingLeft:'4px' }}>설정</div>
          <div style={{ background:CARD, borderRadius:'16px', border:'1px solid rgba(255,255,255,0.06)', overflow:'hidden' }}>
            {[
              { icon:'🔔', label:'알림 설정', sub:'새 투표, 댓글 알림', color:Y, bg:YS, badge:'0' },
              { icon:'🎯', label:'소울메이트 결과', sub:'내 성향 분석 보기', color:'#7C6FFF', bg:'rgba(124,111,255,0.12)', badge:null },
              { icon:'📊', label:'관심 카테고리', sub:'IT, 음식, 연애', color:'rgba(0,200,100,0.8)', bg:'rgba(0,200,100,0.12)', badge:null },
              { icon:'🚪', label:'로그아웃', sub:'기기 연결 해제', color:R, bg:RS, badge:null },
            ].map((item, i, arr) => (
              <div key={item.label} style={{ padding:'13px 14px', borderBottom: i < arr.length-1 ? '0.5px solid rgba(255,255,255,0.05)' : 'none', display:'flex', alignItems:'center', justifyContent:'space-between', cursor:'pointer' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
                  <div style={{ width:'36px', height:'36px', borderRadius:'10px', background:item.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'18px' }}>{item.icon}</div>
                  <div>
                    <div style={{ fontSize:'13px', fontWeight:700, color:'white' }}>{item.label}</div>
                    <div style={{ fontSize:'10px', color:'white', opacity:0.35, marginTop:'2px' }}>{item.sub}</div>
                  </div>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                  {item.badge !== null && (
                    <div style={{ background:YS, border:`1px solid ${YB}`, borderRadius:'999px', padding:'2px 8px', fontSize:'10px', fontWeight:800, color:Y }}>{item.badge}</div>
                  )}
                  <span style={{ fontSize:'14px', color:'rgba(255,255,255,0.2)' }}>›</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 버전 */}
        <div style={{ textAlign:'center', padding:'20px', fontSize:'11px', color:'rgba(255,255,255,0.15)' }}>
          VERSUS v1.0.0 · 세상의 모든 A vs B
        </div>
      </div>

      <BottomNav />
    </div>
  )
}
