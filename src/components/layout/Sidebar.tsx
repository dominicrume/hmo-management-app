'use client';

import {
  Users,
  LayoutDashboard,
  FileText,
  Receipt,
  ShieldAlert,
  Brain,
  Printer,
  Link,
  Settings,
  LogOut,
  ChevronRight,
} from 'lucide-react';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: string;
  managerOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard',  label: 'Dashboard',       icon: <LayoutDashboard className="w-4 h-4" /> },
  { id: 'tenants',    label: 'Tenants',          icon: <Users className="w-4 h-4" />, badge: '24' },
  { id: 'intake',     label: 'Intake Pipeline',  icon: <FileText className="w-4 h-4" /> },
  { id: 'sessions',   label: 'Sessions',         icon: <FileText className="w-4 h-4" /> },
  { id: 'ledger',     label: 'Service Charges',  icon: <Receipt className="w-4 h-4" />, managerOnly: true },
  { id: 'risk',       label: 'Risk Flags',       icon: <ShieldAlert className="w-4 h-4" />, badge: '2' },
  { id: 'ai-brain',   label: 'AI Brain',         icon: <Brain className="w-4 h-4" /> },
  { id: 'audit',      label: 'Audit Trail',      icon: <Link className="w-4 h-4" />, managerOnly: true },
  { id: 'print',      label: 'Print & Export',   icon: <Printer className="w-4 h-4" />, managerOnly: true },
];

interface Props {
  activeItem: string;
  onNavigate: (id: string) => void;
  role?:      'Manager' | 'SupportWorker';
  onSignOut?: () => void;
  userName?:  string;
  userRole?:  string;
}

export default function Sidebar({
  activeItem, onNavigate, role = 'Manager', onSignOut, userName, userRole,
}: Props) {
  const visible = NAV_ITEMS.filter((item) => !item.managerOnly || role === 'Manager');

  return (
    <aside
      className="w-sidebar min-w-sidebar bg-navy flex flex-col h-full overflow-hidden"
      aria-label="Main navigation"
    >
      {/* Logo area */}
      <div className="px-5 py-5 border-b border-navy-border">
        <p className="text-xxs font-mono font-semibold text-slate-500 uppercase tracking-widest mb-1">
          HMO Management
        </p>
        <h1 className="text-white font-bold text-sm leading-tight">
          Matty's Place
        </h1>
        <p className="text-slate-500 text-xxs mt-0.5">
          {role === 'Manager' ? '⬡ Manager Portal' : '⬡ Support Worker'}
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2" aria-label="Primary">
        <ul className="space-y-0.5">
          {visible.map((item) => {
            const isActive = item.id === activeItem;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onNavigate(item.id)}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left
                    text-xs font-medium transition-all duration-150
                    ${isActive
                      ? 'bg-amber text-navy font-semibold shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-navy-light'
                    }
                  `}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <span className={isActive ? 'text-navy' : 'text-slate-500'}>
                    {item.icon}
                  </span>
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.badge && (
                    <span
                      className={`
                        text-xxs font-bold px-1.5 py-0.5 rounded-full
                        ${isActive ? 'bg-navy text-amber' : 'bg-navy-muted text-slate-300'}
                      `}
                    >
                      {item.badge}
                    </span>
                  )}
                  {isActive && (
                    <ChevronRight className="w-3 h-3 text-navy flex-shrink-0" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="border-t border-navy-border px-2 py-3 space-y-0.5">
        <button type="button" className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-navy-light transition-colors">
          <Settings className="w-4 h-4 text-slate-500" />
          Settings
        </button>
        <button
          type="button"
          onClick={onSignOut}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-slate-400 hover:text-red-400 hover:bg-navy-light transition-colors"
        >
          <LogOut className="w-4 h-4 text-slate-500" />
          Sign Out
        </button>

        {/* User chip */}
        <div className="mt-3 px-2 py-2.5 bg-navy-light rounded-lg flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-amber flex items-center justify-center text-navy text-xxs font-black flex-shrink-0">
            {(userName ?? 'GM').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-white text-xxs font-semibold truncate">{userName || 'Loading…'}</p>
            <p className="text-slate-500 text-xxs truncate">{userRole || role}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
