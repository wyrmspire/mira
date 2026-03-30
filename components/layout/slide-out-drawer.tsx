'use client'

import { useState, useEffect } from 'react'
import { ThinkNodeDrawer } from '@/components/drawers/think-node-drawer'

export interface DrawerContent {
  type: 'think_node' | 'generic'
  data: any
}

export function SlideOutDrawer() {
  const [isOpen, setIsOpen] = useState(false)
  const [content, setContent] = useState<DrawerContent | null>(null)

  useEffect(() => {
    const handleOpen = (e: any) => {
      setContent(e.detail)
      setIsOpen(true)
    }

    const handleClose = () => {
      setIsOpen(false)
      setTimeout(() => setContent(null), 300) // Clear after animation
    }

    window.addEventListener('open-drawer' as any, handleOpen)
    window.addEventListener('close-drawer' as any, handleClose)

    return () => {
      window.removeEventListener('open-drawer' as any, handleOpen)
      window.removeEventListener('close-drawer' as any, handleClose)
    }
  }, [])

  if (!content && !isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-50 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setIsOpen(false)}
      />

      {/* Drawer */}
      <div 
        className={`fixed inset-y-0 right-0 w-full max-w-sm bg-[#12121a] border-l border-[#1e1e2e] shadow-2xl z-50 transition-transform duration-300 transform ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="h-full flex flex-col p-6 overflow-y-auto custom-scrollbar">
          {/* Drawer content types will be added here */}
          {content?.type === 'generic' && (
            <div>Generic drawer content not implemented</div>
          )}
        </div>
      </div>
    </>
  )
}

export function openDrawer(content: DrawerContent) {
  const event = new CustomEvent('open-drawer', { detail: content })
  window.dispatchEvent(event)
}

export function closeDrawer() {
  const event = new CustomEvent('close-drawer')
  window.dispatchEvent(event)
}
