'use client';

import { useState } from 'react';
import { Bell, Search, ChevronDown, LogOut, Settings, User } from 'lucide-react';

interface NavbarProps {
  userName: string;
  userRole: 'Manager' | 'SupportWorker' | 'Tenant';
  notificationCount?: number;
  onSearch?: (query: string) => void;
  onLogout?: () => void;
  onSettings?: () => void;
}

export function Navbar({
  userName,
  userRole,
  notificationCount = 0,
  onSearch,
  onLogout,
  onSettings,
}: NavbarProps) {
  const [searchValue, setSearchValue] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);

  const roleColour: Record<string, string> = {
    Manager:       'bg-amber-500 text-white',
    SupportWorker: 'bg-blue-600 text-white',
    Tenant:        'bg-green-600 text-white',
  };

  return (
    <header className="h-14 bg-[#0F1C2E] border-b border-white/10 flex items-center justify-between px-4 gap-4 shrink-0">
      {/* Brand */}
      <div className="flex items-center gap-2 min-w-[160px]">
        <span className="text-white font-bold text-base tracking-tight font-[Sora,sans-serif]">
          Matty&apos;s Place
        </span>
        <span className="text-xs text-white/40 hidden md:block">HMO Management</span>
      </div>

      {/* Search */}
      <div className="flex-1 max-w-md relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 w-4 h-4" />
        <input
          type="text"
          placeholder="Search tenants, sessions, audit…"
          value={searchValue}
          onChange={(e) => {
            setSearchValue(e.target.value);
            onSearch?.(e.target.value);
          }}
          className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-4 py-1.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-amber-500/60 transition-colors"
        />
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-3">
        {/* Notification bell */}
        <button
          type="button"
          aria-label={`Notifications${notificationCount > 0 ? ` (${notificationCount} unread)` : ''}`}
          className="relative p-2 rounded-lg hover:bg-white/10 transition-colors"
        >
          <Bell className="w-4 h-4 text-white/70" />
          {notificationCount > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 bg-amber-500 rounded-full" aria-hidden="true" />
          )}
        </button>

        {/* User menu */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="User menu"
            aria-expanded={menuOpen ? 'true' : 'false'}
            aria-haspopup="menu"
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-amber-500 flex items-center justify-center text-white text-xs font-bold">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-white text-xs font-medium leading-tight">{userName}</p>
              <p className="text-white/40 text-[10px]">{userRole}</p>
            </div>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold hidden lg:block ${roleColour[userRole]}`}>
              {userRole}
            </span>
            <ChevronDown className="w-3 h-3 text-white/40" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 w-48 bg-[#0F1C2E] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
              <button
                type="button"
                aria-label="Settings"
                onClick={() => { setMenuOpen(false); onSettings?.(); }}
                className="w-full flex items-center gap-2 px-4 py-3 text-sm text-white/70 hover:bg-white/5 hover:text-white transition-colors"
              >
                <Settings className="w-4 h-4" aria-hidden="true" /> Settings
              </button>
              <button
                type="button"
                aria-label="Profile"
                onClick={() => { setMenuOpen(false); }}
                className="w-full flex items-center gap-2 px-4 py-3 text-sm text-white/70 hover:bg-white/5 hover:text-white transition-colors"
              >
                <User className="w-4 h-4" aria-hidden="true" /> Profile
              </button>
              <div className="border-t border-white/10" role="separator" />
              <button
                type="button"
                aria-label="Sign out"
                onClick={() => { setMenuOpen(false); onLogout?.(); }}
                className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <LogOut className="w-4 h-4" aria-hidden="true" /> Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
