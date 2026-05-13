'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Brain, Send, Loader2, AlertTriangle, Sparkles,
  MessageSquare, ChevronDown, RotateCcw, Copy, CheckCheck
} from 'lucide-react';
import type { DbTenant } from '@/types/database';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  risk?: boolean;
  timestamp: Date;
}

interface Props {
  tenant: DbTenant;
  workerId: string;
}

const QUICK_TASKS = [
  { label: '3 Questions from Last Session',   task: 'Generate 3 follow-up questions based on the most recent session notes.', type: 'session_questions' },
  { label: 'Summarise This Month',            task: 'Summarise all sessions and events from the past 30 days in a concise paragraph for a manager review.', type: 'summary' },
  { label: 'Risk Assessment',                 task: 'Analyse all session notes and identify any safeguarding concerns, patterns of deterioration, or risk flags. Be specific.', type: 'risk_flag' },
  { label: 'Council Report Draft',            task: 'Draft a council-ready support plan narrative for this tenant covering the past month. Include sessions, goals, outcomes, and service charges.', type: 'council_report' },
  { label: 'Check Service Charge Arrears',    task: 'List all unpaid service charges, calculate the total arrears, and recommend next steps.', type: 'agent_task' },
  { label: 'Draft a Reminder Letter',         task: 'Draft a professional but firm letter to this tenant regarding outstanding service charge payments. Use the Matty\'s Place letterhead tone.', type: 'agent_task' },
];

export default function AIBrainPanel({ tenant, workerId }: Props) {
  const [messages,  setMessages]  = useState<Message[]>([]);
  const [input,     setInput]     = useState('');
  const [loading,   setLoading]   = useState(false);
  const [copied,    setCopied]    = useState<string | null>(null);
  const [questions, setQuestions] = useState<string[]>([]);
  const [loadingQs, setLoadingQs] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-load session questions on mount
  useEffect(() => {
    loadSessionQuestions();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant.id]);

  const loadSessionQuestions = async () => {
    setLoadingQs(true);
    try {
      const res = await fetch('/api/ai/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenant_id: tenant.id, worker_id: workerId }),
      });
      const data = await res.json();
      if (data.questions) setQuestions(data.questions);
    } catch { /* silent fail */ }
    finally { setLoadingQs(false); }
  };

  const sendTask = async (task: string, taskType = 'agent_task') => {
    if (!task.trim() || loading) return;

    const userMsg: Message = { role: 'user', content: task, timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/ai/brain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: tenant.id,
          worker_id: workerId,
          task,
          task_type: taskType,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'AI request failed');

      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: data.response,
        risk: data.risk_detected,
        timestamp: new Date(),
      }]);
    } catch (e: unknown) {
      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: `Error: ${e instanceof Error ? e.message : 'Something went wrong.'}`,
        timestamp: new Date(),
      }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const formatTime = (d: Date) =>
    d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  // Simple markdown-ish renderer
  const renderContent = (text: string) =>
    text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/^## (.+)$/gm, '<p class="text-xs font-black text-navy uppercase tracking-wider mt-3 mb-1">$1</p>')
      .replace(/^- (.+)$/gm, '<li class="ml-3 text-xs text-slate-700">• $1</li>')
      .replace(/\n\n/g, '</p><p class="mb-2">')
      .replace(/\n/g, '<br/>');

  return (
    <div className="flex flex-col h-full bg-white">

      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 bg-navy border-b border-navy-border flex-shrink-0">
        <div className="w-8 h-8 rounded-lg bg-amber flex items-center justify-center flex-shrink-0">
          <Brain className="w-4 h-4 text-navy" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-white font-bold text-sm">AI Brain</h2>
          <p className="text-slate-400 text-xxs truncate">{tenant.full_name}</p>
        </div>
        <button
          type="button"
          onClick={() => setMessages([])}
          title="Clear conversation"
          className="text-slate-500 hover:text-slate-300 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col">

        {/* Session Questions */}
        <div className="px-4 py-3 border-b border-slate-100 bg-amber/5 flex-shrink-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber" />
              <span className="text-xxs font-black text-amber uppercase tracking-wider">
                This Week&apos;s Questions
              </span>
            </div>
            <button
              type="button"
              onClick={loadSessionQuestions}
              disabled={loadingQs}
              className="text-xxs text-slate-400 hover:text-amber transition-colors flex items-center gap-1"
            >
              {loadingQs
                ? <Loader2 className="w-3 h-3 animate-spin" />
                : <RotateCcw className="w-3 h-3" />
              }
              Refresh
            </button>
          </div>
          {loadingQs ? (
            <div className="flex items-center gap-2 py-2">
              <Loader2 className="w-3.5 h-3.5 text-amber animate-spin" />
              <span className="text-xxs text-slate-400">Generating questions…</span>
            </div>
          ) : questions.length > 0 ? (
            <ol className="space-y-1.5">
              {questions.map((q, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-amber text-navy text-xxs font-black
                                   flex items-center justify-center flex-shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => sendTask(q, 'session_questions')}
                    className="text-xs text-slate-600 hover:text-navy text-left transition-colors leading-snug"
                  >
                    {q}
                  </button>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-xxs text-slate-400">No previous sessions — default questions loaded.</p>
          )}
        </div>

        {/* Quick task chips */}
        <div className="px-4 py-2 border-b border-slate-100 flex-shrink-0">
          <div className="flex flex-wrap gap-1.5">
            {QUICK_TASKS.map((qt) => (
              <button
                key={qt.label}
                type="button"
                onClick={() => sendTask(qt.task, qt.type)}
                disabled={loading}
                className="px-2.5 py-1 bg-slate-100 hover:bg-navy hover:text-white
                           text-xxs font-semibold text-slate-600 rounded-full transition-all
                           disabled:opacity-40 disabled:cursor-not-allowed border border-slate-200
                           hover:border-navy"
              >
                {qt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {messages.length === 0 && (
            <div className="text-center py-8">
              <Brain className="w-8 h-8 text-slate-200 mx-auto mb-2" />
              <p className="text-xs text-slate-400">
                Ask me anything about {tenant.full_name.split(' ')[0]}, or use a quick task above.
              </p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex flex-col gap-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              {msg.risk && msg.role === 'assistant' && (
                <div className="flex items-center gap-1.5 text-xxs text-red-500 font-bold">
                  <AlertTriangle className="w-3 h-3" />
                  Risk indicators detected
                </div>
              )}
              <div className={`max-w-[90%] rounded-xl px-3 py-2.5 text-xs leading-relaxed
                ${msg.role === 'user'
                  ? 'bg-navy text-white rounded-tr-sm'
                  : `bg-slate-50 border text-slate-800 rounded-tl-sm
                     ${msg.risk ? 'border-red-200 bg-red-50' : 'border-slate-200'}`
                }`}>
                {msg.role === 'assistant' ? (
                  <div
                    dangerouslySetInnerHTML={{ __html: renderContent(msg.content) }}
                    className="prose-sm max-w-none"
                  />
                ) : msg.content}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xxs text-slate-400">{formatTime(msg.timestamp)}</span>
                {msg.role === 'assistant' && (
                  <button
                    type="button"
                    onClick={() => copyToClipboard(msg.content, String(i))}
                    className="text-xxs text-slate-400 hover:text-navy transition-colors flex items-center gap-1"
                  >
                    {copied === String(i)
                      ? <><CheckCheck className="w-3 h-3 text-emerald-500" /> Copied</>
                      : <><Copy className="w-3 h-3" /> Copy</>
                    }
                  </button>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-start gap-2">
              <div className="bg-slate-50 border border-slate-200 rounded-xl rounded-tl-sm px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 text-amber animate-spin" />
                  <span className="text-xs text-slate-400">AI Brain thinking…</span>
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-slate-200 px-4 py-3 flex-shrink-0 bg-white">
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <MessageSquare className="absolute left-3 top-3 w-3.5 h-3.5 text-slate-400" />
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendTask(input);
                }
              }}
              placeholder="Ask the AI anything about this tenant… (Enter to send)"
              rows={2}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5
                         text-xs text-slate-800 placeholder-slate-400 resize-none
                         focus:outline-none focus:ring-2 focus:ring-amber/50 focus:border-amber
                         transition-all"
            />
          </div>
          <button
            type="button"
            onClick={() => sendTask(input)}
            disabled={!input.trim() || loading}
            className="flex-shrink-0 w-9 h-9 rounded-xl bg-amber text-navy flex items-center
                       justify-center hover:bg-amber-light transition-colors
                       disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Send className="w-4 h-4" />
            }
          </button>
        </div>
        <p className="text-xxs text-slate-400 mt-1.5 text-center">
          Claude claude-sonnet-4-6 · Responses stored in audit trail · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
