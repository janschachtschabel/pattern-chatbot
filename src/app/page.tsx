'use client';

import { useState, useCallback, useRef } from 'react';
import ChatPanel from '@/components/ChatPanel';
import DebugPanel from '@/components/DebugPanel';
import type { ChatMessage, DebugState, StreamEvent } from '@/lib/types';

let _msgId = 0;
const uid = () => `m${++_msgId}`;

const EMPTY_DEBUG: DebugState = {
  status: 'idle',
  mcpCalls: [],
  signalHistory: [],
  stateHistory: [],
  contentContext: {},
};

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [debug, setDebug] = useState<DebugState>(EMPTY_DEBUG);
  const historyRef       = useRef<Array<{ role: 'user' | 'assistant'; content: string }>>([]); 
  const currentStateIdRef = useRef<string>('state-1');
  const currentPersonaRef = useRef<string>('P-AND');
  const signalHistoryRef  = useRef<string[]>([]);
  const contentContextRef = useRef<Record<string, string>>({});
  const turnCountRef      = useRef<number>(0);

  const send = useCallback(async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || isLoading) return;
    setInput('');

    const userMsg: ChatMessage = { id: uid(), role: 'user', content: msg, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);

    turnCountRef.current += 1;
    const history = [...historyRef.current, { role: 'user' as const, content: msg }];

    // Reset debug for new turn — preserve cross-turn history, keep last input/output visible
    setDebug(prev => ({
      status: 'classifying',
      mcpCalls: [],
      signalHistory: prev.signalHistory,
      stateHistory: prev.stateHistory,
      contentContext: prev.contentContext,
      input: prev.input,
      output: prev.output,
    }));
    setIsLoading(true);

    const botId = uid();
    setMessages(prev => [...prev, { id: botId, role: 'assistant', content: '', timestamp: Date.now() }]);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: msg,
          history: historyRef.current,
          currentStateId:   currentStateIdRef.current,
          currentPersonaId: currentPersonaRef.current,
          signalHistory:    signalHistoryRef.current,
          contentContext:   contentContextRef.current,
          turnNumber:       turnCountRef.current,
        }),
      });

      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let botContent = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const event = JSON.parse(line) as StreamEvent;

            if (event.type === 'debug') {
              if (event.step === 'input') {
                // Accumulate signals, state, content context across turns
                const newSignals = event.data.signals.active ?? [];
                const newStateId = event.data.state.id ?? 'state-1';
                const newPersona = event.data.persona.id ?? 'P-AND';
                signalHistoryRef.current = [...new Set([...signalHistoryRef.current, ...newSignals])];
                currentStateIdRef.current = newStateId;
                currentPersonaRef.current = newPersona;
                // Merge content context
                const ctx = event.data.context;
                if (ctx.fach)    contentContextRef.current.fach    = ctx.fach;
                if (ctx.thema)   contentContextRef.current.thema   = ctx.thema;
                if (ctx.klasse)  contentContextRef.current.klasse  = ctx.klasse;
                if (ctx.node_id) contentContextRef.current.node_id = ctx.node_id;

                setDebug(prev => ({
                  ...prev,
                  status: 'selecting',
                  input: event.data,
                  signalHistory: signalHistoryRef.current,
                  stateHistory: prev.stateHistory.includes(newStateId)
                    ? prev.stateHistory
                    : [...prev.stateHistory, newStateId],
                  contentContext: { ...contentContextRef.current },
                }));
              } else if (event.step === 'output') {
                setDebug(prev => ({
                  ...prev,
                  status: 'executing',
                  output: event.data,
                }));
              } else if (event.step === 'mcp_call') {
                setDebug(prev => ({
                  ...prev,
                  status: 'executing',
                  mcpCalls: [
                    ...prev.mcpCalls,
                    { id: event.data.id, tool: event.data.tool, args: event.data.args, status: 'pending' },
                  ],
                }));
              } else if (event.step === 'mcp_result') {
                setDebug(prev => ({
                  ...prev,
                  mcpCalls: prev.mcpCalls.map(c =>
                    c.id === event.data.id ? { ...c, status: 'done', result: event.data.result } : c
                  ),
                }));
              } else if (event.step === 'mcp_error') {
                setDebug(prev => ({
                  ...prev,
                  mcpCalls: prev.mcpCalls.map(c =>
                    c.id === event.data.id ? { ...c, status: 'error', result: event.data.error } : c
                  ),
                }));
              }
            }

            if (event.type === 'content') {
              botContent += event.delta;
              setMessages(prev =>
                prev.map(m => m.id === botId ? { ...m, content: botContent } : m)
              );
              setDebug(prev => ({ ...prev, status: 'generating' }));
            }

            if (event.type === 'cards') {
              // Track last shown collection so LLM can reference it next turn
              const collectionCards = event.data.filter(c => c.nodeType === 'collection');
              if (collectionCards.length > 0) {
                contentContextRef.current.last_collection_id    = collectionCards[0].nodeId;
                contentContextRef.current.last_collection_title = collectionCards[0].title;
              }
              setMessages(prev =>
                prev.map(m => m.id === botId ? { ...m, wloCards: event.data } : m)
              );
              setDebug(prev => ({ ...prev, contentContext: { ...contentContextRef.current } }));
            }

            if (event.type === 'done') {
              setDebug(prev => ({ ...prev, status: 'done' }));
            }

            if (event.type === 'error') {
              setMessages(prev =>
                prev.map(m => m.id === botId ? { ...m, content: `❌ ${event.message}` } : m)
              );
              setDebug(prev => ({ ...prev, status: 'error', error: event.message }));
            }
          } catch { /* malformed line – skip */ }
        }
      }

      // Update history
      historyRef.current = [
        ...history,
        { role: 'assistant' as const, content: botContent },
      ].slice(-20); // keep last 20 messages

    } catch (e: unknown) {
      const msg2 = e instanceof Error ? e.message : String(e);
      setMessages(prev =>
        prev.map(m => m.id === botId ? { ...m, content: `❌ Fehler: ${msg2}` } : m)
      );
      setDebug(prev => ({ ...prev, status: 'error', mcpCalls: prev.mcpCalls, error: msg2 }));
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading]);

  const handleBrowseCollection = useCallback(async (nodeId: string, title: string) => {
    const botId = uid();
    setMessages(prev => [...prev, {
      id: botId, role: 'assistant',
      content: `Lade Inhalte von „${title}" …`,
      timestamp: Date.now(),
    }]);
    setIsLoading(true);
    try {
      const res  = await fetch('/api/collection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodeId, skip: 0 }),
      });
      const data = await res.json() as { cards: import('@/lib/types').WloCard[]; total: number; error?: string };
      if (!res.ok || data.error) throw new Error(data.error ?? `HTTP ${res.status}`);
      setMessages(prev => prev.map(m => m.id === botId ? {
        ...m,
        content: data.cards.length > 0
          ? `**${title}** – ${data.total} Inhalt${data.total !== 1 ? 'e' : ''} gefunden:`
          : `Keine Inhalte in „${title}" gefunden.`,
        wloCards: data.cards.length > 0 ? data.cards : undefined,
      } : m));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setMessages(prev => prev.map(m => m.id === botId
        ? { ...m, content: `❌ Fehler beim Laden von „${title}": ${msg}` } : m));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleGenerateLearningPath = useCallback(async (nodeId: string, title: string) => {
    const botId = uid();
    setMessages(prev => [...prev, {
      id: botId, role: 'assistant',
      content: `🗺️ Erstelle Lernpfad für „${title}" …`,
      timestamp: Date.now(),
    }]);
    setIsLoading(true);

    try {
      const res = await fetch('/api/learning-path', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodeId, title }),
      });

      if (!res.ok) {
        const err = await res.json() as { error?: string };
        throw new Error(err.error ?? `HTTP ${res.status}`);
      }

      const reader  = res.body!.getReader();
      const decoder = new TextDecoder();
      let   botText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of decoder.decode(value).split('\n')) {
          if (!line.startsWith('data: ')) continue;
          try {
            const event = JSON.parse(line.slice(6)) as import('@/lib/types').StreamEvent;
            if (event.type === 'cards') {
              setMessages(prev => prev.map(m =>
                m.id === botId ? { ...m, wloCards: event.data } : m));
            }
            if (event.type === 'content') {
              botText += event.delta;
              setMessages(prev => prev.map(m =>
                m.id === botId ? { ...m, content: botText } : m));
            }
            if (event.type === 'error') throw new Error(event.message);
          } catch { /* malformed line – skip */ }
        }
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setMessages(prev => prev.map(m =>
        m.id === botId ? { ...m, content: `❌ Fehler beim Lernpfad für „${title}": ${msg}` } : m));
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <div className="flex flex-col h-screen bg-[#0f1117]">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-[#2e3348] flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <span className="text-2xl">🐦</span>
          <div>
            <h1 className="text-sm font-bold text-slate-200">Birdpattern</h1>
            <p className="text-[11px] text-slate-500">Persona · Signal · Kontext · Intent · State → Pattern</p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-slate-500">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
            gpt-4.1-mini
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
            WLO MCP
          </span>
          <button
            onClick={() => {
              setMessages([]);
              historyRef.current = [];
              currentStateIdRef.current = 'state-1';
              currentPersonaRef.current = 'P-AND';
              signalHistoryRef.current = [];
              contentContextRef.current = {};
              setDebug(EMPTY_DEBUG);
            }}
            className="px-2.5 py-1 rounded-md border border-[#2e3348] text-slate-400 hover:text-slate-200 hover:border-slate-500 transition-colors"
          >
            Neues Gespräch
          </button>
        </div>
      </header>

      {/* Main layout: Chat | Debug */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat – 60% */}
        <div className="flex-1 flex flex-col overflow-hidden border-r border-[#2e3348]">
          <ChatPanel
            messages={messages}
            isLoading={isLoading}
            input={input}
            onInputChange={setInput}
            onSend={send}
            onBrowseCollection={handleBrowseCollection}
            onGenerateLearningPath={handleGenerateLearningPath}
          />
        </div>

        {/* Debug panel – 40% */}
        <div className="w-[380px] flex-shrink-0 bg-[#0f1117] overflow-hidden">
          <DebugPanel state={debug} />
        </div>
      </div>
    </div>
  );
}
