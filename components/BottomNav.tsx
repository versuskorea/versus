'use client'
import { useRouter, usePathname } from 'next/navigation'

const Y = '#FFD700'
const GRAD_BG = 'linear-gradient(160deg, #060D06 0%, #0a1a10 40%, #060a0d 100%)'

export default function BottomNav() {
  const router = useRouter()
  const pathname = usePathname()

  const isDark = true

  function handleHomeClick() {
    if (pathname === '/') window.scrollTo({ top: 0, behavior: 'smooth' })
    else router.push('/')
  }

  const tabs = [
    { path: '/', label: '홈', icon: (a: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={a ? Y : 'none'} stroke={a ? Y : isDark ? 'rgba(255,255,255,0.35)' : '#C8C8C8'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" />
        <path d="M9 21V12h6v9" stroke={a ? Y : isDark ? 'rgba(255,255,255,0.35)' : '#C8C8C8'} fill="none" />
      </svg>
    )},
    { path: '/feed', label: '피드', icon: (a: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={a ? Y : isDark ? 'rgba(255,255,255,0.35)' : '#C8C8C8'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="8" height="8" rx="1.5" />
        <rect x="13" y="3" width="8" height="8" rx="1.5" />
        <rect x="3" y="13" width="8" height="8" rx="1.5" />
        <rect x="13" y="13" width="8" height="8" rx="1.5" />
      </svg>
    )},
    { path: '/create', label: '', icon: () => null },
    { path: '/soul', label: '소울픽', icon: (a: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={a ? Y : isDark ? 'rgba(255,255,255,0.35)' : '#C8C8C8'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v4l3 3" />
      </svg>
    )},
    { path: '/my', label: 'MY', icon: (a: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={a ? Y : isDark ? 'rgba(255,255,255,0.35)' : '#C8C8C8'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
      </svg>
    )},
  ]

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
      width: '100%', maxWidth: '390px',
      background: isDark ? 'rgba(6,10,6,0.97)' : 'white',
      borderTop: `0.5px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#F0F0F0'}`,
      display: 'flex', justifyContent: 'space-around', alignItems: 'center',
      padding: '10px 0 24px', zIndex: 100,
      backdropFilter: isDark ? 'blur(12px)' : 'none',
    }}>
      {tabs.map(tab => {
        const active = pathname === tab.path || (tab.path !== '/' && pathname.startsWith(tab.path))

        if (tab.path === '/create') return (
          <div key={tab.path} onClick={() => router.push(tab.path)} style={{
            width: '42px', height: '42px', borderRadius: '50%',
            background: Y,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginTop: '-18px', cursor: 'pointer',
            boxShadow: `0 4px 20px rgba(255,215,0,0.5)`,
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0A0A0A" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </div>
        )

        return (
          <div key={tab.path}
            onClick={tab.path === '/' ? handleHomeClick : () => router.push(tab.path)}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', cursor: 'pointer', minWidth: '48px' }}>
            {tab.icon(active)}
            <span style={{ fontSize: '9px', fontWeight: active ? 800 : 600, color: active ? Y : isDark ? 'rgba(255,255,255,0.3)' : '#C8C8C8' }}>
              {tab.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}
