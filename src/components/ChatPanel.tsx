'use client';

import { useRef, useEffect } from 'react';
import { Send } from 'lucide-react';
import type { ChatMessage } from '@/lib/types';
import WloCardGrid from './WloCardGrid';

function MessageBubble({ msg, onBrowseCollection, onGenerateLearningPath }: {
  msg: ChatMessage;
  onBrowseCollection?: (nodeId: string, title: string) => void;
  onGenerateLearningPath?: (nodeId: string, title: string) => void;
}) {
  const isUser = msg.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-sm mr-2 flex-shrink-0 mt-1">
          🐦
        </div>
      )}
      <div className="flex flex-col gap-2 max-w-[82%]">
        {(isUser || msg.content) && (
          <div
            className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
              isUser
                ? 'bg-indigo-600 text-white rounded-br-sm'
                : 'bg-[#1a1d27] border border-[#2e3348] text-slate-200 rounded-bl-sm prose-dark'
            }`}
            dangerouslySetInnerHTML={isUser ? undefined : { __html: formatMarkdown(msg.content) }}
          >
            {isUser ? msg.content : undefined}
          </div>
        )}
        {!isUser && msg.wloCards && msg.wloCards.length > 0 && (
          <WloCardGrid
            cards={msg.wloCards}
            onBrowseCollection={onBrowseCollection}
            onGenerateLearningPath={onGenerateLearningPath}
          />
        )}
      </div>
    </div>
  );
}

/** Minimal markdown renderer (bold, code, links, lists) */
function formatMarkdown(text: string): string {
  // 1. Extract markdown links before escaping so URLs survive intact
  const LINK_PLACEHOLDER = '\x00LINK\x00';
  const links: Array<{ label: string; url: string }> = [];
  const withPlaceholders = text.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    (_, label, url) => { links.push({ label, url }); return `${LINK_PLACEHOLDER}${links.length - 1}\x00`; }
  );

  // 2. HTML-escape the rest
  let out = withPlaceholders
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // 3. Re-inject links as proper <a> tags
  out = out.replace(
    new RegExp(`${LINK_PLACEHOLDER}(\\d+)\x00`, 'g'),
    (_, idx) => {
      const { label, url } = links[Number(idx)];
      return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-indigo-400 underline decoration-dotted hover:text-indigo-300 break-all">${label}</a>`;
    }
  );

  // 4. Remaining inline formatting
  return out
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/^#{1,3} (.+)$/gm, '<strong class="text-slate-100">$1</strong>')
    .replace(/^[-*] (.+)$/gm, '• $1')
    .replace(/^(\d+)\. (.+)$/gm, '$1. $2')
    .replace(/\n/g, '<br/>');
}

function TypingDot() {
  return (
    <div className="flex justify-start">
      <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-sm mr-2 flex-shrink-0">
        🐦
      </div>
      <div className="bg-[#1a1d27] border border-[#2e3348] rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1">
        {[0, 1, 2].map(i => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-indigo-400"
            style={{ animation: `bounce 1.2s ${i * 0.2}s infinite` }}
          />
        ))}
      </div>
    </div>
  );
}

const STARTERS: { emoji: string; persona: string; pattern: string; text: string }[] = [
  { emoji: '👩\u200d🏫', persona: 'Lehrkraft',   pattern: 'PAT-04', text: 'Welche Themenseiten gibt es auf WLO zum Thema Optik?' },
  { emoji: '👩\u200d🏫', persona: 'Lehrkraft',   pattern: 'PAT-18', text: 'Ich brauche für morgen etwas zu Addition, Klasse 3 – was gibt es auf WLO?' },
  { emoji: '🎒',          persona: 'Lerner:in',  pattern: 'PAT-13', text: 'Ich verstehe Prozentrechnung nicht – gibt es auf WLO Videos die das erklären?' },
  { emoji: '👨\u200d👧',  persona: 'Elternteil', pattern: 'PAT-14', text: 'Mein Kind (3. Klasse) soll in den Ferien Englisch üben – was empfiehlst du?' },
  { emoji: '🏛️',          persona: 'Verwaltung', pattern: 'PAT-10', text: 'Wie viele Materialien gibt es auf WLO – Zahlen und Fakten für eine Präsentation' },
  { emoji: '🔬',          persona: 'Berater:in', pattern: 'PAT-15', text: 'Welche OER-Plattformen gibt es in Deutschland – Vergleich mit WLO?' },
  { emoji: '✏️',          persona: 'Redaktion',  pattern: 'PAT-09', text: 'Ich kuratiere Inhalte für WLO – welche Themenseiten gibt es zu Biologie und wo fehlen noch Inhalte?' },
  { emoji: '🧭',          persona: 'Neu hier',   pattern: 'PAT-17', text: 'Was ist WLO und was kann ich hier finden?' },
];

interface Props {
  messages: ChatMessage[];
  isLoading: boolean;
  input: string;
  onInputChange: (v: string) => void;
  onSend: (text?: string) => void;
  onBrowseCollection?: (nodeId: string, title: string) => void;
  onGenerateLearningPath?: (nodeId: string, title: string) => void;
}

export default function ChatPanel({ messages, isLoading, input, onInputChange, onSend, onBrowseCollection, onGenerateLearningPath }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4 opacity-60">
            <span className="text-6xl">🐦</span>
            <div>
              <p className="text-slate-300 font-semibold">Birdpattern</p>
              <p className="text-sm text-slate-500 mt-1">
                Persona · Signal · Kontext · Intent · State → Pattern
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-4 w-full max-w-2xl">
              {STARTERS.map(s => (
                <button
                  key={s.text}
                  onClick={() => { onInputChange(s.text); onSend(s.text); }}
                  className="text-left bg-[#1a1d27] border border-[#2e3348] rounded-lg p-3.5 hover:border-indigo-600 transition-colors group"
                >
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className="text-sm">{s.emoji}</span>
                    <span className="text-xs font-medium text-slate-500 group-hover:text-indigo-400 transition-colors">{s.persona}</span>
                    <span className="ml-auto text-[10px] font-mono text-slate-600 group-hover:text-indigo-600 transition-colors">{s.pattern}</span>
                  </div>
                  <p className="text-sm text-slate-400 group-hover:text-slate-200 transition-colors leading-snug">{s.text}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map(m => (
          <MessageBubble
            key={m.id}
            msg={m}
            onBrowseCollection={onBrowseCollection}
            onGenerateLearningPath={onGenerateLearningPath}
          />
        ))}
        {isLoading && <TypingDot />}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-[#2e3348] p-3">
        <div className="flex items-end gap-2 bg-[#1a1d27] border border-[#2e3348] rounded-xl px-3 py-2 focus-within:border-indigo-600 transition-colors">
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={e => onInputChange(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Nachricht eingeben… (Enter zum Senden)"
            disabled={isLoading}
            className="flex-1 bg-transparent resize-none outline-none text-sm text-slate-200 placeholder-slate-600 disabled:opacity-50 max-h-32 py-0.5"
            style={{ minHeight: '24px' }}
          />
          <button
            onClick={() => onSend()}
            disabled={!input.trim() || isLoading}
            className="flex-shrink-0 w-8 h-8 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
          >
            <Send className="w-3.5 h-3.5 text-white" />
          </button>
        </div>
      </div>

    </div>
  );
}
