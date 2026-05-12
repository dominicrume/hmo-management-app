'use client';

import {
  User,
  FileText,
  ShieldAlert,
  Search,
  ClipboardCheck,
  Receipt,
  Lock,
  Printer,
  Plus,
  CheckCircle2,
  AlertCircle,
  Clock,
} from 'lucide-react';
import type { DbTenant } from '@/types/database';

export type FormId =
  | 'personal'
  | 'housing'
  | 'assessment'
  | 'risk'
  | 'missing'
  | 'service'
  | 'privacy'
  | 'agreement'
  | 'induction'
  | 'ai-brain';

type FormStatus = 'Complete' | 'In Progress' | 'Required' | 'Review' | '';

interface FormItem {
  id: FormId;
  title: string;
  desc: string;
  icon: React.ReactNode;
  status: FormStatus;
}

const FORMS: FormItem[] = [
  {
    id: 'personal',
    title: 'Personal Details',
    desc: 'Core identity and contact info.',
    icon: <User className="w-4 h-4" />,
    status: 'In Progress',
  },
  {
    id: 'housing',
    title: 'Housing Benefit Claim',
    desc: 'Financial support processing.',
    icon: <Receipt className="w-4 h-4" />,
    status: 'Required',
  },
  {
    id: 'assessment',
    title: 'Initial Assessment',
    desc: 'New intake evaluation.',
    icon: <ClipboardCheck className="w-4 h-4" />,
    status: 'Complete',
  },
  {
    id: 'risk',
    title: 'Risk Assessment',
    desc: 'Safety and care goals.',
    icon: <ShieldAlert className="w-4 h-4" />,
    status: 'Review',
  },
  {
    id: 'missing',
    title: 'Missing Person',
    desc: 'Police protocol documentation.',
    icon: <Search className="w-4 h-4" />,
    status: '',
  },
  {
    id: 'service',
    title: 'Service Charge',
    desc: 'Weekly utility breakdown.',
    icon: <FileText className="w-4 h-4" />,
    status: '',
  },
  {
    id: 'privacy',
    title: 'Confidentiality Form',
    desc: 'Privacy and data consent.',
    icon: <Lock className="w-4 h-4" />,
    status: '',
  },
  {
    id: 'agreement',
    title: 'Support Agreement',
    desc: 'Signed support service agreement.',
    icon: <FileText className="w-4 h-4" />,
    status: 'Required',
  },
  {
    id: 'induction',
    title: 'Induction Checklist',
    desc: 'Tenant onboarding sign-off.',
    icon: <ClipboardCheck className="w-4 h-4" />,
    status: 'Required',
  },
];

function StatusBadge({ status, active }: { status: FormStatus; active: boolean }) {
  if (!status) return null;
  if (status === 'Complete') {
    return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />;
  }
  const colours: Record<string, string> = {
    'In Progress': active
      ? 'bg-amber text-navy'
      : 'bg-amber/20 text-amber-dark',
    'Required': active
      ? 'bg-red-200 text-red-800'
      : 'bg-red-50 text-red-600',
    'Review': active
      ? 'bg-sky-200 text-sky-900'
      : 'bg-sky-50 text-sky-700',
  };
  const icon =
    status === 'Required' ? <AlertCircle className="w-2.5 h-2.5" /> :
    status === 'Review'   ? <Clock className="w-2.5 h-2.5" /> : null;

  return (
    <span
      className={`inline-flex items-center gap-1 text-xxs font-black uppercase px-1.5 py-0.5 rounded ${colours[status] ?? ''}`}
    >
      {icon}
      {status}
    </span>
  );
}

interface Props {
  activeForm: FormId;
  onSelectForm: (form: FormId) => void;
  tenant?: DbTenant | null;
}

// Derive live form status from the tenant record
function deriveStatus(formId: FormId, tenant: DbTenant | null | undefined): FormStatus {
  if (!tenant) return '';
  switch (formId) {
    case 'personal':
      return tenant.full_name && tenant.nino && tenant.mobile ? 'Complete' : 'In Progress';
    case 'privacy':
      return tenant.confidentiality_signed ? 'Complete' : 'Required';
    case 'assessment':
      return tenant.assigned_worker_id ? 'Complete' : 'Required';
    case 'missing':
      return tenant.status === 'missing' ? 'Review' : '';
    default:
      return '';
  }
}

export default function FormsPanel({ activeForm, onSelectForm, tenant }: Props) {
  const handlePrint = () => window.print();

  return (
    <aside
      className="w-panel min-w-panel max-w-panel bg-white border-l border-slate-200 flex flex-col h-full overflow-hidden"
      aria-label="Forms library"
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <p className="text-xxs font-semibold text-slate-400 uppercase tracking-widest">
            Forms — 1 of 8
          </p>
          <h2 className="text-xs font-bold text-navy mt-0.5">Form Library</h2>
        </div>
        <button
          type="button"
          className="w-7 h-7 rounded-full bg-slate-100 hover:bg-amber/20 text-slate-500 hover:text-amber-dark
                     flex items-center justify-center transition-colors"
          aria-label="Add new form"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Form list */}
      <ul className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {FORMS.map((form) => {
          const isActive = form.id === activeForm;
          const liveStatus = deriveStatus(form.id, tenant) || form.status;
          return (
            <li key={form.id}>
              <button
                type="button"
                onClick={() => onSelectForm(form.id)}
                className={`
                  w-full text-left p-3 rounded-xl border transition-all duration-150
                  ${isActive
                    ? 'bg-navy border-navy shadow-md text-white'
                    : 'bg-white border-slate-200 hover:border-amber/50 hover:shadow-sm'
                  }
                `}
                aria-current={isActive ? 'true' : undefined}
              >
                <div className="flex items-start gap-2.5">
                  <span
                    className={`p-1.5 rounded-lg flex-shrink-0
                      ${isActive ? 'bg-white/10 text-amber' : 'bg-slate-100 text-navy'}`}
                  >
                    {form.icon}
                  </span>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <p className={`text-xs font-bold truncate ${isActive ? 'text-white' : 'text-navy'}`}>
                        {form.title}
                      </p>
                      {liveStatus === 'Complete' && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                      )}
                    </div>

                    <p className={`text-xxs leading-tight ${isActive ? 'text-white/60' : 'text-slate-400'}`}>
                      {form.desc}
                    </p>

                    {liveStatus && liveStatus !== 'Complete' && (
                      <div className="mt-1.5">
                        <StatusBadge status={liveStatus} active={isActive} />
                      </div>
                    )}
                  </div>
                </div>
              </button>
            </li>
          );
        })}
      </ul>

      {/* Print actions */}
      <div className="border-t border-slate-100 px-3 py-4 space-y-2">
        <button
          type="button"
          onClick={handlePrint}
          className="w-full flex items-center justify-center gap-2 bg-navy text-white
                     py-2.5 rounded-lg text-xs font-bold hover:bg-navy-light transition-colors"
        >
          <Printer className="w-3.5 h-3.5" />
          Print Active Form
        </button>
        <button
          type="button"
          onClick={handlePrint}
          className="w-full flex items-center justify-center gap-2 border-2 border-navy
                     text-navy py-2.5 rounded-lg text-xs font-bold hover:bg-navy/5 transition-colors"
        >
          <Printer className="w-3.5 h-3.5" />
          Print All Forms
        </button>
        <p className="text-center text-xxs text-slate-400 font-semibold uppercase tracking-widest pt-1">
          Export PDF (ISO 32000)
        </p>
      </div>
    </aside>
  );
}
