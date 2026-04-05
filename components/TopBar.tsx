'use client'
import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { CATEGORIES } from '@/lib/categories'

const Y = '#FFD700'

export default function TopBar() {
  const router = useRouter()
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <>
      <div style={{ background: '#0A0A0A', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '0.5px solid rgba(255,255,255,0.06)', position: 'sticky', top: 0, zIndex: 100 }}>
        <div onClick={() => { if (pathname === '/') window.location.reload() }} style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
          <span style={{ fontSize: '20px', fontWeight: 900, color: 'white', letterSpacing: '-0.04em' }}>VERSUS</span>
          <span style={{ background: Y, color: '#0A0A0A', fontSize: '7px', padding: '2px 5px', borderRadius: '4px', fontWeight: 900 }}>VS</span>
        </div>
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          <div onClick={() => router.push('/search')} style={{ width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
          <div onClick={() => setMenuOpen(true)} style={{ width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </div>
        </div>
      </div>

      {menuOpen && (
        <>
          <div onClick={() => setMenuOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200 }} />
          <div style={{ position: 'fixed', top: 0, right: 'max(0px, calc(50vw - 195px))', bottom: 0, width: '260px', background: '#111', zIndex: 201, display: 'flex', flexDirection: 'column', boxShadow: '-4px 0 24px rgba(0,0,0,0.5)' }}>
            <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '0.5px solid rgba(255,255,255,0.08)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '16px', fontWeight: 900, color: 'white' }}>VERSUS</span>
                <span style={{ background: Y, color: '#0A0A0A', fontSize: '7px', padding: '1px 4px', borderRadius: '3px', fontWeight: 900 }}>VS</span>
              </div>
              <div onClick={() => setMenuOpen(false)} style={{ fontSize: '20px', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}>✕</div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <div style={{ fontSize: '10px', fontWeight: 800, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em', padding: '14px 16px 6px' }}>카테고리</div>
              <div onClick={() => { router.push('/hot'); setMenuOpen(false) }} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '11px 16px', cursor: 'pointer', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
                <span style={{ fontSize: '18px' }}>🔥</span>
                <span style={{ fontSize: '14px', fontWeight: 700, color: 'white' }}>인기 투표</span>
              </div>
              {CATEGORIES.map(cat => (
                <div key={cat} onClick={() => { router.push(`/category/${encodeURIComponent(cat)}`); setMenuOpen(false) }}
                  style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '11px 16px', cursor: 'pointer', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
                  <span style={{ fontSize: '18px' }}>{cat.split(' ')[0]}</span>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: 'white' }}>{cat.split(' ').slice(1).join(' ')}</span>
                </div>
              ))}
              <div style={{ fontSize: '10px', fontWeight: 800, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em', padding: '14px 16px 6px' }}>메뉴</div>
              {[
                { label: '소울메이트 테스트', path: '/soul', emoji: '🎯' },
                { label: '내 활동', path: '/my', emoji: '👤' },
                { label: '투표 만들기', path: '/create', emoji: '✏️' },
              ].map(item => (
                <div key={item.path} onClick={() => { router.push(item.path); setMenuOpen(false) }}
                  style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '11px 16px', cursor: 'pointer', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
                  <span style={{ fontSize: '18px' }}>{item.emoji}</span>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: 'white' }}>{item.label}</span>
                </div>
              ))}
            </div>
            <div style={{ padding: '14px 16px', borderTop: `2px solid ${Y}`, textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>VERSUS · 세상의 모든 A vs B</div>
            </div>
          </div>
        </>
      )}
    </>
  )
}
