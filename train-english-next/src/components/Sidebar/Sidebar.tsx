"use client";
import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  ChartBarIcon, BookOpenIcon, RectangleStackIcon, AcademicCapIcon,
  TrophyIcon, SunIcon, MoonIcon, ArrowRightStartOnRectangleIcon,
  ChevronLeftIcon, ChevronRightIcon, LightBulbIcon, QuestionMarkCircleIcon, UserGroupIcon, FireIcon
} from '@heroicons/react/24/outline'
import './Sidebar.css'

interface MenuItem {
  icon: React.ReactNode;
  label: string;
  key: string;
  children?: { icon: React.ReactNode; label: string; key: string }[];
}

const menuItems: MenuItem[] = [
  { icon: <span className="sb-icon" style={{ fontSize: '20px', lineHeight: 1 }}>🔥</span>, label: 'Nhật ký', key: 'statistics' },
  { icon: <span className="sb-icon" style={{ fontSize: '20px', lineHeight: 1 }}>📈</span>, label: 'Streak', key: 'streak' },
  { icon: <img src="/mastery-icon.png" alt="mastery" className="sb-icon" style={{ width: 22, height: 22 }} />, label: 'Độ thông thạo', key: 'mastery' },
  { icon: <span className="sb-icon" style={{ fontSize: '20px', lineHeight: 1 }}>🐝</span>, label: 'Cày thông thạo', key: 'practice' },
  { icon: <BookOpenIcon className="sb-icon" />, label: 'Từ vựng', key: 'vocabulary' },
  { icon: <RectangleStackIcon className="sb-icon" />, label: 'Bộ thẻ', key: 'decks' },
  {
    icon: <LightBulbIcon className="sb-icon" />,
    label: 'Luyện tập đơn',
    key: 'single_practice',
    children: [
      { icon: <RectangleStackIcon className="sb-icon" />, label: 'Thẻ ghi nhớ', key: 'flashcards' },
      { icon: <QuestionMarkCircleIcon className="sb-icon" />, label: 'Quiz', key: 'quiz' },
    ]
  },
  { icon: <UserGroupIcon className="sb-icon" />, label: 'Quản lý người dùng', key: 'users' },
]

export interface SidebarProps {
  darkMode: boolean;
  setDarkMode: (v: boolean) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (v: boolean) => void;
  activeMenu: string;
  setActiveMenu: (v: string) => void;
  expandedMenus: string[];
  toggleMenu: (key: string) => void;
  user: any;
  isAdmin: boolean;
  logout: () => void;
}

export default function Sidebar({
  darkMode, setDarkMode,
  sidebarCollapsed, setSidebarCollapsed,
  activeMenu, setActiveMenu,
  expandedMenus, toggleMenu,
  user, isAdmin, logout
}: SidebarProps) {
  const pathname = usePathname();
  const currentKey = pathname.replace('/', '') || 'vocabulary';
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  return (
    <aside className={`sb ${sidebarCollapsed ? 'sb--collapsed' : ''} ${darkMode ? 'sb--dark' : ''}`}>
      {/* Decorative gradient orbs */}
      <div className="sb__orb sb__orb--1" />
      <div className="sb__orb sb__orb--2" />

      {/* ─── Header ─── */}
      <div className="sb__header">
        <div className="sb__logo">
          <div className="sb__logo-icon">
            <AcademicCapIcon className="sb-icon" />
          </div>
          {!sidebarCollapsed && (
            <span className="sb__logo-text">
              Little<span className="sb__logo-accent">By</span>Little
            </span>
          )}
        </div>
      </div>

      {/* ─── Navigation ─── */}
      <nav className="sb__nav">
        <div className="sb__nav-section">
          {!sidebarCollapsed && <span className="sb__section-label">MENU CHÍNH</span>}
          {menuItems.map(item => {
            if (item.key === 'users' && !isAdmin) return null;
            const hasChildren = item.children && item.children.length > 0;
            const isExpanded = expandedMenus.includes(item.key);
            const isChildActive = hasChildren && item.children!.some(child => child.key === currentKey);
            const isActive = !hasChildren && currentKey === item.key;
            const isHovered = hoveredItem === item.key;

            return (
              <div key={item.key} className="sb__nav-group">
                {hasChildren ? (
                  <button
                    className={`sb__nav-item ${isChildActive ? 'sb__nav-item--active' : ''}`}
                    onClick={() => toggleMenu(item.key)}
                    onMouseEnter={() => setHoveredItem(item.key)}
                    onMouseLeave={() => setHoveredItem(null)}
                    title={sidebarCollapsed ? item.label : undefined}
                  >
                    <span className="sb__nav-icon-wrap">
                      {item.icon}
                    </span>
                    {!sidebarCollapsed && (
                      <>
                        <span className="sb__nav-label">{item.label}</span>
                        <ChevronRightIcon className={`sb__nav-arrow ${isExpanded ? 'sb__nav-arrow--open' : ''}`} />
                      </>
                    )}
                    {(isChildActive) && <span className="sb__nav-indicator" />}
                  </button>
                ) : (
                  <Link
                    href={`/${item.key}`}
                    className={`sb__nav-item ${isActive ? 'sb__nav-item--active' : ''}`}
                    onMouseEnter={() => setHoveredItem(item.key)}
                    onMouseLeave={() => setHoveredItem(null)}
                    title={sidebarCollapsed ? item.label : undefined}
                  >
                    <span className="sb__nav-icon-wrap">
                      {item.icon}
                    </span>
                    {!sidebarCollapsed && (
                      <span className="sb__nav-label">{item.label}</span>
                    )}
                    {isActive && <span className="sb__nav-indicator" />}
                  </Link>
                )}

                {/* Sub-menu */}
                {!sidebarCollapsed && hasChildren && (
                  <div className={`sb__submenu ${isExpanded ? 'sb__submenu--open' : ''}`}>
                    {item.children!.map(child => {
                      const childActive = currentKey === child.key;
                      return (
                        <Link
                          key={child.key}
                          href={`/${child.key}`}
                          className={`sb__submenu-item ${childActive ? 'sb__submenu-item--active' : ''}`}
                        >
                          <span className="sb__submenu-dot" />
                          <span>{child.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ─── Theme toggle ─── */}
        <div className="sb__nav-section sb__nav-section--bottom">
          <button
            className="sb__theme-toggle"
            onClick={() => setDarkMode(!darkMode)}
            title={sidebarCollapsed ? (darkMode ? 'Chế độ sáng' : 'Chế độ tối') : undefined}
          >
            <div className={`sb__theme-track ${darkMode ? 'sb__theme-track--dark' : ''}`}>
              <div className="sb__theme-thumb">
                {darkMode ? <SunIcon className="sb-icon sb-icon--sm" /> : <MoonIcon className="sb-icon sb-icon--sm" />}
              </div>
            </div>
            {!sidebarCollapsed && (
              <span className="sb__nav-label">{darkMode ? 'Chế độ sáng' : 'Chế độ tối'}</span>
            )}
          </button>
        </div>
      </nav>

      {/* ─── Footer ─── */}
      <div className="sb__footer">
        <div className="sb__user" title={sidebarCollapsed ? (user?.name || 'User') : undefined}>
          <div className="sb__avatar">
            <img
              src={`https://api.dicebear.com/7.x/notionists/svg?seed=${user?.name || 'User'}&backgroundColor=4ade80`}
              alt="avatar"
            />
            <span className="sb__avatar-status" />
          </div>
          {!sidebarCollapsed && (
            <>
              <div className="sb__user-info">
                <span className="sb__user-name">{user?.name || 'User'}</span>
                <span className="sb__user-role">
                  {user?.role === 'admin' ? '👑 Admin' : '📚 Learner'}
                </span>
              </div>
              <button className="sb__logout-btn" title="Đăng xuất" onClick={logout}>
                <ArrowRightStartOnRectangleIcon className="sb-icon" />
              </button>
            </>
          )}
        </div>

        {/* Collapse toggle */}
        <button
          className="sb__collapse-btn"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          title={sidebarCollapsed ? 'Mở rộng' : 'Thu gọn'}
        >
          {sidebarCollapsed
            ? <ChevronRightIcon className="sb-icon sb-icon--sm" />
            : <ChevronLeftIcon className="sb-icon sb-icon--sm" />
          }
        </button>
      </div>
    </aside>
  )
}
