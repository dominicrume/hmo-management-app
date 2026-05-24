'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { DbUser, DbTenant, Brand } from '@/types/database';
import { Loader2, LogOut, Receipt, FileText, Wrench } from 'lucide-react';
import LedgerView from '@/components/views/LedgerView';

type Tab = 'ledger' | 'forms' | 'maintenance';

export default function TenantDashboard() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<DbUser | null>(null);
  const [tenantRecord, setTenantRecord] = useState<DbTenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('ledger');

  useEffect(() => {
    async function load() {
      try {
        const meRes = await fetch('/api/me');
        if (!meRes.ok) throw new Error('Not authenticated');
        const { user } = await meRes.json();
        
        if (user.role !== 'Tenant') {
          router.replace('/dashboard');
          return;
        }

        setCurrentUser(user);

        // Fetch their tenant record via the API
        const tRes = await fetch('/api/tenants');
        const tData = await tRes.json();
        if (tData.tenants && tData.tenants.length > 0) {
          setTenantRecord(tData.tenants[0]);
        }
      } catch (err) {
        console.error(err);
        router.replace('/login');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [router]);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-navy flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-amber animate-spin" />
      </div>
    );
  }

  if (!currentUser || !tenantRecord) {
    return (
      <div className="min-h-screen bg-navy flex flex-col items-center justify-center">
        <p className="text-white mb-4">No tenant record found.</p>
        <button onClick={handleSignOut} className="text-amber hover:underline">Sign Out</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      {/* Top Navbar */}
      <header className="bg-navy text-white px-4 py-3 flex items-center justify-between sticky top-0 z-50 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-amber rounded-lg flex items-center justify-center text-navy font-black text-sm">
            TH
          </div>
          <div>
            <h1 className="font-black text-sm tracking-tight">Tenant Hub</h1>
            <p className="text-xxs text-slate-400">Welcome, {tenantRecord.full_name}</p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 text-xs text-slate-300 hover:text-white transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Sign Out</span>
        </button>
      </header>

      {/* Mobile Navigation Tabs */}
      <div className="bg-white border-b border-slate-200 px-4 py-2 flex items-center gap-2 overflow-x-auto hide-scrollbar">
        <button
          onClick={() => setActiveTab('ledger')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
            activeTab === 'ledger' ? 'bg-navy text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Receipt className="w-3.5 h-3.5" />
          My Ledger
        </button>
        <button
          onClick={() => setActiveTab('forms')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
            activeTab === 'forms' ? 'bg-navy text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          My Agreements
        </button>
        <button
          onClick={() => setActiveTab('maintenance')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
            activeTab === 'maintenance' ? 'bg-navy text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Wrench className="w-3.5 h-3.5" />
          Maintenance
        </button>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8 max-w-5xl mx-auto w-full">
        {activeTab === 'ledger' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <LedgerView
              activeTenant={tenantRecord}
              tenants={[tenantRecord]}
              currentUser={currentUser}
              onRefresh={() => {}}
            />
          </div>
        )}
        
        {activeTab === 'forms' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 text-center">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-black text-navy mb-2">My Agreements</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              Your signed tenancy agreements and move-in forms will appear here once finalized by your Support Worker.
            </p>
          </div>
        )}

        {activeTab === 'maintenance' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 text-center">
            <Wrench className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-black text-navy mb-2">Maintenance Requests</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
              Need something fixed in your room? Submit a new maintenance request directly to the management team.
            </p>
            <button className="bg-amber text-navy font-bold text-sm px-6 py-2.5 rounded-lg hover:bg-amber-light transition-colors">
              Submit Request
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
