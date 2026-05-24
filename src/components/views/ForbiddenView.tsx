import { ShieldAlert } from 'lucide-react';

export default function ForbiddenView() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-slate-50">
      <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6 border-8 border-red-50">
        <ShieldAlert className="w-10 h-10 text-red-500" />
      </div>
      <h1 className="text-2xl font-black text-navy mb-2">403 Forbidden</h1>
      <p className="text-slate-500 max-w-sm">
        You do not have the required permissions to view this page. If you believe this is an error, please contact your administrator.
      </p>
    </div>
  );
}
