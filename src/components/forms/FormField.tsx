'use client';

// Shared field primitives used by all 8 form components.

import { AlertCircle } from 'lucide-react';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';

interface BaseProps {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  className?: string;
  mono?: boolean;         // JetBrains Mono — for NINO, hashes, refs
  colSpan2?: boolean;     // span full grid width
}

// ── Text / email / tel / number / date ────────────────────────────────────────

export interface TextFieldProps extends BaseProps {
  type?: 'text' | 'email' | 'tel' | 'number' | 'date' | 'password';
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  maxLength?: number;
  min?: string;
  max?: string;
  readOnly?: boolean;
}

export function TextField({
  label, required, error, hint, className = '', mono, colSpan2,
  type = 'text', value, onChange, placeholder, maxLength, min, max, readOnly,
}: TextFieldProps) {
  return (
    <div className={`space-y-1 ${colSpan2 ? 'col-span-2' : ''} ${className}`}>
      <Label text={label} required={required} />
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        min={min}
        max={max}
        readOnly={readOnly}
        className={`
          w-full border-2 rounded-md px-3 py-2 text-sm bg-cream transition-colors
          placeholder-slate-400 focus:outline-none font-semibold
          ${mono ? 'font-mono tracking-widest' : ''}
          ${error
            ? 'border-red-400 text-red-700 focus:border-red-500 bg-red-50'
            : 'border-slate-300 text-navy focus:border-navy focus:bg-white'
          }
          ${readOnly ? 'text-slate-400 cursor-default bg-slate-50' : ''}
        `}
        aria-invalid={!!error}
        aria-describedby={error ? `${label}-err` : undefined}
      />
      {error && <FieldError id={`${label}-err`} msg={error} />}
      {!error && hint && <p className="text-xxs text-slate-400">{hint}</p>}
    </div>
  );
}

// ── Textarea ──────────────────────────────────────────────────────────────────

export interface TextareaFieldProps extends BaseProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}

export function TextareaField({
  label, required, error, hint, colSpan2, className = '',
  value, onChange, placeholder, rows = 3,
}: TextareaFieldProps) {
  return (
    <div className={`space-y-1 ${colSpan2 ? 'col-span-2' : ''} ${className}`}>
      <Label text={label} required={required} />
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className={`
          w-full border-2 rounded-md px-3 py-2 text-sm bg-cream resize-none font-semibold
          placeholder-slate-400 focus:outline-none transition-colors
          ${error
            ? 'border-red-400 text-red-700 focus:border-red-500 bg-red-50'
            : 'border-slate-300 text-navy focus:border-navy focus:bg-white'
          }
        `}
        aria-invalid={!!error}
      />
      {error && <FieldError msg={error} />}
      {!error && hint && <p className="text-xxs text-slate-400">{hint}</p>}
    </div>
  );
}

// ── Select ────────────────────────────────────────────────────────────────────

export interface SelectFieldProps extends BaseProps {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
}

export function SelectField({
  label, required, error, hint, colSpan2, className = '',
  value, onChange, options, placeholder = 'Select…',
}: SelectFieldProps) {
  return (
    <div className={`space-y-1 ${colSpan2 ? 'col-span-2' : ''} ${className}`}>
      <Label text={label} required={required} />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`
          w-full border-2 rounded-md px-3 py-2 text-sm bg-cream focus:outline-none transition-colors font-semibold
          ${error
            ? 'border-red-400 text-red-700 bg-red-50'
            : 'border-slate-300 text-navy focus:border-navy focus:bg-white'
          }
        `}
        aria-invalid={!!error}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
      {error && <FieldError msg={error} />}
      {!error && hint && <p className="text-xxs text-slate-400">{hint}</p>}
    </div>
  );
}

// ── Phone (International) ─────────────────────────────────────────────────────

export interface PhoneFieldProps extends BaseProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}

export function PhoneField({
  label, required, error, hint, className = '', colSpan2,
  value, onChange, placeholder,
}: PhoneFieldProps) {
  return (
    <div className={`space-y-1 ${colSpan2 ? 'col-span-2' : ''} ${className}`}>
      <Label text={label} required={required} />
      <div className={`
        border-2 rounded-md bg-cream transition-colors focus-within:border-navy focus-within:bg-white
        ${error ? 'border-red-400 bg-red-50' : 'border-slate-300'}
      `}>
        <PhoneInput
          international
          defaultCountry="GB"
          value={value}
          onChange={(v) => onChange(v || '')}
          placeholder={placeholder}
          className="w-full px-3 py-2 text-sm text-navy font-semibold outline-none bg-transparent phone-input-override"
        />
      </div>
      {error && <FieldError id={`${label}-err`} msg={error} />}
      {!error && hint && <p className="text-xxs text-slate-400">{hint}</p>}
    </div>
  );
}

// ── Checkbox ──────────────────────────────────────────────────────────────────

export interface CheckboxFieldProps {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  description?: string;
  error?: string;
  className?: string;
  colSpan2?: boolean;
}

export function CheckboxField({
  label, checked, onChange, description, error, className = '', colSpan2,
}: CheckboxFieldProps) {
  return (
    <div className={`${colSpan2 ? 'col-span-2' : ''} ${className}`}>
      <label className="flex items-start gap-3 cursor-pointer group">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-0.5 w-4 h-4 rounded border-slate-300 text-navy accent-navy flex-shrink-0"
        />
        <div>
          <p className="text-xs font-semibold text-navy group-hover:text-navy-muted">{label}</p>
          {description && <p className="text-xxs text-slate-400 mt-0.5">{description}</p>}
        </div>
      </label>
      {error && <FieldError msg={error} />}
    </div>
  );
}

// ── Section wrapper ───────────────────────────────────────────────────────────

export function FormSection({
  title,
  number,
  children,
}: {
  title: string;
  number: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-8">
      <h3 className="text-xxs font-black text-navy uppercase tracking-widest mb-5 flex items-center gap-2">
        <span className="w-1 h-3.5 bg-amber rounded-full inline-block flex-shrink-0" />
        Section {number} — {title}
      </h3>
      <div className="grid grid-cols-2 gap-x-8 gap-y-5">
        {children}
      </div>
    </div>
  );
}

// ── Submit bar ────────────────────────────────────────────────────────────────

export function FormActions({
  onSaveDraft,
  onSubmit,
  submitLabel = 'Save & Stamp',
  submitting = false,
}: {
  onSaveDraft?: () => void;
  onSubmit: () => void;
  submitLabel?: string;
  submitting?: boolean;
}) {
  return (
    <div className="flex items-center justify-end gap-3 pt-6 mt-4 border-t border-slate-100">
      {onSaveDraft && (
        <button
          type="button"
          onClick={onSaveDraft}
          className="border border-slate-300 text-slate-600 px-4 py-2 rounded-lg text-xs
                     font-bold hover:bg-slate-50 transition-colors"
        >
          Save Draft
        </button>
      )}
      <button
        type="button"
        onClick={onSubmit}
        disabled={submitting}
        className="bg-navy text-white px-5 py-2 rounded-lg text-xs font-bold
                   hover:bg-navy-light transition-colors disabled:opacity-50"
      >
        {submitting ? 'Saving…' : submitLabel}
      </button>
    </div>
  );
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function Label({ text, required }: { text: string; required?: boolean }) {
  return (
    <label className="text-xxs font-black text-slate-400 uppercase tracking-wider">
      {text}
      {required && <span className="text-red-400 ml-0.5">*</span>}
    </label>
  );
}

function FieldError({ msg, id }: { msg: string; id?: string }) {
  return (
    <p id={id} className="flex items-center gap-1 text-xxs text-red-500 font-semibold mt-0.5">
      <AlertCircle className="w-3 h-3 flex-shrink-0" />
      {msg}
    </p>
  );
}
