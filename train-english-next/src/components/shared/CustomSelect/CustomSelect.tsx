'use client'

import React, { useRef, useState, useEffect, useId } from 'react'
import { ChevronDownIcon } from '@heroicons/react/24/outline'
import './CustomSelect.css'

export interface SelectOption {
  value: string
  label: string
}

interface CustomSelectProps {
  options: SelectOption[]
  value: string
  onChange: (value: string) => void
  className?: string
  /** Thêm class vào trigger button */
  triggerClassName?: string
}

export default function CustomSelect({
  options,
  value,
  onChange,
  className = '',
  triggerClassName = '',
}: CustomSelectProps) {
  const [open, setOpen] = useState(false)
  const [highlightIdx, setHighlightIdx] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const id = useId()

  const selectedLabel = options.find(o => o.value === value)?.label ?? options[0]?.label ?? ''
  const currentIdx = options.findIndex(o => o.value === value)

  // Đóng khi click bên ngoài
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setHighlightIdx(-1)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Scroll đến item đang highlight
  useEffect(() => {
    if (open && highlightIdx >= 0 && listRef.current) {
      const item = listRef.current.children[highlightIdx] as HTMLLIElement
      item?.scrollIntoView({ block: 'nearest' })
    }
  }, [highlightIdx, open])

  // Reset highlight khi mở
  useEffect(() => {
    if (open) setHighlightIdx(currentIdx)
  }, [open, currentIdx])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault()
        setOpen(true)
      }
      return
    }
    if (e.key === 'Escape') {
      setOpen(false)
      setHighlightIdx(-1)
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightIdx(i => Math.min(i + 1, options.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightIdx(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      if (highlightIdx >= 0) {
        onChange(options[highlightIdx].value)
        setOpen(false)
        setHighlightIdx(-1)
      }
    }
  }

  return (
    <div
      ref={containerRef}
      className={`cs-root ${className}`}
      onKeyDown={handleKeyDown}
    >
      {/* Trigger */}
      <button
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`cs-list-${id}`}
        className={`cs-trigger ${open ? 'cs-trigger--open' : ''} ${triggerClassName}`}
        onClick={() => setOpen(o => !o)}
      >
        <span className="cs-trigger-label">{selectedLabel}</span>
        <ChevronDownIcon className={`cs-chevron ${open ? 'cs-chevron--open' : ''}`} />
      </button>

      {/* Dropdown */}
      {open && (
        <ul
          ref={listRef}
          id={`cs-list-${id}`}
          role="listbox"
          className="cs-dropdown"
          aria-activedescendant={highlightIdx >= 0 ? `cs-opt-${id}-${highlightIdx}` : undefined}
        >
          {options.map((opt, idx) => {
            const isSelected = opt.value === value
            const isHighlighted = idx === highlightIdx
            return (
              <li
                key={opt.value}
                id={`cs-opt-${id}-${idx}`}
                role="option"
                aria-selected={isSelected}
                className={`cs-option ${isSelected ? 'cs-option--selected' : ''} ${isHighlighted ? 'cs-option--highlighted' : ''}`}
                onMouseEnter={() => setHighlightIdx(idx)}
                onMouseDown={e => {
                  e.preventDefault()
                  onChange(opt.value)
                  setOpen(false)
                  setHighlightIdx(-1)
                }}
              >
                {opt.label}
                {isSelected && (
                  <svg className="cs-check" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                  </svg>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
