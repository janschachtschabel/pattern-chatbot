'use client';

import { useState } from 'react';
import type { WloCard } from '@/lib/types';

const COLS = 5;
const ROWS = 2;
const PAGE_SIZE = COLS * ROWS;

interface Props {
  cards: WloCard[];
  onBrowseCollection?: (nodeId: string, title: string) => void;
  onGenerateLearningPath?: (nodeId: string, title: string) => void;
}

function Chip({ label, variant }: { label: string; variant: 'fach' | 'stufe' | 'typ' | 'license' | 'keyword' | 'sammlung' | 'inhalt' }) {
  const styles: Record<string, string> = {
    fach:     'bg-blue-950/60 text-blue-300 border-blue-800/40',
    stufe:    'bg-green-950/60 text-green-300 border-green-800/40',
    typ:      'bg-violet-950/60 text-violet-300 border-violet-800/40',
    license:  'bg-yellow-950/60 text-yellow-300 border-yellow-800/40',
    keyword:  'bg-slate-800/60 text-slate-400 border-slate-700/40',
    sammlung: 'bg-sky-950/60 text-sky-300 border-sky-800/40 font-semibold',
    inhalt:   'bg-emerald-950/60 text-emerald-300 border-emerald-800/40 font-semibold',
  };
  return (
    <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded-full border ${styles[variant]}`}>
      {label}
    </span>
  );
}

function WloCardTile({ card, onBrowseCollection, onGenerateLearningPath }: {
  card: WloCard;
  onBrowseCollection?: (nodeId: string, title: string) => void;
  onGenerateLearningPath?: (nodeId: string, title: string) => void;
}) {
  const href = card.url || card.wloUrl;
  const isCollection = card.nodeType === 'collection';

  return (
    <div className="flex flex-col bg-[#0f1117] border border-[#2e3348] rounded-xl overflow-hidden shadow hover:shadow-md hover:-translate-y-px transition-all group">
      {/* Preview image */}
      <div className="w-full h-28 bg-[#151c2a] flex items-center justify-center overflow-hidden flex-shrink-0">
        {card.previewUrl ? (
          <img
            src={card.previewUrl}
            alt={card.title}
            loading="lazy"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-3xl opacity-30">{isCollection ? '📁' : '📄'}</span>
        )}
      </div>

      {/* Card body */}
      <div className="flex-1 flex flex-col gap-1.5 p-2.5 min-w-0">
        {/* Type badge */}
        <div>
          <Chip label={isCollection ? 'Sammlung' : 'Inhalt'} variant={isCollection ? 'sammlung' : 'inhalt'} />
        </div>

        {/* Title */}
        <p className="text-[12px] font-semibold text-slate-200 leading-snug line-clamp-2 group-hover:text-white">
          {card.title}
        </p>

        {/* Description */}
        {card.description && (
          <p className="text-[11px] text-slate-500 leading-snug line-clamp-2">
            {card.description}
          </p>
        )}

        {/* Metadata chips */}
        {(card.disciplines.length > 0 || card.educationalContexts.length > 0 ||
          card.learningResourceTypes.length > 0 || card.license) && (
          <div className="flex flex-wrap gap-1 mt-0.5">
            {card.disciplines.map(d => <Chip key={d} label={d} variant="fach" />)}
            {card.educationalContexts.map(e => <Chip key={e} label={e} variant="stufe" />)}
            {card.learningResourceTypes.map(t => <Chip key={t} label={t} variant="typ" />)}
            {card.license && <Chip label={card.license} variant="license" />}
          </div>
        )}

        {/* Keywords */}
        {card.keywords.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {card.keywords.slice(0, 3).map(k => <Chip key={k} label={k} variant="keyword" />)}
          </div>
        )}

        {/* Publisher */}
        {card.publisher && (
          <p className="text-[10px] text-slate-600 truncate mt-auto">{card.publisher}</p>
        )}

        {/* Actions */}
        {isCollection && onBrowseCollection ? (
          <div className="flex gap-1.5 mt-auto pt-1.5 flex-wrap">
            <button
              onClick={e => { e.preventDefault(); onBrowseCollection(card.nodeId, card.title); }}
              className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-sky-950/70 text-sky-300 border border-sky-800/50 hover:bg-sky-900/70 transition-colors"
            >
              📋 Inhalte
            </button>
            {onGenerateLearningPath && (
              <button
                onClick={e => { e.preventDefault(); onGenerateLearningPath(card.nodeId, card.title); }}
                className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-emerald-950/70 text-emerald-300 border border-emerald-800/50 hover:bg-emerald-900/70 transition-colors"
              >
                🗺️ Lernpfad
              </button>
            )}
          </div>
        ) : href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-auto pt-1.5 text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
            onClick={e => e.stopPropagation()}
          >
            Öffnen →
          </a>
        ) : null}
      </div>
    </div>
  );
}

export default function WloCardGrid({ cards, onBrowseCollection, onGenerateLearningPath }: Props) {
  const [page, setPage] = useState(0);

  if (!cards || cards.length === 0) return null;

  const totalPages = Math.ceil(cards.length / PAGE_SIZE);
  const pageCards  = cards.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const from       = page * PAGE_SIZE + 1;
  const to         = Math.min((page + 1) * PAGE_SIZE, cards.length);

  return (
    <div className="flex flex-col gap-2 mt-2 w-full">
      {/* Grid: auto-fill up to 5 cols */}
      <div
        className="grid gap-2 w-full"
        style={{ gridTemplateColumns: `repeat(auto-fill, minmax(150px, 1fr))` }}
      >
        {pageCards.map(card => (
          <WloCardTile
            key={card.nodeId}
            card={card}
            onBrowseCollection={onBrowseCollection}
            onGenerateLearningPath={onGenerateLearningPath}
          />
        ))}
      </div>

      {/* Pagination bar — only if more than one page */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-1">
          <button
            onClick={() => setPage(p => p - 1)}
            disabled={page === 0}
            className="text-[11px] font-semibold px-3 py-1 rounded-lg bg-[#1a1d27] border border-[#2e3348] text-slate-400 hover:text-slate-200 hover:border-slate-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            ← zurück
          </button>
          <span className="text-[11px] text-slate-500">
            {from}–{to} von {cards.length}
          </span>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={page >= totalPages - 1}
            className="text-[11px] font-semibold px-3 py-1 rounded-lg bg-[#1a1d27] border border-[#2e3348] text-slate-400 hover:text-slate-200 hover:border-slate-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            weiter →
          </button>
        </div>
      )}
    </div>
  );
}
