'use client';

import { useState, useRef, useEffect } from 'react';
import {
  LayoutDashboard, Users, FileText, BarChart2,
  ClipboardList, Shield, CreditCard, Brain,
  Settings, ChevronLeft, ChevronRight, LogOut,
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
  activeView: string;
  onNavigate: (view: SidebarView) => void;
  userRole: 'Manager' | 'SupportWorker' | 'Tenant';
  tenantCount?: number;
  riskCount?: number;
  userName?: string;
  onSignOut?: () => void;
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

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  size: number;
  color: string;
}

export function Sidebar({ activeView, onNavigate, userRole, tenantCount, riskCount, userName, onSignOut }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const lastMousePos = useRef({ x: 0, y: 0 });
  const animationFrameId = useRef<number | null>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left + e.currentTarget.scrollLeft;
    const y = e.clientY - rect.top + e.currentTarget.scrollTop;
    lastMousePos.current = { x, y };

    // Spawn 1-2 particles per mouse move event
    if (canvasRef.current) {
      for (let i = 0; i < 2; i++) {
        particlesRef.current.push({
          x,
          y,
          vx: (Math.random() - 0.5) * 0.8,
          vy: -Math.random() * 0.6 - 0.2, // Slow upward drift
          alpha: 1.0,
          size: Math.random() * 2 + 1,
          color: `rgba(245, 158, 11, ${Math.random() * 0.4 + 0.2})`, // Soft warm gold
        });
      }
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const parent = canvas.parentElement;
    if (!parent) return;

    let width = parent.scrollWidth;
    let height = parent.scrollHeight;
    canvas.width = width;
    canvas.height = height;

    const resizeObserver = new ResizeObserver(() => {
      if (canvas && parent) {
        width = parent.scrollWidth;
        height = parent.scrollHeight;
        canvas.width = width;
        canvas.height = height;
      }
    });
    resizeObserver.observe(parent);

    const updateAndDraw = () => {
      ctx.clearRect(0, 0, width, height);

      // Render follow-mouse radial gradient backdrop
      if (isHovered) {
        const { x, y } = lastMousePos.current;
        const glow = ctx.createRadialGradient(x, y, 0, x, y, 140);
        glow.addColorStop(0, 'rgba(245, 158, 11, 0.08)');
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, width, height);
      }

      // Draw and update drifting golden dust particles
      const particles = particlesRef.current;
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= 0.012; // Slow fading curve

        if (p.alpha <= 0) {
          particles.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.shadowBlur = 4;
        ctx.shadowColor = 'rgba(245, 158, 11, 0.5)';
        ctx.fill();
        ctx.restore();
      }

      animationFrameId.current = requestAnimationFrame(updateAndDraw);
    };

    animationFrameId.current = requestAnimationFrame(updateAndDraw);

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
      resizeObserver.disconnect();
    };
  }, [isHovered]);

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
        flex flex-col bg-[#0A1628] border-r border-white/8 transition-all duration-200 shrink-0
        ${collapsed ? 'w-14' : 'w-56'}
      `}
    >
      {/* Brand header */}
      {!collapsed && (
        <div className="px-4 py-4 border-b border-white/8">
          <p className="text-white font-black text-sm tracking-tight">Matty&apos;s Place</p>
          {userName && (
            <p className="text-slate-500 text-[10px] mt-0.5 truncate">{userName}</p>
          )}
        </div>
      )}

      {/* Nav items */}
      <nav
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="flex-1 py-3 overflow-y-auto space-y-0.5 px-2 relative"
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full z-0 pointer-events-none"
        />
        <div className="relative z-10 space-y-0.5">
          {visibleItems.map((item) => {
            const isActive = item.id === 'tenants'
              ? (activeView === 'tenants' || activeView.startsWith('tenant:') || [
                  'personal', 'housing', 'support', 'missing', 'privacy', 'service', 'admission', 'intake'
                ].includes(activeView))
              : activeView === item.id;
            return (
              <button
                type="button"
                key={item.id}
                onClick={() => onNavigate(item.id)}
                title={collapsed ? item.label : undefined}
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 relative transform
                  ${isActive
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-[#0A1628] font-bold shadow-lg shadow-amber-500/25 translate-x-1 scale-[1.01]'
                    : 'text-slate-300 hover:text-white hover:bg-white/8 hover:translate-x-1 hover:scale-[1.01] font-medium'
                  }
                `}
              >
                {isActive && (
                  <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-amber-400 rounded-r shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
                )}
                <span className={`shrink-0 ${isActive ? 'text-[#0A1628]' : 'text-slate-400'}`}>
                  {item.icon}
                </span>
                {!collapsed && (
                  <>
                    <span className="flex-1 text-left truncate">{item.label}</span>
                    {(item.badge ?? 0) > 0 && (
                      <span className={`
                        text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center
                        ${isActive
                          ? 'bg-[#0A1628]/25 text-[#0A1628]'
                          : item.id === 'risk'
                            ? 'bg-red-500/20 text-red-400'
                            : 'bg-white/10 text-white/70'
                        }
                      `}>
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Footer — sign out + collapse */}
      <div className="border-t border-white/8 p-2 flex flex-col gap-1">
        {onSignOut && (
          <button
            type="button"
            onClick={onSignOut}
            aria-label="Sign out"
            className={`
              w-full flex items-center gap-2 px-3 py-2.5 rounded-lg
              text-red-400 hover:text-white hover:bg-red-500/20 transition-all text-xs font-medium
              ${collapsed ? 'justify-center' : ''}
            `}
          >
            <LogOut className="w-4 h-4 shrink-0" aria-hidden="true" />
            {!collapsed && <span>Sign Out</span>}
          </button>
        )}
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="w-full flex items-center justify-center py-2 rounded-lg text-slate-500 hover:text-white hover:bg-white/8 transition-all"
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
