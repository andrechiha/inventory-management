import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useCartStore } from '@/store/cartStore';
import type { Role } from '@/types';
import './MainLayout.css';

interface NavItem {
  to: string;
  label: string;
  roles: Role[];
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard',        label: 'Dashboard',            roles: ['owner', 'staff'],   icon: '◉' },
  { to: '/inventory/manage', label: 'Inventory',            roles: ['owner'],             icon: '☰' },
  { to: '/inventory',        label: 'Inventory',            roles: ['staff'],             icon: '☰' },
  { to: '/orders',           label: 'Orders',               roles: ['owner', 'staff'],   icon: '⬡' },
  { to: '/transactions',     label: 'Transactions',         roles: ['owner'],             icon: '⟐' },
  { to: '/recommended',      label: 'Recommended',          roles: ['owner', 'client'],  icon: '✦' },
  { to: '/shop',             label: 'Shop',                 roles: ['client'],            icon: '◈' },
  { to: '/cart',             label: 'Cart',                 roles: ['client'],            icon: '⬡' },
  { to: '/my-orders',        label: 'My Orders',            roles: ['client'],            icon: '◎' },
];

const ROLE_COLORS: Record<string, string> = {
  owner: '#f59e0b',
  staff: '#818cf8',
  client: '#34d399',
};

export default function MainLayout() {
  const { profile, role, profileError, signOut } = useAuthStore();
  const cartCount = useCartStore((s) => s.totalCount());
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const displayName = (profile?.full_name && profile.full_name.trim()) ? profile.full_name : profile?.email || 'User';
  const visibleNav = NAV_ITEMS.filter((item) => role && role !== 'unknown' && item.roles.includes(role));
  const roleBadgeColor = role ? ROLE_COLORS[role] ?? '#64748b' : '#64748b';
  const initials = displayName.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="layout">
      <aside className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''}`}>
        <div className="sidebar-top">
          <div className="sidebar-brand">
            <div className="brand-icon">
              <svg width="22" height="22" viewBox="0 0 28 28" fill="none">
                <rect width="28" height="28" rx="8" fill="url(#sb-grad)" />
                <path d="M8 14.5L12 18.5L20 10.5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                <defs><linearGradient id="sb-grad" x1="0" y1="0" x2="28" y2="28"><stop stopColor="#6366f1" /><stop offset="1" stopColor="#8b5cf6" /></linearGradient></defs>
              </svg>
            </div>
            {!collapsed && <span className="brand-text">Inventory</span>}
          </div>
          <button className="sidebar-toggle" onClick={() => setCollapsed((c) => !c)} aria-label="Toggle sidebar">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              {collapsed
                ? <><line x1="3" y1="4" x2="13" y2="4" /><line x1="3" y1="8" x2="13" y2="8" /><line x1="3" y1="12" x2="13" y2="12" /></>
                : <><line x1="3" y1="4" x2="13" y2="4" /><line x1="3" y1="8" x2="10" y2="8" /><line x1="3" y1="12" x2="13" y2="12" /></>
              }
            </svg>
          </button>
        </div>

        <nav className="sidebar-nav">
          {visibleNav.map((item) => (
            <NavLink key={item.to} to={item.to} className="nav-link" title={collapsed ? item.label : undefined}>
              <span className="nav-icon">{item.icon}</span>
              {!collapsed && <span className="nav-label">{item.label}</span>}
              {!collapsed && item.to === '/cart' && cartCount > 0 && (
                <span className="nav-badge">{cartCount}</span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar" style={{ background: roleBadgeColor }}>{initials}</div>
            {!collapsed && (
              <div className="user-details">
                <span className="user-name">{displayName}</span>
                <span className="user-role" style={{ color: roleBadgeColor }}>{role}</span>
              </div>
            )}
          </div>
          <button className="btn-logout" onClick={handleLogout} title="Log out">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </aside>

      <main className="main-content">
        {profileError && (
          <div className="profile-error-banner">
            Failed to load your profile: {profileError}
          </div>
        )}
        <div className="main-inner">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
