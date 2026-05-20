'use client';

import { useState } from 'react';
import {
  AlertTriangle, Archive, Trash2, X, Shield,
  ChevronRight, Loader2, CheckCircle2,
} from 'lucide-react';
import type { DbTenant } from '@/types/database';

type Mode = 'menu' | 'archive' | 'delete' | 'success';

interface Props {
  tenant:      DbTenant;
  onClose:     () => void;
  onComplete:  (action: 'archived' | 'deleted') => void;
}

export default function AdminRecordModal({ tenant, onClose, onComplete }: Props) {
  const [mode,         setMode]         = useState<Mode>('menu');
  const [reason,       setReason]       = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState('');
  const [successMsg,   setSuccessMsg]   = useState('');
  const [hash,         setHash]         = useState('');

  const expectedConfirm = `DELETE ${tenant.full_name}`;

  const handleArchive = async () => {
    if (!reason.trim()) { setError('Please enter a reason for archiving.'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/tenant/${tenant.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ reason }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Archive failed.');
      setSuccessMsg(json.message);
      setMode('success');
      onComplete('archived');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Archive failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!reason.trim())               { setError('Please enter a reason for deletion.');      return; }
    if (confirmation !== expectedConfirm) { setError(`Type exactly: ${expectedConfirm}`);     return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/tenant/${tenant.id}`, {
        method:  'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ reason, confirmation }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Delete failed.');
      setSuccessMsg(json.message);
      setHash(json.hash ?? '');
      setMode('success');
      onComplete('deleted');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Delete failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    // Backdrop
    <div
      className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-navy">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-amber" />
            <span className="text-white font-bold text-sm">Admin Record Management</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Manager-only badge */}
        <div className="px-6 py-2 bg-amber/10 border-b border-amber/20">
          <p className="text-xxs font-black text-amber-dark uppercase tracking-widest">
            🔒 Manager Access Only — All actions are blockchain-stamped and audit-logged
          </p>
        </div>

        <div className="p-6">

          {/* Tenant summary */}
          <div className="flex items-center gap-3 mb-6 p-4 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="w-10 h-10 rounded-full bg-navy flex items-center justify-center text-amber font-black text-sm flex-shrink-0">
              {tenant.full_name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()}
            </div>
            <div>
              <p className="font-bold text-navy text-sm">{tenant.full_name}</p>
              <p className="text-xxs text-slate-400">Room {tenant.room_number} · {tenant.status} · NINO: {tenant.nino}</p>
            </div>
          </div>

          {/* ── Mode: menu ── */}
          {mode === 'menu' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-500 mb-4">
                Select an action. Both actions are irreversible and will be recorded in the permanent audit trail with a blockchain stamp.
              </p>

              {/* Archive */}
              <button
                type="button"
                onClick={() => { setMode('archive'); setError(''); }}
                className="w-full flex items-center gap-4 p-4 border-2 border-amber/30 hover:border-amber rounded-xl bg-amber/5 hover:bg-amber/10 transition-all text-left group"
              >
                <div className="w-10 h-10 rounded-lg bg-amber/20 group-hover:bg-amber flex items-center justify-center flex-shrink-0">
                  <Archive className="w-5 h-5 text-amber-dark group-hover:text-navy" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-navy text-sm">Archive Record</p>
                  <p className="text-xxs text-slate-500 mt-0.5">
                    Marks tenant as inactive. Record is preserved in the database and audit trail but removed from active lists.
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-navy" />
              </button>

              {/* Hard delete */}
              <button
                type="button"
                onClick={() => { setMode('delete'); setError(''); }}
                className="w-full flex items-center gap-4 p-4 border-2 border-red-200 hover:border-red-400 rounded-xl bg-red-50 hover:bg-red-100 transition-all text-left group"
              >
                <div className="w-10 h-10 rounded-lg bg-red-100 group-hover:bg-red-200 flex items-center justify-center flex-shrink-0">
                  <Trash2 className="w-5 h-5 text-red-500" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-red-700 text-sm">Erase Record Permanently</p>
                  <p className="text-xxs text-red-400 mt-0.5">
                    Permanently removes all data from the database. The deletion event itself is blockchain-stamped and cannot be undone.
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-red-300 group-hover:text-red-500" />
              </button>
            </div>
          )}

          {/* ── Mode: archive ── */}
          {mode === 'archive' && (
            <div className="space-y-4">
              <div className="flex items-start gap-2 p-3 bg-amber/10 border border-amber/30 rounded-xl">
                <AlertTriangle className="w-4 h-4 text-amber flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-dark">
                  This will set {tenant.full_name}&apos;s status to <strong>Inactive</strong>. The record is preserved but will not appear in active tenant lists. This action is audit-logged.
                </p>
              </div>

              <div>
                <label className="block text-xxs font-black text-slate-500 uppercase tracking-wider mb-1.5">
                  Reason for Archiving *
                </label>
                <textarea
                  rows={3}
                  value={reason}
                  onChange={(e) => { setReason(e.target.value); setError(''); }}
                  placeholder="e.g. Tenant passed away before check-in. Family contacted. Record to be preserved for legal reference."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber/50 resize-none"
                />
              </div>

              {error && (
                <p className="text-xs text-red-600 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" /> {error}
                </p>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setMode('menu')}
                  className="flex-1 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-500 hover:text-navy transition-colors"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleArchive}
                  disabled={loading || !reason.trim()}
                  className="flex-1 py-2.5 bg-amber text-navy font-black text-xs rounded-xl hover:bg-amber/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Archive className="w-3.5 h-3.5" />}
                  {loading ? 'Archiving…' : 'Confirm Archive'}
                </button>
              </div>
            </div>
          )}

          {/* ── Mode: delete ── */}
          {mode === 'delete' && (
            <div className="space-y-4">
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-300 rounded-xl">
                <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-red-700 mb-1">Permanent Deletion — Cannot Be Undone</p>
                  <p className="text-xs text-red-600">
                    All data for {tenant.full_name} will be permanently erased from the database. The deletion event will be blockchain-stamped and recorded in the audit log with your name, timestamp, and reason.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xxs font-black text-slate-500 uppercase tracking-wider mb-1.5">
                  Reason for Deletion *
                </label>
                <textarea
                  rows={3}
                  value={reason}
                  onChange={(e) => { setReason(e.target.value); setError(''); }}
                  placeholder="e.g. Tenant never arrived at the property and passed away. Family requested full data erasure per GDPR Article 17."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-300 resize-none"
                />
              </div>

              <div>
                <label className="block text-xxs font-black text-slate-500 uppercase tracking-wider mb-1.5">
                  Type to Confirm: <span className="text-red-600 font-mono">{expectedConfirm}</span>
                </label>
                <input
                  type="text"
                  value={confirmation}
                  onChange={(e) => { setConfirmation(e.target.value); setError(''); }}
                  placeholder={expectedConfirm}
                  className="w-full bg-slate-50 border border-red-200 rounded-lg px-3 py-2.5 text-xs font-mono text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-red-300"
                />
              </div>

              {error && (
                <p className="text-xs text-red-600 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" /> {error}
                </p>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setMode('menu')}
                  className="flex-1 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-500 hover:text-navy transition-colors"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={loading || !reason.trim() || confirmation !== expectedConfirm}
                  className="flex-1 py-2.5 bg-red-600 text-white font-black text-xs rounded-xl hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  {loading ? 'Deleting…' : 'Permanently Delete'}
                </button>
              </div>
            </div>
          )}

          {/* ── Mode: success ── */}
          {mode === 'success' && (
            <div className="text-center py-4 space-y-4">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-100">
                <CheckCircle2 className="w-6 h-6 text-emerald-500" />
              </div>
              <div>
                <p className="font-bold text-navy text-sm">{successMsg}</p>
                {hash && (
                  <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <p className="text-xxs text-slate-500 uppercase tracking-wider mb-1">Deletion Blockchain Hash</p>
                    <p className="text-xxs font-mono text-emerald-700 break-all">{hash}</p>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 bg-navy text-white font-bold text-xs rounded-xl hover:bg-navy/90 transition-colors"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
