import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';
import { PERSONAS, PERSONA_IDS, PERSONA_MD_FILES } from '@/lib/personas';
import { INTENTS, INTENT_IDS } from '@/lib/intents';
import { PATTERNS, PATTERN_IDS, scorePatternsForContext } from '@/lib/patterns';
import { SIGNALS, SIGNAL_IDS } from '@/lib/signals';
import { CONV_STATES, STATE_IDS } from '@/lib/states';
import { callMcp } from '@/lib/mcp';
import { parseWloCards } from '@/lib/parseWloCards';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ── Load persona markdown files ───────────────────────────────────────────────

function loadPersonaMd(personaId: string): string {
  try {
    const rel = PERSONA_MD_FILES[personaId];
    if (!rel) return '';
    const fullPath = path.join(process.cwd(), 'public', rel);
    return fs.readFileSync(fullPath, 'utf-8');
  } catch {
    return '';
  }
}


const CARD_TOOLS: Record<string, 'collection' | 'content'> = {
  search_wlo_collections:  'collection',
  search_wlo_content:      'content',
  get_collection_contents: 'content',
};

// ── Pre-computed tool description strings ─────────────────────────────────────

const personaDesc = PERSONAS.map(p =>
  `${p.id} (${p.label} — ${p.shortDesc}): Erkennungsmerkmale: ${p.detectionHints.slice(0, 6).join(', ')}`
).join(' || ');
const intentDesc  = INTENTS.map(i =>
  `${i.id} (${i.label} — ${i.description}; Hauptpersonas: ${i.mainPersonas.join(',')})`
).join(' | ');
const signalDesc  = SIGNALS.map(s =>
  `${s.id} [${s.dimensionLabel}]: ${s.detectionHints.slice(0, 2).join(', ')}`
).join(' | ');
const stateDesc   = CONV_STATES.map(s =>
  `${s.id} (${s.label} — ${s.description}; Personas: ${s.mainPersonas.join(',')})`
).join(' | ');
const patternDesc = PATTERNS.map(p => `${p.id}: ${p.label} — ${p.coreRule}`).join(' | ');

// ── Tool definitions ──────────────────────────────────────────────────────────

const TOOLS: OpenAI.ChatCompletionTool[] = [
  // Phase 1: Input classification
  {
    type: 'function',
    function: {
      name: 'classify_input',
      description:
        `Analysiert die aktuelle Nutzeranfrage IM KONTEXT des gesamten Gesprächsverlaufs (alle vorherigen Turns beachten). ` +
        `Der bisherige State steht im System-Prompt — NUR wechseln wenn das Gespräch sich klar weiterentwickelt hat. ` +
        `Personas: ${personaDesc}. ` +
        `Signale (4 Dimensionen): ${signalDesc}. ` +
        `Intents: ${intentDesc}. ` +
        `States: ${stateDesc}.`,
      parameters: {
        type: 'object',
        properties: {
          persona_id:          { type: 'string', enum: [...PERSONA_IDS, 'P-AND'], description: 'Erkannte Persona-ID. REGEL: Bei Suchanfragen nach Themenseiten/Sammlungen/Materialien/Inhalten (INT-W-03a/b/c) NIEMALS P-AND — Default ist P-LK (Lehrende suchen am h\u00e4ufigsten), nur P-SL wenn Lernperspektive erkennbar ("ich verstehe nicht", "erkl\u00e4r mir"), P-ELT wenn Eltern-Kontext ("mein Kind"). P-AND nur bei echten Meta-Fragen (Was ist WLO? Wer steckt dahinter?).' },
          persona_label:       { type: 'string', description: 'Label der Persona' },
          persona_confidence:  { type: 'number', description: 'Konfidenz 0–1' },
          persona_reasoning:   { type: 'string', description: 'Begründung für Persona (1 Satz)' },
          signals_active:      { type: 'array', items: { type: 'string', enum: SIGNAL_IDS }, description: 'Aktuell aktive Signale' },
          signals_dominant:    { type: 'string', description: 'Dominantes Signal (stärkstes)' },
          signals_d1_time:     { type: 'array', items: { type: 'string' }, description: 'Zeit & Druck Signale' },
          signals_d2_comp:     { type: 'array', items: { type: 'string' }, description: 'Sicherheit & Kompetenz Signale' },
          signals_d3_att:      { type: 'array', items: { type: 'string' }, description: 'Haltung & Motivation Signale' },
          signals_d4_ctx:      { type: 'array', items: { type: 'string' }, description: 'Kontext & Nutzung Signale' },
          context_page:        { type: 'string', enum: ['startseite','suche','materialseite','themenseite','statistik','unbekannt','extern'], description: 'Seiten-Kontext' },
          context_session:     { type: 'string', enum: ['new','returning'], description: 'Session-Typ' },
          context_fach:        { type: 'string', description: 'Fach falls bekannt' },
          context_thema:       { type: 'string', description: 'Thema falls bekannt' },
          context_klasse:      { type: 'string', description: 'Klassenstufe falls bekannt' },
          context_node_id:     { type: 'string', description: 'Node-ID falls bekannt' },
          preconditions_met:   { type: 'array', items: { type: 'string' }, description: 'Erfüllte Preconditions' },
          preconditions_missing: { type: 'array', items: { type: 'string' }, description: 'Fehlende Preconditions' },
          intent_id:           { type: 'string', enum: INTENT_IDS, description: 'Primärer Intent' },
          intent_label:        { type: 'string', description: 'Label des Intent' },
          intent_confidence:   { type: 'number', description: 'Konfidenz 0–1' },
          intent_degradation:  { type: 'boolean', description: 'Degradation aktiv wegen fehlender Preconditions?' },
          intent_degradation_reason: { type: 'string', description: 'Grund für Degradation' },
          state_id:            { type: 'string', enum: STATE_IDS, description: 'Gesprächs-State. ZWINGEND: Intent→State Matrix beachten: INT-W-01→state-3, INT-W-02→state-2, INT-W-03a→state-4, INT-W-03b→state-5, INT-W-03c→state-5, INT-W-04→state-9, INT-W-05→state-10, INT-W-06→state-3, INT-W-07→state-6, INT-W-08→state-9, INT-W-09→state-3. state-1 NUR bei Turn 1 ohne erkennbaren Intent. NIEMALS zurück zu state-1 wenn Intent erkannt.' },
          state_label:         { type: 'string', description: 'Label des State' },
          state_cluster:       { type: 'string', enum: ['A','B','C'], description: 'Cluster des State' },
          state_reasoning:     { type: 'string', description: 'Begründung für State (1 Satz)' },
        },
        required: ['persona_id','persona_confidence','signals_active','context_page','context_session','preconditions_met','preconditions_missing','intent_id','intent_confidence','intent_degradation','state_id','state_cluster'],
      },
    },
  },
  // Phase 2: Output selection
  {
    type: 'function',
    function: {
      name: 'select_output',
      description:
        `Wählt die 3 Output-Elemente (Pattern, Inhalt, Tools) basierend auf der Klassifikation. ` +
        `Pattern: ${patternDesc}`,
      parameters: {
        type: 'object',
        properties: {
          pattern_id:        { type: 'string', enum: PATTERN_IDS, description: 'Ausgewähltes Behavior-Pattern' },
          pattern_label:     { type: 'string', description: 'Label des Pattern' },
          style_notes:       { type: 'string', description: 'Konkrete Stil-Anweisungen für diese Situation (2–3 Sätze)' },
          content_type:      { type: 'string', description: 'Art des Inhalts: Materiallisten | Themenseiten | Fakten | Erklärungen | Routing | Feedback-Prompt' },
          content_max:       { type: 'number', description: 'Max. Anzahl Treffer (1–5)' },
          content_degradation: { type: 'boolean', description: 'Degradation aktiv?' },
          tools_to_use:      { type: 'array', items: { type: 'string' }, description: 'MCP-Tools in Reihenfolge. SUCHSTRATEGIE (ZWINGEND): Bei jeder Materialsuche (INT-W-03a/b/c) IMMER zuerst [search_wlo_collections] — search_wlo_content NUR wenn Nutzer explizit Einzelmaterialien will ODER search_wlo_collections 0 Treffer liefert. Nie beide beim ersten Turn!' },
          tools_reasoning:   { type: 'string', description: 'Warum diese Tools' },
        },
        required: ['pattern_id','style_notes','content_type','content_max','content_degradation','tools_to_use'],
      },
    },
  },
  // MCP tools
  { type: 'function', function: { name: 'search_wlo_collections', description: 'Sucht Themenseiten/Sammlungen (WLO MCP)', parameters: { type: 'object', properties: { query: { type: 'string' }, educationLevel: { type: 'string' } }, required: ['query'] } } },
  { type: 'function', function: { name: 'search_wlo_content',     description: 'Sucht konkrete Bildungsmaterialien (WLO MCP)', parameters: { type: 'object', properties: { query: { type: 'string' }, educationLevel: { type: 'string' } }, required: ['query'] } } },
  { type: 'function', function: { name: 'get_collection_contents', description: 'Inhalte einer Sammlung abrufen (WLO MCP)', parameters: { type: 'object', properties: { collectionId: { type: 'string' }, skipCount: { type: 'number' } }, required: ['collectionId'] } } },
  { type: 'function', function: { name: 'get_node_details',        description: 'Detailmetadaten für eine Node-ID (WLO MCP)', parameters: { type: 'object', properties: { nodeId: { type: 'string' } }, required: ['nodeId'] } } },
  { type: 'function', function: { name: 'get_wirlernenonline_info',    description: 'Infos von WLO-Projektwebseite (WLO MCP)', parameters: { type: 'object', properties: { query: { type: 'string' } }, required: [] } } },
  { type: 'function', function: { name: 'get_edu_sharing_network_info', description: 'Infos edu-sharing-network.org (WLO MCP)', parameters: { type: 'object', properties: { query: { type: 'string' } }, required: [] } } },
  { type: 'function', function: { name: 'get_edu_sharing_product_info', description: 'Infos edu-sharing.com Produkt (WLO MCP)',  parameters: { type: 'object', properties: { query: { type: 'string' } }, required: [] } } },
  { type: 'function', function: { name: 'get_metaventis_info',    description: 'Infos metaventis.com (WLO MCP)', parameters: { type: 'object', properties: { query: { type: 'string' } }, required: [] } } },
  { type: 'function', function: { name: 'lookup_wlo_vocabulary',  description: 'Gültige Filterwerte: Bildungsstufe, Fach, Ressourcentyp (WLO MCP)', parameters: { type: 'object', properties: { field: { type: 'string' } }, required: [] } } },
];

// ── System prompt ─────────────────────────────────────────────────────────────

function buildSystemPrompt(
  currentStateId: string,
  signalHistory: string[],
  contentContext: Record<string, string>,
  personaId: string,
  turnNumber: number = 1
): string {
  const stateConfig = CONV_STATES.find(s => s.id === currentStateId);
  const personaMd = loadPersonaMd(personaId);
  const personaSnippet = personaMd
    ? `\n## Aktive Persona-Datei (${personaId})\n${personaMd.slice(0, 600)}\n`
    : '';

  const signalHints = signalHistory.length
    ? signalHistory
        .map(id => SIGNALS.find(s => s.id === id))
        .filter(Boolean)
        .map(s => `- ${s!.emoji} ${s!.label}: ${s!.botImplication}`)
        .join('\n')
    : '(noch keine Signale erfasst)';

  const ctxEntries = Object.entries(contentContext)
    .filter(([, v]) => v)
    .map(([k, v]) => `- ${k}: ${v}`)
    .join('\n');

  return `Du bist WLO-Bot, intelligenter Assistent für WirLernenOnline.de — Deutschlands OER-Plattform.

## Pflicht-Ablauf (IMMER in dieser Reihenfolge)
1. \`classify_input\` — Erkenne alle 5 Input-Dimensionen im KONTEXT des Gesprächsverlaufs.
2. \`select_output\` — Wähle Pattern + Inhalt-Typ + MCP-Tools.
3. MCP-Tools ausführen (falls select_output.tools_to_use nicht leer).
4. Antwort generieren gemäß Pattern, Persona-Tonalität und State-Fokus.

## Bisheriger Gesprächs-State: ${currentStateId} — ${stateConfig?.label ?? ''}
${stateConfig ? `Ziel: ${stateConfig.goal}\nBot-Fokus: ${stateConfig.botFocus}` : ''}

## State-Transitions-Regel (WICHTIG für classify_input)
- Aktueller Turn: **${turnNumber}** — ${turnNumber === 1 ? 'Erster Turn, state-1 ist OK' : `Turn ${turnNumber} — state-1 NUR wenn Nutzer wirklich keine Absicht zeigt`}
- Baseline: state_id = **${currentStateId}** (nie ohne Grund zurück auf state-1)
- NIEMALS auf state-1 zurück, außer Nutzer sagt explizit "nochmal von vorne" oder ähnliches
- Intent→State Matrix (für classify_input zwingend beachten):
  · INT-W-01 (WLO kennenlernen) → state-3
  · INT-W-02 (Soft Probing) → state-2
  · INT-W-03a (Themenseite entdecken) → state-4
  · INT-W-03b (Unterrichtsmaterial suchen, Fach+Klasse bekannt) → state-5
  · INT-W-03c (Lerninhalt suchen, Thema bekannt) → state-5
  · INT-W-04 (Feedback) → state-9
  · INT-W-05 (Routing Redaktion) → state-10
  · INT-W-06 (Faktenfragen) → state-3
  · INT-W-07 (Material herunterladen) → state-5 oder state-6
  · INT-W-08 (Evaluieren) → state-9
  · INT-W-09 (Reporting) → state-3
- Nachdem Suchergebnisse präsentiert wurden → state-6 oder state-8 (wenn Lerner)
- Wenn Nutzer weiter verfeinert/fragt → state-7

## Signale bisher im Gespräch
${signalHints}

## Bekannter Inhalts-Kontext
${ctxEntries || '(noch nichts bekannt)'}

## Sammlungs-Regel (WICHTIG für get_collection_contents)
- Wenn Nutzer Inhalte einer Sammlung abrufen will die zuvor gefunden wurde:
  1. Suche im Gesprächsverlauf nach der zuletzt verwendeten Collection-ID/Node-ID
  2. Falls keine ID bekannt → erst search_wlo_collections mit dem Sammlungsnamen aufrufen
  3. Dann get_collection_contents mit der gefundenen ID aufrufen
- NIEMALS "ID nicht bekannt" als Fehler zurückgeben — immer erst neu suchen!
${personaSnippet}
## Guardrails (unveränderlich)
- Nie blockieren — fehlt Precondition → Degradation, nie gar nicht antworten
- Soft Probing: max. 1 Frage pro Turn
- Max. 5 Treffer bei Suchergebnissen
- Keine Inhalte erfinden — nur was MCP zurückgibt
- Links als Markdown [Text](URL) formatieren
- Antwort auf Deutsch
- Kein Suche-Angebot bei Persona P-VER, P-RED (außer Intent erlaubt es)

## Suchstrategie (ZWINGEND für alle Materialsuchen)
1. **Erster Turn mit Materialanfrage:** NUR search_wlo_collections → Themenseiten/Sammlungen als Einstieg
2. **Wenn Nutzer auf Sammlung klickt ("Inhalte"):** Wird automatisch per UI geladen — KEIN weiteres MCP nötig
3. **search_wlo_content NUR wenn:**
   a. Nutzer fragt explizit nach Einzelmaterialien/Videos/Arbeitsblättern
   b. ODER search_wlo_collections lieferte 0 Treffer
   c. ODER Nutzer hat Sammlungsergebnis gesehen und fragt nach mehr
4. NIEMALS beide Tools gleichzeitig im ersten Turn!

## Sofort-Suche-Regel (ZWINGEND)
- Bei INT-W-03a/b/c (Themenseite/Material/Lerninhalt suchen): **SOFORT search_wlo_collections aufrufen** — KEIN Soft Probing, KEIN Nachfragen zur Persona, KEINE Rückfragen vor dem ersten Suchergebnis
- Themenseiten = Sammlungen = Inhalte sind gleichwertig für die Persona-Erkennung: wer auf WLO nach Themen/Materialien sucht ist Lehrkraft (Default), Lerner:in oder Elternteil — NIEMALS erst fragen, direkt liefern
- Fehlende Preconditions bei Suche → Degradation aktiv: breite Suche ohne Parameter, NICHT blockieren`;
}

// ── POST handler ──────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  const { message, history, currentStateId, signalHistory, contentContext, currentPersonaId, turnNumber } = (await req.json()) as {
    message: string;
    history: Array<{ role: 'user' | 'assistant'; content: string }>;
    currentStateId?: string;
    signalHistory?: string[];
    contentContext?: Record<string, string>;
    currentPersonaId?: string;
    turnNumber?: number;
  };

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const emit = (event: object) => {
        controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'));
      };

      try {
        const sysPrompt = buildSystemPrompt(
          currentStateId ?? 'state-1',
          signalHistory ?? [],
          contentContext ?? {},
          currentPersonaId ?? 'P-AND',
          turnNumber ?? 1
        );
        const messages: OpenAI.ChatCompletionMessageParam[] = [
          { role: 'system', content: sysPrompt },
          ...history.map(m => ({ role: m.role, content: m.content } as OpenAI.ChatCompletionMessageParam)),
          { role: 'user', content: message },
        ];

        let response = await client.chat.completions.create({
          model: 'gpt-4.1-mini',
          messages,
          tools: TOOLS,
          tool_choice: 'auto',
        });

        const MCP_TOOLS = new Set(['search_wlo_collections','search_wlo_content','get_collection_contents',
          'get_node_details','get_wirlernenonline_info','get_edu_sharing_network_info',
          'get_edu_sharing_product_info','get_metaventis_info','lookup_wlo_vocabulary']);

        // ── Helper: process a single classify_input call ──────────────────────
        function processClassify(tc: OpenAI.ChatCompletionMessageToolCall): string {
          const args = JSON.parse(tc.function.arguments || '{}') as Record<string, unknown>;
          const input = {
            persona: {
              id: String(args.persona_id ?? 'P-AND'),
              label: String(args.persona_label ?? ''),
              confidence: Number(args.persona_confidence ?? 0),
              reasoning: String(args.persona_reasoning ?? ''),
            },
            signals: {
              active: (args.signals_active as string[]) ?? [],
              dominant: args.signals_dominant as string | undefined,
              byDimension: {
                d1_time:       (args.signals_d1_time as string[]) ?? [],
                d2_competence: (args.signals_d2_comp as string[]) ?? [],
                d3_attitude:   (args.signals_d3_att as string[]) ?? [],
                d4_context:    (args.signals_d4_ctx as string[]) ?? [],
              },
            },
            context: {
              page:                  String(args.context_page ?? 'unbekannt'),
              session:               (args.context_session as 'new' | 'returning') ?? 'new',
              fach:                  args.context_fach as string | undefined,
              thema:                 args.context_thema as string | undefined,
              klasse:                args.context_klasse as string | undefined,
              node_id:               args.context_node_id as string | undefined,
              preconditions_met:     (args.preconditions_met as string[]) ?? [],
              preconditions_missing: (args.preconditions_missing as string[]) ?? [],
            },
            intent: {
              id:                 String(args.intent_id ?? 'INT-W-02'),
              label:              String(args.intent_label ?? ''),
              confidence:         Number(args.intent_confidence ?? 0),
              degradation_active: Boolean(args.intent_degradation),
              degradation_reason: args.intent_degradation_reason as string | undefined,
            },
            state: {
              id:        String(args.state_id ?? 'state-1'),
              label:     String(args.state_label ?? ''),
              cluster:   (args.state_cluster as 'A' | 'B' | 'C') ?? 'A',
              reasoning: args.state_reasoning as string | undefined,
            },
          };
          emit({ type: 'debug', step: 'input', data: input });
          const topPatterns = scorePatternsForContext(
            input.persona.id,
            input.signals.active,
            input.state.id,
            input.intent.id,
            input.signals.dominant
          );
          return JSON.stringify({
            ok: true,
            classification: input,
            top_patterns: topPatterns.map(p => `${p.id}: ${p.label} — ${p.coreRule}`),
          });
        }

        // ── Helper: process a single select_output call ────────────────────────
        function processSelect(tc: OpenAI.ChatCompletionMessageToolCall): string {
          const args = JSON.parse(tc.function.arguments || '{}') as Record<string, unknown>;
          const pat = PATTERNS.find(p => p.id === String(args.pattern_id));
          const output = {
            pattern: {
              id:          String(args.pattern_id ?? 'PAT-07'),
              label:       pat?.label ?? String(args.pattern_label ?? ''),
              style_notes: String(args.style_notes ?? ''),
            },
            content: {
              type:               String(args.content_type ?? 'Materiallisten'),
              max_results:        Number(args.content_max ?? 5),
              degradation_active: Boolean(args.content_degradation),
            },
            tools: ((args.tools_to_use as string[]) ?? []).map(name => ({
              name,
              reason: String(args.tools_reasoning ?? ''),
              status: 'pending' as const,
            })),
          };
          emit({ type: 'debug', step: 'output', data: output });
          return JSON.stringify({ ok: true, output, template: pat?.coreRule ?? '' });
        }

        // ── Helper: execute a single MCP call (async) ─────────────────────────
        async function executeMcp(tc: OpenAI.ChatCompletionMessageToolCall): Promise<OpenAI.ChatCompletionToolMessageParam> {
          const args = JSON.parse(tc.function.arguments || '{}') as Record<string, unknown>;
          const mcpId = tc.id;
          emit({ type: 'debug', step: 'mcp_call', data: { id: mcpId, tool: tc.function.name, args } });
          let result: string;
          try {
            result = await callMcp(tc.function.name, args);
            emit({ type: 'debug', step: 'mcp_result', data: { id: mcpId, result: result.slice(0, 500) } });
            const defaultType = CARD_TOOLS[tc.function.name];
            if (defaultType) {
              const cards = parseWloCards(result, defaultType);
              if (cards.length > 0) emit({ type: 'cards', data: cards });
            }
          } catch (e: unknown) {
            const errMsg = e instanceof Error ? e.message : String(e);
            emit({ type: 'debug', step: 'mcp_error', data: { id: mcpId, error: errMsg } });
            result = `MCP-Fehler: ${errMsg}`;
          }
          return { role: 'tool', tool_call_id: tc.id, content: result };
        }

        let iterations = 0;
        while (response.choices[0].finish_reason === 'tool_calls' && iterations < 8) {
          iterations++;
          const assistantMsg = response.choices[0].message;
          messages.push(assistantMsg);

          const allCalls = assistantMsg.tool_calls ?? [];

          // classify_input and select_output: always solo, sequential (dependency chain)
          const syncResults: OpenAI.ChatCompletionToolMessageParam[] = allCalls
            .filter(tc => tc.function.name === 'classify_input' || tc.function.name === 'select_output')
            .map(tc => ({
              role: 'tool' as const,
              tool_call_id: tc.id,
              content: tc.function.name === 'classify_input' ? processClassify(tc) : processSelect(tc),
            }));

          // MCP calls: run concurrently with Promise.all
          const mcpCalls = allCalls.filter(tc => MCP_TOOLS.has(tc.function.name));
          const mcpResults = await Promise.all(mcpCalls.map(executeMcp));

          messages.push(...syncResults, ...mcpResults);

          response = await client.chat.completions.create({
            model: 'gpt-4.1-mini',
            messages,
            tools: TOOLS,
            tool_choice: 'auto',
          });
        }

        // ── Stream final content ─────────────────────────────────────────────
        const content = response.choices[0].message.content ?? '(Keine Antwort)';
        const CHUNK = 6;
        for (let i = 0; i < content.length; i += CHUNK) {
          emit({ type: 'content', delta: content.slice(i, i + CHUNK) });
          await new Promise(r => setTimeout(r, 8));
        }

        emit({ type: 'done' });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        emit({ type: 'error', message: msg });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache' },
  });
}
