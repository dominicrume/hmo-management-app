'use client';

import { useState } from 'react';
import {
  LayoutDashboard, Users, FileText, BarChart2,
  ClipboardList, Shield, CreditCard, Brain,
  Settings, ChevronLeft, ChevronRight,
} from 'lucide-react';

export type SidebarView =
  | 'dashboard' | 'tenants' | 'sessions' | 'ledger'
  | 'audit' | 'risk' | 'reports' | 'ai' | 'settings';

interface NavItem {
  id: SidebarView;
  label: string;
  icon: React.ReactNode;
  badge?: number;
  managerOnly?: boolean;
}

interface SidebarProps {
  activeView: SidebarView;
  onNavigate: (view: SidebarView) => void;
  userRole: 'Manager' | 'SupportWorker' | 'Tenant';
  tenantCount?: number;
  riskCount?: number;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard',  label: 'Dashboard',      icon: <LayoutDashboard className="w-4 h-4" /> },
  { id: 'tenants',    label: 'Tenants',         icon: <Users           className="w-4 h-4" /> },
  { id: 'sessions',   label: 'Sessions',        icon: <FileText        className="w-4 h-4" /> },
  { id: 'ledger',     label: 'Ledger',          icon: <CreditCard      className="w-4 h-4" />, managerOnly: true },
  { id: 'audit',      label: 'Audit Log',       icon: <ClipboardList   className="w-4 h-4" />, managerOnly: true },
  { id: 'risk',       label: 'Risk Flags',      icon: <Shield          className="w-4 h-4" /> },
  { id: 'reports',    label: 'Reports',         icon: <BarChart2       className="w-4 h-4" />, managerOnly: true },
  { id: 'ai',         label: 'AI Brain',        icon: <Brain           className="w-4 h-4" /> },
  { id: 'settings',   label: 'Settings',        icon: <Settings        className="w-4 h-4" />, managerOnly: true },
];

export function Sidebar({ activeView, onNavigate, userRole, tenantCount, riskCount }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.managerOnly || userRole === 'Manager'
  ).map((item) => ({
    ...item,
    badge:
      item.id === 'tenants' ? tenantCount :
      item.id === 'risk'    ? riskCount   :
      undefined,
  }));

  return (
    <aside
      className={`
        flex flex-col bg-[#0F1C2E] border-r border-white/10 transition-all duration-200 shrink-0
        ${collapsed ? 'w-14' : 'w-56'}
      `}
    >
      {/* Nav items */}
      <nav className="flex-1 py-4 overflow-y-auto">
        {visibleItems.map((item) => {
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              title={collapsed ? item.label : undefined}
              className={`
                w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors relative
                ${isActive
                  ? 'bg-amber-500/15 text-amber-400 border-r-2 border-amber-500'
                  : 'text-white/50 hover:text-white hover:bg-white/5'
                }
              `}
            >
              <span className="shrink-0">{item.icon}</span>
              {!collapsed && (
                <>
                  <span className="flex-1 text-left truncate font-[Sora,sans-serif]">{item.label}</span>
                  {(item.badge ?? 0) > 0 && (
                    <span className={`
                      text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center
                      ${item.id === 'risk' ? 'bg-red-500/20 text-red-400' : 'bg-white/10 text-white/60'}
                    `}>
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </button>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <div className="border-t border-white/10 p-2">
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="w-full flex items-center justify-center py-2 rounded-lg text-white/30 hover:text-white hover:bg-white/5 transition-colors"
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          {collapsed
            ? <ChevronRight className="w-4 h-4" />
            : <ChevronLeft  className="w-4 h-4" />
          }
        </button>
      </div>
    </aside>
  );
}
