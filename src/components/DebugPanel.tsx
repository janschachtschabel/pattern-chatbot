'use client';

import React from 'react';
import { PERSONAS, getPersona } from '@/lib/personas';
import { getIntent } from '@/lib/intents';
import { getPattern } from '@/lib/patterns';
import { getSignal, SIGNALS_BY_DIMENSION, DIM_LABELS } from '@/lib/signals';
import { getState, CONV_STATES } from '@/lib/states';
import type { DebugState, McpCall } from '@/lib/types';

// ── Helper components ─────────────────────────────────────────────────────────

function ConfBar({ value, color = 'indigo' }: { value: number; color?: string }) {
  const pct = Math.round((value ?? 0) * 100);
  const barColor = pct >= 70 ? 'bg-green-500' : pct >= 40 ? 'bg-yellow-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex-1 h-1 rounded-full bg-slate-700">
        <div className={`h-1 rounded-full ${barColor} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] text-slate-500 w-7 text-right shrink-0">{pct}%</span>
    </div>
  );
}

function Chip({ label, active = false, dim = false }: { label: string; active?: boolean; dim?: boolean }) {
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border transition-all ${
      active ? 'bg-indigo-900/60 text-indigo-300 border-indigo-600'
             : dim ? 'bg-slate-800/30 text-slate-600 border-slate-800'
             : 'bg-slate-800/60 text-slate-400 border-slate-700'
    }`}>
      {label}
    </span>
  );
}

function SectionLabel({ children, pulse }: { children: React.ReactNode; pulse?: boolean }) {
  return (
    <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-3 mb-1">
      {children}
      {pulse && <span className="ml-1 w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />}
    </div>
  );
}

function Card({ children, highlight = false }: { children: React.ReactNode; highlight?: boolean }) {
  return (
    <div className={`rounded-lg border p-2.5 space-y-1.5 ${
      highlight ? 'border-indigo-700/60 bg-indigo-950/30' : 'border-[#2a2f43] bg-[#171a24]'
    }`}>
      {children}
    </div>
  );
}

function McpCallCard({ call }: { call: McpCall }) {
  return (
    <div className="rounded border border-[#2a2f43] p-2 space-y-1 text-[10px] bg-[#0e1117]">
      <div className="flex items-center gap-1.5">
        {call.status === 'pending' && <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />}
        {call.status === 'done'    && <span className="w-1.5 h-1.5 rounded-full bg-green-400" />}
        {call.status === 'error'   && <span className="w-1.5 h-1.5 rounded-full bg-red-400" />}
        <span className="font-mono font-semibold text-teal-300">{call.tool}</span>
      </div>
      <div className="font-mono text-slate-600 break-all">{JSON.stringify(call.args)}</div>
      {call.result && (
        <div className="text-slate-500 line-clamp-2">{call.result}</div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props { state: DebugState; }

export default function DebugPanel({ state }: Props) {
  const { status, input, output, mcpCalls, signalHistory, stateHistory, contentContext } = state;
  const isActive = status !== 'idle' && status !== 'done' && status !== 'error';

  const persona = input ? getPersona(input.persona.id) : null;
  const intentConfig = input ? getIntent(input.intent.id) : null;
  const patternConfig = output ? getPattern(output.pattern.id) : null;
  const stateConfig = input ? getState(input.state.id) : null;

  const statusLabel =
    status === 'classifying' ? 'Input klassifiziere…' :
    status === 'selecting'   ? 'Output wähle…' :
    status === 'executing'   ? 'Tools ausführen…' :
    status === 'generating'  ? 'Antwort generiere…' : '…';

  return (
    <div className="flex flex-col h-full overflow-y-auto text-slate-300 p-3 space-y-1">

      {/* ── Header ───────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-xs font-bold text-slate-300 tracking-wide">MUSTER-ANALYSE</h2>
        {isActive && (
          <span className="flex items-center gap-1 text-[10px] text-indigo-400">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
            {statusLabel}
          </span>
        )}
        {status === 'done' && (
          <span className="text-[10px] text-green-500">✓ fertig</span>
        )}
      </div>

      {/* ════════════ INPUT ════════════════════════════════════════════ */}
      <div className="rounded-xl border border-blue-900/60 bg-blue-950/20 p-2.5 space-y-2">
        <div className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">INPUT</div>

        {/* 1. Persona */}
        <SectionLabel pulse={status === 'classifying'}>🎭 Persona</SectionLabel>
        {!input ? (
          <p className="text-[10px] text-slate-600 italic">Erkennung läuft…</p>
        ) : (
          <Card highlight={!!input}>
            <div className="flex items-center gap-2">
              <span className="text-lg">{persona?.emoji ?? '❓'}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-200 truncate">
                  {persona?.label ?? input.persona.id}
                  <span className="ml-1 text-[10px] font-normal text-slate-500">{input.persona.id}</span>
                </p>
                <ConfBar value={input.persona.confidence} />
              </div>
            </div>
            {input.persona.reasoning && (
              <p className="text-[10px] text-slate-500 italic border-t border-[#2a2f43] pt-1">
                {input.persona.reasoning}
              </p>
            )}
          </Card>
        )}

        {/* Persona map */}
        <div className="grid grid-cols-4 gap-0.5">
          {PERSONAS.map(p => (
            <div key={p.id} title={p.label}
              className={`flex flex-col items-center p-1 rounded text-center text-[9px] transition-all ${
                input?.persona.id === p.id
                  ? 'bg-blue-900/50 border border-blue-600 text-blue-200'
                  : 'opacity-25 border border-transparent'
              }`}
            >
              <span className="text-sm">{p.emoji}</span>
              <span className="leading-tight text-slate-400 truncate w-full text-center">{p.id.replace('P-','')}</span>
            </div>
          ))}
        </div>

        {/* 2. Signale */}
        <SectionLabel pulse={status === 'classifying'}>⚡ Situative Signale</SectionLabel>
        {!input?.signals.active.length ? (
          <p className="text-[10px] text-slate-600 italic">Keine Signale…</p>
        ) : (
          <Card>
            {input.signals.dominant && (
              <div className="flex items-center gap-1 mb-1">
                <span className="text-[10px] text-slate-500">Dominant:</span>
                <span className="text-[10px] font-semibold text-amber-300">
                  {getSignal(input.signals.dominant)?.emoji} {input.signals.dominant}
                </span>
              </div>
            )}
            <div className="grid grid-cols-2 gap-x-3 gap-y-1">
              {([1,2,3,4] as const).map(d => {
                const dimSignals = input.signals.byDimension[
                  d === 1 ? 'd1_time' : d === 2 ? 'd2_competence' : d === 3 ? 'd3_attitude' : 'd4_context'
                ];
                const allInDim = SIGNALS_BY_DIMENSION[d] ?? [];
                if (!allInDim.length) return null;
                return (
                  <div key={d}>
                    <p className="text-[9px] text-slate-600 mb-0.5">{DIM_LABELS[d]}</p>
                    <div className="flex flex-wrap gap-0.5">
                      {allInDim.map(s => (
                        <Chip key={s.id} label={`${s.emoji}${s.id}`}
                          active={dimSignals.includes(s.id)}
                          dim={!dimSignals.includes(s.id)}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}
        {signalHistory.length > 0 && (
          <div className="text-[9px] text-slate-600 flex gap-1 flex-wrap">
            <span className="text-slate-700">Verlauf:</span>
            {signalHistory.map(id => (
              <span key={id} className="text-slate-600">{getSignal(id)?.emoji}{id}</span>
            ))}
          </div>
        )}

        {/* 3. Kontext */}
        <SectionLabel>📍 Kontext</SectionLabel>
        <Card>
          <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px]">
            <div><span className="text-slate-600">Seite:</span> <span className="text-slate-300">{input?.context.page ?? '–'}</span></div>
            <div><span className="text-slate-600">Session:</span> <span className="text-slate-300">{input?.context.session ?? '–'}</span></div>
            {(input?.context.fach || contentContext?.fach) && (
              <div><span className="text-slate-600">Fach:</span> <span className="text-amber-300">{input?.context.fach ?? contentContext?.fach}</span></div>
            )}
            {(input?.context.klasse || contentContext?.klasse) && (
              <div><span className="text-slate-600">Klasse:</span> <span className="text-amber-300">{input?.context.klasse ?? contentContext?.klasse}</span></div>
            )}
            {(input?.context.thema || contentContext?.thema) && (
              <div className="col-span-2"><span className="text-slate-600">Thema:</span> <span className="text-amber-300">{input?.context.thema ?? contentContext?.thema}</span></div>
            )}
          </div>
          {(input?.context.preconditions_met?.length ?? 0) > 0 && (
            <div className="mt-1 flex flex-wrap gap-0.5">
              {input!.context.preconditions_met.map(p => (
                <span key={p} className="text-[9px] text-green-400 bg-green-950/30 border border-green-900 rounded px-1">✓ {p}</span>
              ))}
            </div>
          )}
          {(input?.context.preconditions_missing?.length ?? 0) > 0 && (
            <div className="mt-0.5 flex flex-wrap gap-0.5">
              {input!.context.preconditions_missing.map(p => (
                <span key={p} className="text-[9px] text-red-400 bg-red-950/30 border border-red-900 rounded px-1">✗ {p}</span>
              ))}
            </div>
          )}
        </Card>

        {/* 4. Intent */}
        <SectionLabel pulse={status === 'classifying'}>🎯 Intent</SectionLabel>
        {!input ? (
          <p className="text-[10px] text-slate-600 italic">Erkennung läuft…</p>
        ) : (
          <Card>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-semibold text-slate-200">{intentConfig?.label ?? input.intent.id}</p>
                <p className="text-[10px] text-slate-500">{input.intent.id}</p>
              </div>
              <ConfBar value={input.intent.confidence} />
            </div>
            {input.intent.degradation_active && (
              <div className="text-[10px] text-orange-400 bg-orange-950/30 border border-orange-900 rounded px-1.5 py-0.5">
                ⚠ Degradation: {input.intent.degradation_reason ?? 'Preconditions fehlen'}
              </div>
            )}
            {intentConfig?.description && (
              <p className="text-[10px] text-slate-500 border-t border-[#2a2f43] pt-1">{intentConfig.description}</p>
            )}
          </Card>
        )}

        {/* 5. State */}
        <SectionLabel pulse={status === 'classifying'}>🗺 Gesprächs-State</SectionLabel>
        {/* State grid: 11 states in 3 clusters */}
        <div className="space-y-1">
          {(['A','B','C'] as const).map(cluster => {
            const clusterStates = CONV_STATES.filter(s => s.cluster === cluster);
            const clusterLabel = clusterStates[0]?.clusterLabel ?? cluster;
            return (
              <div key={cluster}>
                <p className="text-[9px] text-slate-700 mb-0.5">{cluster}: {clusterLabel}</p>
                <div className="flex gap-0.5 flex-wrap">
                  {clusterStates.map(s => {
                    const isCurrent = input?.state.id === s.id;
                    const wasVisited = stateHistory.includes(s.id);
                    return (
                      <div key={s.id} title={`${s.label}: ${s.description}`}
                        className={`flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] border transition-all cursor-default ${
                          isCurrent  ? 'bg-indigo-900/60 border-indigo-500 text-indigo-200 ring-1 ring-indigo-500'
                          : wasVisited ? 'bg-slate-800 border-slate-600 text-slate-400'
                          : 'opacity-20 border-transparent'
                        }`}
                      >
                        <span>{s.emoji}</span>
                        <span>{s.id.replace('state-','')}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
        {input?.state && (
          <Card highlight>
            <p className="text-xs font-semibold text-slate-200">
              {stateConfig?.emoji} {stateConfig?.label ?? input.state.id}
            </p>
            <p className="text-[10px] text-slate-500">{stateConfig?.botFocus}</p>
            {input.state.reasoning && (
              <p className="text-[10px] text-slate-500 italic border-t border-[#2a2f43] pt-1">{input.state.reasoning}</p>
            )}
          </Card>
        )}
      </div>

      {/* ════════════ OUTPUT ══════════════════════════════════════════ */}
      <div className="rounded-xl border border-emerald-900/60 bg-emerald-950/20 p-2.5 space-y-2">
        <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">OUTPUT</div>

        {/* Pattern */}
        <SectionLabel pulse={status === 'selecting'}>📐 Behavior-Pattern</SectionLabel>
        {!output ? (
          <p className="text-[10px] text-slate-600 italic">Auswahl läuft…</p>
        ) : (
          <Card highlight>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950 px-1.5 py-0.5 rounded">{output.pattern.id}</span>
              <span className="text-xs font-semibold text-slate-200">{patternConfig?.label ?? output.pattern.label}</span>
            </div>
            {patternConfig?.coreRule && (
              <p className="text-[10px] text-slate-400">{patternConfig.coreRule}</p>
            )}
            {output.pattern.style_notes && (
              <p className="text-[10px] text-emerald-300/70 italic border-t border-[#2a2f43] pt-1">{output.pattern.style_notes}</p>
            )}
          </Card>
        )}

        {/* Content */}
        <SectionLabel>📄 Inhalt</SectionLabel>
        {!output ? (
          <p className="text-[10px] text-slate-600 italic">–</p>
        ) : (
          <Card>
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-slate-400">{output.content.type}</span>
              <span className="text-slate-500">max. {output.content.max_results}</span>
            </div>
            {output.content.degradation_active && (
              <span className="text-[9px] text-orange-400">⚠ Degradation aktiv</span>
            )}
          </Card>
        )}

        {/* Tools */}
        <SectionLabel pulse={status === 'executing'}>🔌 Tools</SectionLabel>
        {!output?.tools.length ? (
          <p className="text-[10px] text-slate-600 italic">Keine Tool-Aufrufe geplant</p>
        ) : (
          <div className="flex flex-wrap gap-1">
            {output.tools.map((t, i) => (
              <span key={i} className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] border font-mono ${
                t.status === 'done'    ? 'bg-teal-950/40 border-teal-700 text-teal-300'
                : t.status === 'error' ? 'bg-red-950/40 border-red-700 text-red-300'
                : t.status === 'skipped' ? 'opacity-40 border-slate-700 text-slate-500'
                : 'bg-slate-800 border-slate-700 text-slate-400 animate-pulse'
              }`}>
                {t.status === 'done' && '✓ '}{t.status === 'error' && '✗ '}
                {t.name}
              </span>
            ))}
          </div>
        )}

        {/* MCP calls */}
        {mcpCalls.length > 0 && (
          <>
            <SectionLabel pulse={status === 'executing'}>🔁 MCP-Aufrufe</SectionLabel>
            <div className="space-y-1.5">
              {mcpCalls.map(call => <McpCallCard key={call.id} call={call} />)}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
