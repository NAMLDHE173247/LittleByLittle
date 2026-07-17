'use client'

import React, { useState, useRef, useEffect, useId } from 'react'
import { InformationCircleIcon } from '@heroicons/react/24/outline'
import './HelpTooltip.css'

interface HelpTooltipProps {
  content: React.ReactNode
  /** Hướng hiển thị popup, mặc định 'top' */
  placement?: 'top' | 'bottom' | 'left' | 'right'
}

export default function HelpTooltip({ content, placement = 'top' }: HelpTooltipProps) {
  const [visible, setVisible] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popupRef = useRef<HTMLDivElement>(null)
  const id = useId()

  // Đóng khi click bên ngoài (mobile)
  useEffect(() => {
    if (!visible) return
    const handler = (e: MouseEvent) => {
      if (
        triggerRef.current && !triggerRef.current.contains(e.target as Node) &&
        popupRef.current && !popupRef.current.contains(e.target as Node)
      ) {
        setVisible(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [visible])

  return (
    <span className="ht-root" aria-describedby={visible ? id : undefined}>
      <button
        ref={triggerRef}
        type="button"
        className="ht-trigger"
        tabIndex={0}
        aria-label="Xem giải thích"
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onFocus={() => setVisible(true)}
        onBlur={() => setVisible(false)}
        onClick={() => setVisible(v => !v)}
      >
        <InformationCircleIcon className="ht-icon" />
      </button>

      {visible && (
        <div
          ref={popupRef}
          id={id}
          role="tooltip"
          className={`ht-popup ht-popup--${placement}`}
        >
          {content}
          <span className={`ht-arrow ht-arrow--${placement}`} />
        </div>
      )}
    </span>
  )
}
