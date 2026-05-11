import React, { useState } from 'react';
import { 
  User, 
  FileText, 
  ShieldAlert, 
  Search, 
  ClipboardCheck, 
  Receipt, 
  Lock, 
  Printer, 
  Save, 
  Plus, 
  CheckCircle,
  Menu,
  ChevronRight,
  MoreVertical
} from 'lucide-react';

const App = () => {
  const [activeTenant, setActiveTenant] = useState('John Stevenson');
  const [activeForm, setActiveForm] = useState('Personal Details');
  
  const tenants = [
    { name: 'John Stevenson', unit: 'Unit 4B', status: 'Active', initials: 'JS' },
    { name: 'Alice Murphy', unit: 'Unit 12A', status: 'Pending', initials: 'AM' },
    { name: 'Robert Brown', unit: 'Unit 2C', status: 'Active', initials: 'RB' },
    { name: 'Sarah Jenkins', unit: 'Unit 5F', status: 'Moved On', initials: 'SJ' },
  ];

  const forms = [
    { id: 'personal', title: 'Personal Details', desc: 'Core identity and contact info.', icon: <User className="w-5 h-5" />, status: 'In Progress' },
    { id: 'housing', title: 'Housing Benefit Claim', desc: 'Financial support processing.', icon: <Receipt className="w-5 h-5" />, status: 'Required' },
    { id: 'assessment', title: 'Initial Assessment', desc: 'New intake evaluation.', icon: <ClipboardCheck className="w-5 h-5" />, status: 'Complete' },
    { id: 'risk', title: 'Risk Assessment / Support Plan', desc: 'Safety and care goals.', icon: <ShieldAlert className="w-5 h-5" />, status: 'Review' },
    { id: 'missing', title: 'Missing Person', desc: 'Police protocol documentation.', icon: <Search className="w-5 h-5" />, status: '' },
    { id: 'service', title: 'Service Charge', desc: 'Weekly utility breakdown.', icon: <FileText className="w-5 h-5" />, status: '' },
    { id: 'privacy', title: 'Confidentiality Form', desc: 'Privacy and data consent.', icon: <Lock className="w-5 h-5" />, status: '' },
  ];

  return (
    <div className="flex flex-col h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
      {/* Top Header */}
      <header className="h-16 bg-[#0D9488] text-white flex items-center justify-between px-6 shadow-md z-20">
        <div className="flex items-center gap-4">
          <Menu className="w-6 h-6 cursor-pointer" />
          <h1 className="text-xl font-bold tracking-tight">MATTY'S PLACE <span className="font-light text-teal-100 ml-2 border-l border-teal-500 pl-2">Master Form View</span></h1>
        </div>
        <div className="flex-1 max-w-xl mx-8 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-teal-200" />
          <input 
            type="text" 
            placeholder="Search records, forms, or documents..." 
            className="w-full bg-teal-800/40 border border-teal-700 rounded-lg py-2 pl-10 pr-4 text-sm placeholder-teal-300 focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>
        <div className="flex items-center gap-4">
          <div className="bg-teal-800/50 px-3 py-1 rounded text-xs font-medium border border-teal-700">
            SYSTEM STATUS: OPERATIONAL
          </div>
          <div className="w-8 h-8 rounded-full bg-amber-400 text-[#0D9488] flex items-center justify-center font-bold">
            AD
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Tenants */}
        <aside className="w-72 bg-white border-r border-slate-200 flex flex-col shadow-sm">
          <div className="p-4 border-b border-slate-100">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-slate-700">Tenants</h2>
              <span className="text-xs bg-teal-100 text-teal-700 px-2 py-1 rounded-full font-bold">24 ACTIVE</span>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search tenants..." 
                className="w-full bg-slate-100 border-none rounded-md py-1.5 pl-9 pr-4 text-sm focus:ring-1 focus:ring-teal-500 outline-none"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {tenants.map((t) => (
              <div 
                key={t.name}
                onClick={() => setActiveTenant(t.name)}
                className={`p-4 border-b border-slate-50 cursor-pointer transition-all flex items-center gap-3 ${activeTenant === t.name ? 'bg-teal-50 border-l-4 border-l-[#0D9488]' : 'hover:bg-slate-50'}`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${activeTenant === t.name ? 'bg-[#0D9488] text-white' : 'bg-slate-200 text-slate-500'}`}>
                  {t.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-bold truncate ${activeTenant === t.name ? 'text-teal-900' : 'text-slate-700'}`}>{t.name}</p>
                  <p className="text-xs text-slate-500">{t.unit} • {t.status}</p>
                </div>
                {activeTenant === t.name && <ChevronRight className="w-4 h-4 text-teal-500" />}
              </div>
            ))}
          </div>
        </aside>

        {/* Main Workspace */}
        <main className="flex-1 overflow-y-auto p-8 bg-[#F0FDFA]/30">
          <div className="max-w-4xl mx-auto bg-white shadow-xl rounded-sm min-h-[1056px] border border-slate-200 p-12 relative">
            {/* Form Header */}
            <div className="flex justify-between items-start border-b-2 border-[#0D9488] pb-6 mb-8">
              <div>
                <h2 className="text-3xl font-black text-slate-800 tracking-tighter uppercase">Matty's Place</h2>
                <p className="text-xs text-slate-500 font-bold tracking-widest uppercase">Supported Housing & Community Services</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-slate-400">FORM REF: MP-TN-2026-53</p>
                <p className="text-sm font-medium">Date: May 11, 2026</p>
              </div>
            </div>

            <div className="mb-8">
              <h3 className="text-sm font-black text-[#0D9488] mb-6 flex items-center gap-2">
                <div className="w-1 h-4 bg-[#0D9488]"></div>
                SECTION 1.0: {activeForm.toUpperCase()}
              </h3>

              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Full Legal Name</label>
                  <input type="text" defaultValue={activeTenant} className="w-full border-b border-slate-300 py-1 focus:border-[#0D9488] outline-none transition-colors" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Primary Phone</label>
                  <input type="text" placeholder="07000 000000" className="w-full border-b border-slate-300 py-1 focus:border-[#0D9488] outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Date of Birth</label>
                  <input type="date" className="w-full border-b border-slate-300 py-1 focus:border-[#0D9488] outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Email Address</label>
                  <input type="email" placeholder="example@email.com" className="w-full border-b border-slate-300 py-1 focus:border-[#0D9488] outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase">National Insurance Number</label>
                  <input type="text" placeholder="QQ 12 34 56 C" className="w-full border-b border-slate-300 py-1 focus:border-[#0D9488] outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Marital Status</label>
                  <select className="w-full border-b border-slate-300 py-1 focus:border-[#0D9488] outline-none bg-transparent">
                    <option>Single</option>
                    <option>Married</option>
                    <option>Partnered</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="mb-8">
              <h3 className="text-sm font-black text-[#0D9488] mb-6 flex items-center gap-2">
                <div className="w-1 h-4 bg-[#0D9488]"></div>
                SECTION 2.0: EMERGENCY CONTACT
              </h3>
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Next of Kin Name</label>
                  <input type="text" placeholder="Full name" className="w-full border-b border-slate-300 py-1 focus:border-[#0D9488] outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Relationship</label>
                  <input type="text" placeholder="e.g. Brother" className="w-full border-b border-slate-300 py-1 focus:border-[#0D9488] outline-none" />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-black text-[#0D9488] mb-4 uppercase">Administrative Notes</h3>
              <textarea 
                className="w-full h-32 bg-slate-50 border border-slate-200 rounded p-4 text-sm focus:ring-1 focus:ring-[#0D9488] outline-none"
                placeholder="Enter any specific notes regarding this assessment..."
              ></textarea>
            </div>

            <div className="absolute bottom-12 right-12 flex gap-3">
              <button className="flex items-center gap-2 border border-slate-300 px-4 py-2 rounded text-xs font-bold hover:bg-slate-50">
                <Save className="w-3.5 h-3.5" /> SAVE AS DRAFT
              </button>
            </div>
          </div>
        </main>

        {/* Right Sidebar - Forms Library */}
        <aside className="w-80 bg-white border-l border-slate-200 p-6 overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-sm font-black text-slate-500 uppercase tracking-widest">Different Forms</h2>
            <button className="bg-teal-50 text-[#0D9488] p-1.5 rounded-full hover:bg-teal-100">
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-4">
            {forms.map((f) => (
              <div 
                key={f.id}
                onClick={() => setActiveForm(f.title)}
                className={`group p-4 rounded-xl border transition-all cursor-pointer relative overflow-hidden ${activeForm === f.title ? 'bg-[#0D9488] border-[#0D9488] shadow-lg shadow-teal-100 text-white' : 'bg-white border-slate-200 hover:border-teal-200'}`}
              >
                <div className="flex items-start gap-3 relative z-10">
                  <div className={`p-2 rounded-lg ${activeForm === f.title ? 'bg-teal-800/40 text-white' : 'bg-slate-100 text-[#0D9488]'}`}>
                    {f.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-center">
                      <h4 className="text-sm font-bold">{f.title}</h4>
                      {f.status === 'Complete' && <CheckCircle className="w-4 h-4 text-emerald-400" />}
                    </div>
                    <p className={`text-[11px] mt-1 leading-tight ${activeForm === f.title ? 'text-teal-50/80' : 'text-slate-500'}`}>
                      {f.desc}
                    </p>
                    {f.status && f.status !== 'Complete' && (
                      <span className={`inline-block mt-2 text-[10px] font-black uppercase px-2 py-0.5 rounded ${activeForm === f.title ? 'bg-amber-400 text-[#0D9488]' : 'bg-amber-100 text-amber-700'}`}>
                        {f.status}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 space-y-3">
            <button className="w-full flex items-center justify-center gap-2 bg-[#0F172A] text-white py-3 rounded-lg text-sm font-bold hover:bg-slate-800 transition-colors uppercase tracking-tight">
              <Printer className="w-4 h-4" /> Print Active Form
            </button>
            <button className="w-full flex items-center justify-center gap-2 border-2 border-[#0F172A] text-[#0F172A] py-3 rounded-lg text-sm font-bold hover:bg-slate-50 transition-colors uppercase tracking-tight">
              <Printer className="w-4 h-4" /> Print All Forms
            </button>
            <p className="text-[10px] text-center text-slate-400 font-bold uppercase tracking-widest mt-4">Export as Encrypted PDF (ISO 32000)</p>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default App;







import React, { useState } from 'react';
import { 
  User, 
  FileText, 
  ShieldAlert, 
  Search, 
  ClipboardCheck, 
  Receipt, 
  Lock, 
  Printer, 
  Save, 
  Plus, 
  CheckCircle,
  Menu,
  ChevronRight,
  MoreVertical
} from 'lucide-react';

const App = () => {
  const [activeTenant, setActiveTenant] = useState('John Stevenson');
  const [activeForm, setActiveForm] = useState('Personal Details');
  
  const tenants = [
    { name: 'John Stevenson', unit: 'Unit 4B', status: 'Active', initials: 'JS' },
    { name: 'Alice Murphy', unit: 'Unit 12A', status: 'Pending', initials: 'AM' },
    { name: 'Robert Brown', unit: 'Unit 2C', status: 'Active', initials: 'RB' },
    { name: 'Sarah Jenkins', unit: 'Unit 5F', status: 'Moved On', initials: 'SJ' },
  ];

  const forms = [
    { id: 'personal', title: 'Personal Details', desc: 'Core identity and contact info.', icon: <User className="w-5 h-5" />, status: 'In Progress' },
    { id: 'housing', title: 'Housing Benefit Claim', desc: 'Financial support processing.', icon: <Receipt className="w-5 h-5" />, status: 'Required' },
    { id: 'assessment', title: 'Initial Assessment', desc: 'New intake evaluation.', icon: <ClipboardCheck className="w-5 h-5" />, status: 'Complete' },
    { id: 'risk', title: 'Risk Assessment / Support Plan', desc: 'Safety and care goals.', icon: <ShieldAlert className="w-5 h-5" />, status: 'Review' },
    { id: 'missing', title: 'Missing Person', desc: 'Police protocol documentation.', icon: <Search className="w-5 h-5" />, status: '' },
    { id: 'service', title: 'Service Charge', desc: 'Weekly utility breakdown.', icon: <FileText className="w-5 h-5" />, status: '' },
    { id: 'privacy', title: 'Confidentiality Form', desc: 'Privacy and data consent.', icon: <Lock className="w-5 h-5" />, status: '' },
  ];

  return (
    <div className="flex flex-col h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
      {/* Top Header */}
      <header className="h-16 bg-[#0D9488] text-white flex items-center justify-between px-6 shadow-md z-20">
        <div className="flex items-center gap-4">
          <Menu className="w-6 h-6 cursor-pointer" />
          <h1 className="text-xl font-bold tracking-tight">MATTY'S PLACE <span className="font-light text-teal-100 ml-2 border-l border-teal-500 pl-2">Master Form View</span></h1>
        </div>
        <div className="flex-1 max-w-xl mx-8 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-teal-200" />
          <input 
            type="text" 
            placeholder="Search records, forms, or documents..." 
            className="w-full bg-teal-800/40 border border-teal-700 rounded-lg py-2 pl-10 pr-4 text-sm placeholder-teal-300 focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>
        <div className="flex items-center gap-4">
          <div className="bg-teal-800/50 px-3 py-1 rounded text-xs font-medium border border-teal-700">
            SYSTEM STATUS: OPERATIONAL
          </div>
          <div className="w-8 h-8 rounded-full bg-amber-400 text-[#0D9488] flex items-center justify-center font-bold">
            AD
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Tenants */}
        <aside className="w-72 bg-white border-r border-slate-200 flex flex-col shadow-sm">
          <div className="p-4 border-b border-slate-100">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-slate-700">Tenants</h2>
              <span className="text-xs bg-teal-100 text-teal-700 px-2 py-1 rounded-full font-bold">24 ACTIVE</span>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search tenants..." 
                className="w-full bg-slate-100 border-none rounded-md py-1.5 pl-9 pr-4 text-sm focus:ring-1 focus:ring-teal-500 outline-none"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {tenants.map((t) => (
              <div 
                key={t.name}
                onClick={() => setActiveTenant(t.name)}
                className={`p-4 border-b border-slate-50 cursor-pointer transition-all flex items-center gap-3 ${activeTenant === t.name ? 'bg-teal-50 border-l-4 border-l-[#0D9488]' : 'hover:bg-slate-50'}`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${activeTenant === t.name ? 'bg-[#0D9488] text-white' : 'bg-slate-200 text-slate-500'}`}>
                  {t.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-bold truncate ${activeTenant === t.name ? 'text-teal-900' : 'text-slate-700'}`}>{t.name}</p>
                  <p className="text-xs text-slate-500">{t.unit} • {t.status}</p>
                </div>
                {activeTenant === t.name && <ChevronRight className="w-4 h-4 text-teal-500" />}
              </div>
            ))}
          </div>
        </aside>

        {/* Main Workspace */}
        <main className="flex-1 overflow-y-auto p-8 bg-[#F0FDFA]/30">
          <div className="max-w-4xl mx-auto bg-white shadow-xl rounded-sm min-h-[1056px] border border-slate-200 p-12 relative">
            {/* Form Header */}
            <div className="flex justify-between items-start border-b-2 border-[#0D9488] pb-6 mb-8">
              <div>
                <h2 className="text-3xl font-black text-slate-800 tracking-tighter uppercase">Matty's Place</h2>
                <p className="text-xs text-slate-500 font-bold tracking-widest uppercase">Supported Housing & Community Services</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-slate-400">FORM REF: MP-TN-2026-53</p>
                <p className="text-sm font-medium">Date: May 11, 2026</p>
              </div>
            </div>

            <div className="mb-8">
              <h3 className="text-sm font-black text-[#0D9488] mb-6 flex items-center gap-2">
                <div className="w-1 h-4 bg-[#0D9488]"></div>
                SECTION 1.0: {activeForm.toUpperCase()}
              </h3>

              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Full Legal Name</label>
                  <input type="text" defaultValue={activeTenant} className="w-full border-b border-slate-300 py-1 focus:border-[#0D9488] outline-none transition-colors" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Primary Phone</label>
                  <input type="text" placeholder="07000 000000" className="w-full border-b border-slate-300 py-1 focus:border-[#0D9488] outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Date of Birth</label>
                  <input type="date" className="w-full border-b border-slate-300 py-1 focus:border-[#0D9488] outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Email Address</label>
                  <input type="email" placeholder="example@email.com" className="w-full border-b border-slate-300 py-1 focus:border-[#0D9488] outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase">National Insurance Number</label>
                  <input type="text" placeholder="QQ 12 34 56 C" className="w-full border-b border-slate-300 py-1 focus:border-[#0D9488] outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Marital Status</label>
                  <select className="w-full border-b border-slate-300 py-1 focus:border-[#0D9488] outline-none bg-transparent">
                    <option>Single</option>
                    <option>Married</option>
                    <option>Partnered</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="mb-8">
              <h3 className="text-sm font-black text-[#0D9488] mb-6 flex items-center gap-2">
                <div className="w-1 h-4 bg-[#0D9488]"></div>
                SECTION 2.0: EMERGENCY CONTACT
              </h3>
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Next of Kin Name</label>
                  <input type="text" placeholder="Full name" className="w-full border-b border-slate-300 py-1 focus:border-[#0D9488] outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Relationship</label>
                  <input type="text" placeholder="e.g. Brother" className="w-full border-b border-slate-300 py-1 focus:border-[#0D9488] outline-none" />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-black text-[#0D9488] mb-4 uppercase">Administrative Notes</h3>
              <textarea 
                className="w-full h-32 bg-slate-50 border border-slate-200 rounded p-4 text-sm focus:ring-1 focus:ring-[#0D9488] outline-none"
                placeholder="Enter any specific notes regarding this assessment..."
              ></textarea>
            </div>

            <div className="absolute bottom-12 right-12 flex gap-3">
              <button className="flex items-center gap-2 border border-slate-300 px-4 py-2 rounded text-xs font-bold hover:bg-slate-50">
                <Save className="w-3.5 h-3.5" /> SAVE AS DRAFT
              </button>
            </div>
          </div>
        </main>

        {/* Right Sidebar - Forms Library */}
        <aside className="w-80 bg-white border-l border-slate-200 p-6 overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-sm font-black text-slate-500 uppercase tracking-widest">Different Forms</h2>
            <button className="bg-teal-50 text-[#0D9488] p-1.5 rounded-full hover:bg-teal-100">
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-4">
            {forms.map((f) => (
              <div 
                key={f.id}
                onClick={() => setActiveForm(f.title)}
                className={`group p-4 rounded-xl border transition-all cursor-pointer relative overflow-hidden ${activeForm === f.title ? 'bg-[#0D9488] border-[#0D9488] shadow-lg shadow-teal-100 text-white' : 'bg-white border-slate-200 hover:border-teal-200'}`}
              >
                <div className="flex items-start gap-3 relative z-10">
                  <div className={`p-2 rounded-lg ${activeForm === f.title ? 'bg-teal-800/40 text-white' : 'bg-slate-100 text-[#0D9488]'}`}>
                    {f.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-center">
                      <h4 className="text-sm font-bold">{f.title}</h4>
                      {f.status === 'Complete' && <CheckCircle className="w-4 h-4 text-emerald-400" />}
                    </div>
                    <p className={`text-[11px] mt-1 leading-tight ${activeForm === f.title ? 'text-teal-50/80' : 'text-slate-500'}`}>
                      {f.desc}
                    </p>
                    {f.status && f.status !== 'Complete' && (
                      <span className={`inline-block mt-2 text-[10px] font-black uppercase px-2 py-0.5 rounded ${activeForm === f.title ? 'bg-amber-400 text-[#0D9488]' : 'bg-amber-100 text-amber-700'}`}>
                        {f.status}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 space-y-3">
            <button className="w-full flex items-center justify-center gap-2 bg-[#0F172A] text-white py-3 rounded-lg text-sm font-bold hover:bg-slate-800 transition-colors uppercase tracking-tight">
              <Printer className="w-4 h-4" /> Print Active Form
            </button>
            <button className="w-full flex items-center justify-center gap-2 border-2 border-[#0F172A] text-[#0F172A] py-3 rounded-lg text-sm font-bold hover:bg-slate-50 transition-colors uppercase tracking-tight">
              <Printer className="w-4 h-4" /> Print All Forms
            </button>
            <p className="text-[10px] text-center text-slate-400 font-bold uppercase tracking-widest mt-4">Export as Encrypted PDF (ISO 32000)</p>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default App;