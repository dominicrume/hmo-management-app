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

// Forms ordered to match the actual operational workflow from the support checklist document
const FORMS: FormItem[] = [
  {
    id: 'housing',
    title: 'Housing Benefit Claim',
    desc: 'Complete first on arrival — online application or Change of Circumstance.',
    icon: <Receipt className="w-4 h-4" />,
    status: 'Required',
  },
  {
    id: 'personal',
    title: 'Personal Details',
    desc: 'Primary identity and contact information collection.',
    icon: <User className="w-4 h-4" />,
    status: 'In Progress',
  },
  {
    id: 'missing',
    title: 'Missing Person',
    desc: 'Police report and risk profiling documentation.',
    icon: <Search className="w-4 h-4" />,
    status: '',
  },
  {
    id: 'agreement',
    title: 'Support Checklist',
    desc: 'On arrival, within 3 days, and after 3 days task sign-off.',
    icon: <FileText className="w-4 h-4" />,
    status: 'Required',
  },
  {
    id: 'assessment',
    title: 'Initial Assessment',
    desc: 'Needs assessment completed with service user on arrival.',
    icon: <ClipboardCheck className="w-4 h-4" />,
    status: '',
  },
  {
    id: 'service',
    title: 'Service Charge',
    desc: 'Service charge letter — weekly and monthly breakdown.',
    icon: <FileText className="w-4 h-4" />,
    status: '',
  },
  {
    id: 'privacy',
    title: 'Confidentiality Waiver',
    desc: 'GDPR consent and data sharing agreement.',
    icon: <Lock className="w-4 h-4" />,
    status: '',
  },
  {
    id: 'risk',
    title: 'Risk Assessment',
    desc: 'Internal document — complete within 3 days, email to senior for approval.',
    icon: <ShieldAlert className="w-4 h-4" />,
    status: '',
  },
  {
    id: 'induction',
    title: 'Admission Checklist',
    desc: 'Tenant admission confirmation and key handover.',
    icon: <ClipboardCheck className="w-4 h-4" />,
    status: '',
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

// Derive live form status from the tenant record + optional completion signals
function deriveStatus(
  formId: FormId,
  tenant: DbTenant | null | undefined,
  completedForms?: Set<string>,
): FormStatus {
  if (!tenant) return '';

  // If caller has session/charge data, use it
  if (completedForms?.has(formId)) return 'Complete';

  switch (formId) {
    case 'personal':
      return tenant.full_name && tenant.nino && tenant.mobile && tenant.nok_name
        ? 'Complete'
        : 'In Progress';
    case 'privacy':
      return tenant.confidentiality_signed ? 'Complete' : 'Required';
    case 'missing':
      return tenant.status === 'missing' ? 'Review' : '';
    case 'service':
      // If benefit_amount is set, a service charge is likely configured
      return tenant.benefit_amount && Number(tenant.benefit_amount) > 0 ? 'Complete' : '';
    case 'assessment':
      return tenant.assigned_worker_id ? 'Complete' : '';
    default:
      return '';
  }
}

interface Props {
  activeForm:    FormId;
  onSelectForm:  (form: FormId) => void;
  tenant?:       DbTenant | null;
  /** Set of form IDs that have been saved (passed from dashboard with session data) */
  completedForms?: Set<string>;
}

export default function FormsPanel({ activeForm, onSelectForm, tenant, completedForms }: Props) {
  const handlePrint = () => window.print();

  const handlePrintAllForms = () => {
    if (!tenant) {
      alert('Please select a tenant first to print their forms.');
      return;
    }
    window.open(`/dashboard/print/forms/${tenant.id}`, '_blank');
  };

  return (
    <aside
      className="w-full lg:w-panel lg:min-w-panel lg:max-w-panel bg-white lg:border-l border-slate-200 flex flex-col h-full overflow-hidden"
      aria-label="Forms library"
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
        <div>
          <p className="text-xxs font-black text-slate-400 uppercase tracking-[0.15em]">
            Different Forms
          </p>
          <p className="text-xxs text-slate-400 mt-0.5">Select a form to populate</p>
        </div>
        <button
          type="button"
          className="w-7 h-7 rounded-full bg-navy/10 hover:bg-amber/20 text-navy hover:text-amber-dark
                     flex items-center justify-center transition-colors font-bold text-sm"
          aria-label="Add new form"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Form list */}
      <ul className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {FORMS.map((form) => {
          const isActive = form.id === activeForm;
          const liveStatus = deriveStatus(form.id, tenant, completedForms) || form.status;
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
          onClick={handlePrintAllForms}
          className="w-full flex items-center justify-center gap-2 border-2 border-navy
                     text-navy py-2.5 rounded-lg text-xs font-bold hover:bg-navy/5 transition-colors"
        >
          <Printer className="w-3.5 h-3.5" />
          Print All Forms
        </button>
        <p className="text-center text-xxs text-slate-400 font-semibold uppercase tracking-widest pt-1">
          Export as Encrypted PDF (ISO 32000)
        </p>
      </div>
    </aside>
  );
}
