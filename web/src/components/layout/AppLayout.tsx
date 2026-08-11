import { useEffect, useRef, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Navbar } from './Navbar'
import { MobileNav } from './MobileNav'
import { DamPopup } from './DamPopup'
import { RightSidebar } from './RightSidebar'
import { publicUrl } from '../../utils/publicUrl'

export function AppLayout() {
  const [cascadeOpen, setCascadeOpen] = useState(false)
  const [damPopupOpen, setDamPopupOpen] = useState(false)
  const cascadeNavRef = useRef<HTMLDivElement | null>(null)
  const menuButtonRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    function handleResize() {
      if (window.innerWidth > 768) setCascadeOpen(false)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    if (!cascadeOpen) return

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node
      const clickedSidebar = cascadeNavRef.current?.contains(target)
      const clickedMenuButton = menuButtonRef.current?.contains(target)

      if (!clickedSidebar && !clickedMenuButton) {
        setCascadeOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [cascadeOpen])

  return (
    <div className="app-shell">
      <Navbar
        menuButtonRef={menuButtonRef}
        onMenuToggle={() => setCascadeOpen((open) => !open)}
        onOpenDams={() => setDamPopupOpen(true)}
      />
      <MobileNav
        navRef={cascadeNavRef}
        open={cascadeOpen}
        onClose={() => setCascadeOpen(false)}
      />
      <DamPopup open={damPopupOpen} onClose={() => setDamPopupOpen(false)} />

      <div className="page-body">
        <main className="main-content">
          <Outlet />
        </main>
        <RightSidebar />
      </div>

      <footer className="app-footer">
        <img src={publicUrl('uegcl-logo.png')} alt="UEGCL Logo" />
        <p>© {new Date().getFullYear()} Hydro-M. All Rights Reserved.</p>
      </footer>
    </div>
  )
}
