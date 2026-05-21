import { createClient, createServiceClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Printer } from 'lucide-react';
import type { DbTenant, DbSession, DbServiceCharge } from '@/types/database';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function PrintAllFormsPage({ params }: Props) {
  const { id } = await params;
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Use service client to bypass RLS for printing if worker is authorized.
  // Wait, we should make sure the worker is actually allowed to see this tenant.
  const svc = createServiceClient();
  
  // Verify access:
  const { data: staff } = await svc.from('users').select('role').eq('auth_id', user.id).single();
  if (!staff) redirect('/login');

  const { data: tenant } = await svc
    .from('tenants')
    .select('*')
    .eq('id', id)
    .single();

  if (!tenant) {
    return <div className="p-10 text-center font-bold text-red-500">Tenant not found.</div>;
  }

  // Fetch all sessions (these hold the form data)
  const { data: sessions } = await svc
    .from('sessions')
    .select('*, users (full_name)')
    .eq('tenant_id', id)
    .order('created_at', { ascending: false });

  // Fetch service charges (Form 6)
  const { data: charges } = await svc
    .from('service_charges')
    .select('*')
    .eq('tenant_id', id)
    .order('created_at', { ascending: false });

  // Map sessions to form types (using session_type or parsing notes)
  // Our form save logic saves as "ad_hoc", but the notes contain the form answers.
  
  const formsData = {
    personal: tenant,
    sessions: sessions || [],
    charges: charges || [],
  };

  return (
    <div className="bg-white min-h-screen">
      {/* Non-printing auto-print script and print button */}
      <div className="print:hidden p-4 bg-slate-100 flex justify-between items-center border-b">
        <div>
          <h1 className="font-bold text-navy">Print All Forms — {tenant.full_name}</h1>
          <p className="text-xs text-slate-500">Press Ctrl+P / Cmd+P to print if it doesn&apos;t open automatically.</p>
        </div>
        <button 
          id="print-btn"
          className="flex items-center gap-2 bg-navy text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-navy-light"
        >
          <Printer className="w-4 h-4" />
          Print Now
        </button>
      </div>
      
      {/* The Printable Document */}
      <div className="max-w-[210mm] mx-auto p-10 print:p-0 print:max-w-none space-y-12">
        
        {/* Cover Page */}
        <div className="text-center space-y-6 pt-20" style={{ pageBreakAfter: 'always' }}>
          <h1 className="text-3xl font-black text-navy uppercase tracking-widest">Matty&apos;s Place</h1>
          <h2 className="text-xl font-bold text-slate-600">Tenant Forms &amp; Records File</h2>
          
          <div className="mt-20 inline-block text-left border-2 border-navy p-10 rounded-xl min-w-[400px]">
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">Tenant Details</p>
            <p className="text-2xl font-black text-navy mb-1">{tenant.full_name}</p>
            <p className="text-lg text-slate-600 mb-4">Room {tenant.room_number}</p>
            <div className="grid grid-cols-2 gap-4 text-sm mt-8 border-t pt-4">
              <div>
                <span className="block text-xs text-slate-400 font-bold uppercase mb-1">Move In Date</span>
                {tenant.moved_in ? new Date(tenant.moved_in).toLocaleDateString('en-GB') : 'Pending'}
              </div>
              <div>
                <span className="block text-xs text-slate-400 font-bold uppercase mb-1">Status</span>
                <span className="capitalize">{tenant.status}</span>
              </div>
            </div>
          </div>
          
          <div className="mt-32 text-sm text-slate-400 font-mono">
            Document generated on: {new Date().toLocaleString('en-GB')}
          </div>
        </div>

        {/* 1. Personal Details */}
        <div className="form-section" style={{ pageBreakAfter: 'always' }}>
          <div className="border-b-2 border-navy pb-4 mb-6">
            <h2 className="text-xl font-black text-navy uppercase tracking-wider">Form 3: Personal Details</h2>
          </div>
          
          <div className="grid grid-cols-2 gap-x-8 gap-y-6">
            <DataField label="Full Name" value={tenant.full_name} />
            <DataField label="Date of Birth" value={tenant.dob ? new Date(tenant.dob).toLocaleDateString('en-GB') : undefined} />
            <DataField label="National Insurance Number" value={tenant.nino} />
            <DataField label="Nationality" value={tenant.nationality} />
            <DataField label="Mobile Phone" value={tenant.mobile} />
            <DataField label="Email Address" value={tenant.email} />
            <DataField label="Benefit Type" value={tenant.benefit_type} />
            <DataField label="Next of Kin Name" value={tenant.nok_name} />
            <DataField label="Next of Kin Phone" value={tenant.nok_phone} />
            <DataField label="Next of Kin Relation" value={tenant.nok_relation} />
            <DataField label="Doctor / GP" value={tenant.doctor} />
            <DataField label="Probation" value={tenant.on_probation ? 'Yes' : 'No'} />
            <DataField label="Probation Officer" value={tenant.probation_officer} />
          </div>
        </div>

        {/* 2. Confidentiality Waiver */}
        <div className="form-section" style={{ pageBreakAfter: 'always' }}>
          <div className="border-b-2 border-navy pb-4 mb-6">
            <h2 className="text-xl font-black text-navy uppercase tracking-wider">Form 5: Confidentiality Waiver</h2>
          </div>
          
          <div className="prose prose-sm max-w-none text-slate-700 mb-8">
            <p>I consent to Matty&apos;s Place / Ash Shahada Housing Association storing and processing my personal data in accordance with the Data Protection Act 2018 and GDPR.</p>
            <p>I agree to data being shared with relevant agencies (e.g., DWP, Council, Medical Professionals) when it is in my best interest or required for housing management.</p>
          </div>

          
          <div className="p-6 bg-slate-50 border border-slate-200 rounded-lg">
            <DataField 
              label="Signature Status" 
              value={tenant.confidentiality_signed 
                ? `Signed Electronically on ${new Date(tenant.confidentiality_signed_at!).toLocaleString('en-GB')}` 
                : 'NOT SIGNED'} 
            />
          </div>
        </div>

        {/* 3. Service Charges */}
        <div className="form-section" style={{ pageBreakAfter: 'always' }}>
          <div className="border-b-2 border-navy pb-4 mb-6">
            <h2 className="text-xl font-black text-navy uppercase tracking-wider">Form 6: Service Charge Agreement</h2>
          </div>
          
          {formsData.charges.length > 0 ? (
            formsData.charges.map((charge: any) => (
              <div key={charge.id} className="mb-6 p-6 border rounded-lg bg-slate-50">
                <div className="grid grid-cols-2 gap-4">
                  <DataField label="Period Start" value={new Date(charge.period_start).toLocaleDateString('en-GB')} />
                  <DataField label="Weekly Rate" value={`£${charge.weekly_rate}`} />
                  <DataField label="Payment Method" value={charge.payment_method} />
                  <DataField label="Notes" value={charge.notes} colSpan />
                </div>
              </div>
            ))
          ) : (
            <p className="text-slate-500 italic">No service charges recorded.</p>
          )}
        </div>

        {/* 4. Missing Person Data (If applicable) */}
        {tenant.status === 'missing' || tenant.physical_description ? (
          <div className="form-section" style={{ pageBreakAfter: 'always' }}>
            <div className="border-b-2 border-navy pb-4 mb-6">
              <h2 className="text-xl font-black text-navy uppercase tracking-wider">Form 4: Missing Person Profile</h2>
            </div>
            
            <div className="grid grid-cols-1 gap-6">
              <DataField label="Status" value={tenant.status.toUpperCase()} />
              <DataField label="Physical Description" value={tenant.physical_description} />
              <DataField label="Vehicle Registration" value={tenant.vehicle_registration} />
              <DataField label="Employer / College" value={tenant.employer_or_college} />
            </div>
          </div>
        ) : null}

        {/* 5. Sessions (Housing, Assessment, Risk, Checklists) */}
        <div className="form-section">
          <div className="border-b-2 border-navy pb-4 mb-6">
            <h2 className="text-xl font-black text-navy uppercase tracking-wider">Form Submissions &amp; Sessions</h2>
          </div>
          
          {formsData.sessions.length > 0 ? (
            <div className="space-y-8">
              {formsData.sessions.map((session: any) => (
                <div key={session.id} className="border border-slate-200 rounded-xl overflow-hidden page-break-inside-avoid mb-8">
                  <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex justify-between items-center">
                    <div>
                      <span className="font-bold text-navy">
                        {session.session_date ? new Date(session.session_date).toLocaleDateString('en-GB') : 'Unknown Date'}
                      </span>
                      <span className="text-xs text-slate-500 ml-3">Recorded by: {session.users?.full_name || 'System'}</span>
                    </div>
                    {session.is_signed && (
                      <span className="bg-emerald-100 text-emerald-800 text-xxs font-bold px-2 py-1 rounded uppercase tracking-wider">
                        Signed &amp; Verified
                      </span>
                    )}
                  </div>
                  <div className="p-5">
                    <pre className="text-sm font-sans text-slate-700 whitespace-pre-wrap">
                      {session.notes || 'No data recorded.'}
                    </pre>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 italic">No form submissions or sessions recorded.</p>
          )}
        </div>

      </div>

      {/* Auto-print script */}
      <script dangerouslySetInnerHTML={{ __html: `
        // Give fonts and images a tiny bit of time to render, then open print dialog.
        setTimeout(() => {
          window.print();
        }, 500);
        
        document.getElementById('print-btn').addEventListener('click', () => window.print());
      ` }} />
    </div>
  );
}

function DataField({ label, value, colSpan = false }: { label: string, value: string | null | undefined, colSpan?: boolean }) {
  if (!value) return null;
  return (
    <div className={colSpan ? 'col-span-2' : ''}>
      <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</span>
      <span className="block text-base text-navy font-medium">{value}</span>
    </div>
  );
}
