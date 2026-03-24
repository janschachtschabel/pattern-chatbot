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
          intent_id:           { type: 'string', enum: INTENT_IDS, description: 'Primärer Intent. KLASSIFIKATIONSREGELN: (1) INT-W-10 wenn Lehrkraft Unterrichtsplanung, Stundenentwurf, Lernpfad, "Unterrichtsstunde planen", "didaktisch strukturiert", "Lernziele formulieren" erwähnt — Höchste Priorität für P-LK! (2) INT-W-01 bei Plattform-Infofragen: "Was ist WLO?", "wer betreibt WLO". (3) INT-W-03c wenn Medientyp explizit: "Videos", "Arbeitsblätter", "Quizze". (4) INT-W-03a generische Themensuche ohne Medientyp. (5) INT-W-03b Lehrkraft + Fach + Klasse ohne Planungs-Intent. KEIN INT-W-03b wenn Planung/Lernpfad erwähnt!' },
          intent_label:        { type: 'string', description: 'Label des Intent' },
          intent_confidence:   { type: 'number', description: 'Konfidenz 0–1' },
          intent_degradation:  { type: 'boolean', description: 'Degradation aktiv wegen fehlender Preconditions?' },
          intent_degradation_reason: { type: 'string', description: 'Grund für Degradation' },
          state_id:            { type: 'string', enum: STATE_IDS, description: 'Gesprächs-State. ZWINGEND: Intent→State Matrix beachten: INT-W-01→state-3, INT-W-02→state-2, INT-W-03a→state-4, INT-W-03b→state-5, INT-W-03c→state-5, INT-W-04→state-9, INT-W-05→state-10, INT-W-06→state-3, INT-W-07→state-6, INT-W-08→state-9, INT-W-09→state-3, INT-W-10→state-7. state-1 NUR bei Turn 1 ohne erkennbaren Intent. NIEMALS zurück zu state-1 wenn Intent erkannt.' },
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
          tools_to_use:      { type: 'array', items: { type: 'string' }, description: 'MCP-Tools in Reihenfolge. PFLICHT-ROUTING: (A) INFO-FRAGEN (INT-W-01/06/09): NUR [get_wirlernenonline_info etc.] — KEIN search_wlo_collections! (B1) MEDIENTYP explizit (Videos, Arbeitsblätter, Quizze): [lookup_wlo_vocabulary, search_wlo_content] — KEIN search_wlo_collections! (B2) THEMENSUCHE ohne Medientyp (INT-W-03a/b): IMMER [search_wlo_collections]. (C) UNTERRICHTSPLANUNG/LERNPFAD (INT-W-10, PAT-19): [search_wlo_collections, generate_learning_path] — BEIDE Tools in dieser Reihenfolge! Erst Sammlung finden, dann Lernpfad generieren. (D) search_wlo_content als Fallback bei 0 Treffern. Niemals B1 und B2 mischen!' },
          tools_reasoning:   { type: 'string', description: 'Warum diese Tools' },
        },
        required: ['pattern_id','style_notes','content_type','content_max','content_degradation','tools_to_use'],
      },
    },
  },
  // MCP tools
  { type: 'function', function: { name: 'search_wlo_collections', description: 'Sucht Themenseiten/Sammlungen auf WLO. NUR für Sammlung/Themenseiten-Anfragen. NICHT für explizite Medientypen (Videos, Arbeitsblätter etc.) — dafür search_wlo_content verwenden!', parameters: { type: 'object', properties: { query: { type: 'string', description: 'Suchbegriff, z.B. "Mathematik" oder "Klimawandel"' }, educationalContext: { type: 'string', description: 'Bildungsstufe: z.B. "Primarstufe", "Sekundarstufe I", "Grundschule"' }, discipline: { type: 'string', description: 'Fach: z.B. "Mathematik", "Biologie", "Deutsch"' } }, required: ['query'] } } },
  { type: 'function', function: { name: 'search_wlo_content', description: 'Sucht konkrete Bildungsmaterialien/Inhalte auf WLO (Einzelmaterialien). VERWENDEN wenn: (1) Nutzer explizit nach Medientyp fragt (Videos, Arbeitsblätter, interaktive Übungen, Quizze, Podcasts), (2) Nutzer Lerninhalt zum Verstehen sucht (P-SL), (3) 0 Treffer bei search_wlo_collections. learningResourceType mit lookup_wlo_vocabulary URI befüllen!', parameters: { type: 'object', properties: { query: { type: 'string', description: 'Suchbegriff, z.B. "Prozentrechnung" oder "Bruchrechnung Grundschule"' }, learningResourceType: { type: 'string', description: 'Ressourcentyp-URI aus lookup_wlo_vocabulary(lrt). Z.B. für Video erst lookup aufrufen! Direkte Labels: "Video", "Arbeitsblatt", "Interaktives Medium", "Unterrichtsplan"' }, discipline: { type: 'string', description: 'Fach: z.B. "Mathematik", "Biologie", "Deutsch"' }, educationalContext: { type: 'string', description: 'Bildungsstufe: z.B. "Primarstufe", "Sekundarstufe I"' }, userRole: { type: 'string', description: 'Zielgruppe: z.B. "Lerner/in", "Lehrer/in"' }, maxResults: { type: 'number', description: 'Max. Ergebnisse (1-8, Standard 6)' } }, required: ['query'] } } },
  { type: 'function', function: { name: 'get_collection_contents', description: 'Inhalte (Lernmaterialien) einer WLO-Sammlung abrufen. Aufrufen wenn Nutzer fragt "Was ist in dieser Sammlung?" oder "Zeig mir die Materialien dazu".', parameters: { type: 'object', properties: { nodeId: { type: 'string', description: 'Node-ID der Sammlung (aus vorherigen Suchergebnissen)' }, contentFilter: { type: 'string', enum: ['files', 'folders', 'both'], description: 'files = Lernmaterialien (Default), folders = Untersammlungen' }, maxResults: { type: 'number', description: 'Max. Ergebnisse, Default 6' } }, required: ['nodeId'] } } },
  { type: 'function', function: { name: 'generate_learning_path', description: 'Erstellt einen strukturierten Lernpfad aus den Inhalten einer WLO-Sammlung. AUFRUFEN wenn Nutzer explizit nach Lernpfad, Unterrichtsplanung, Stundenverlauf, didaktischer Sequenz oder strukturierten Materialien fragt.', parameters: { type: 'object', properties: { nodeId: { type: 'string', description: 'Node-ID der WLO-Sammlung' }, title: { type: 'string', description: 'Titel/Thema der Sammlung' } }, required: ['nodeId', 'title'] } } },
  { type: 'function', function: { name: 'get_node_details',        description: 'Detailmetadaten für eine Node-ID (WLO MCP)', parameters: { type: 'object', properties: { nodeId: { type: 'string' } }, required: ['nodeId'] } } },
  { type: 'function', function: { name: 'get_wirlernenonline_info',    description: 'Infos von WirLernenOnline (WLO) Webseite. AUFRUFEN bei Fragen zu: WLO, wirlernenonline.de, OER-Portal, Fachportale (z.B. Informatik, Mathematik), Qualitätssicherung, Quellenerschließung, Mitmachen, Fachredaktion, OER-Statistiken, WLO Plug-ins, GWDG (als WLO-Betreiber), Projektinfos zu WLO. Mehrsprachige Navigation: ohne path = Startseite, dann Unterseite wählen.', parameters: { type: 'object', properties: { path: { type: 'string', description: 'Unterseite, z.B. "/fachportale/informatik". Leer lassen für Startseite.' }, maxLength: { type: 'number', description: 'Max. Zeichen (Standard 8000)' } }, required: [] } } },
  { type: 'function', function: { name: 'get_edu_sharing_network_info', description: 'Infos von edu-sharing-network.org. AUFRUFEN bei Fragen zu: ITsJOINTLY, JOINTLY, BIRD, Bildungsraum Digital, OER-Community, Vernetzung, OER- & IT-Sommercamp, Hackathon, offene Bildung, edu-sharing Netzwerk, Community-Projekte. ItsJointly ist ein JOINTLY-Projekt auf dieser Seite.', parameters: { type: 'object', properties: { path: { type: 'string', description: 'Unterseite, z.B. "/projekte/itsjointly". Leer lassen für Startseite.' }, maxLength: { type: 'number' } }, required: [] } } },
  { type: 'function', function: { name: 'get_edu_sharing_product_info', description: 'Infos von edu-sharing.com (Software-Produkt). AUFRUFEN bei Fragen zu: edu-sharing Software, Open Source Repository, Bildungscloud, Suchmaschine, Moodle-Integration, Tools & Plugins, API, Dokumentation, Demo, Downloads, GWDG-Betrieb, Hosting, Architektur.', parameters: { type: 'object', properties: { path: { type: 'string', description: 'Unterseite, z.B. "/features". Leer lassen für Startseite.' }, maxLength: { type: 'number' } }, required: [] } } },
  { type: 'function', function: { name: 'get_metaventis_info',    description: 'Infos von metaventis.com. AUFRUFEN bei Fragen zu: metaVentis GmbH, edu-sharing Kernentwickler, Landes-Schulcloud, IDM-Landeskonzepte, Autoren- & Redaktionslösung, IT-Partner für F&E-Projekte, GWDG-Kooperation, Firmenwissen & E-Learning.', parameters: { type: 'object', properties: { path: { type: 'string', description: 'Unterseite. Leer lassen für Startseite.' }, maxLength: { type: 'number' } }, required: [] } } },
  { type: 'function', function: { name: 'lookup_wlo_vocabulary',  description: 'Gültige Filterwerte nachschlagen: Bildungsstufe (educationalContext), Fach (discipline), Zielgruppe (userRole), Lernressourcentyp (lrt)', parameters: { type: 'object', properties: { vocabulary: { type: 'string', enum: ['educationalContext','discipline','userRole','lrt'], description: 'Welches Vokabular: educationalContext | discipline | userRole | lrt' } }, required: ['vocabulary'] } } },
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
  · INT-W-05 (Redaktions-Recherche) → state-10
  · INT-W-06 (Faktenfragen) → state-3
  · INT-W-07 (Material herunterladen) → state-5 oder state-6
  · INT-W-08 (Evaluieren) → state-9
  · INT-W-09 (Reporting) → state-3
- Nachdem Suchergebnisse präsentiert wurden → state-6 oder state-8 (wenn Lerner)
- Wenn Nutzer weiter verfeinert/fragt → state-7
- P-RED nach Suchergebnissen → state-6 oder state-10 (redaktionelle Einordnung)

## Signale bisher im Gespräch
${signalHints}

## Bekannter Inhalts-Kontext
${ctxEntries || '(noch nichts bekannt)'}

## Sammlungs-Regel (WICHTIG für get_collection_contents)
- Wenn Nutzer Inhalte einer Sammlung abrufen will die zuvor gefunden wurde:
  1. Nutze zuerst last_collection_id aus "Bekannter Inhalts-Kontext" falls vorhanden
  2. Sonst: Suche im Gesprächsverlauf nach der zuletzt genannten Node-ID
  3. Falls keine ID bekannt → erst search_wlo_collections mit dem Sammlungsnamen aufrufen, dann get_collection_contents
- NIEMALS "ID nicht bekannt" als Fehler zurückgeben — immer erst neu suchen!
- Bei get_collection_contents: Parameter heißt nodeId (nicht collectionId!)

## Lernpfad & Unterrichtsplanung (ZWINGEND)
- Wenn Nutzer nach **Lernpfad, Unterrichtsplanung, Stundenverlauf, didaktischer Sequenz** oder strukturierten Materialien fragt:
  1. Falls last_collection_id bekannt → sofort \`generate_learning_path\` mit nodeId + title aufrufen
  2. Falls keine Sammlung bekannt → erst \`search_wlo_collections\` → dann \`generate_learning_path\`
  3. NIEMALS selbst einen Lernpfad erfinden — immer aus echten WLO-Materialien via generate_learning_path
  4. Das Tool gibt die Materialien zurück UND einen Prompt — daraus die Lernpfad-Antwort formulieren
${personaSnippet}
## Guardrails (unveränderlich)
- Nie blockieren — fehlt Precondition → Degradation, nie gar nicht antworten
- Soft Probing: max. 1 Frage pro Turn
- Max. 5 Treffer bei Suchergebnissen
- Keine Inhalte erfinden — nur was MCP zurückgibt
- Links als Markdown [Text](URL) formatieren
- Antwort auf Deutsch
- Kein Suche-Angebot bei Persona P-VER (außer Intent INT-W-06/09 erlaubt es)
- P-RED darf und soll suchen — search_wlo_collections ist der Hauptweg für Redakteur:innen

## Info-Tool-Routing (ZWINGEND bei Projekt- und Plattformfragen)
Fragen zu diesen Themen → IMMER das passende Web-Tool aufrufen, NIE aus dem Kopf antworten:
- WLO, wirlernenonline.de, OER-Portal, Fachportale, Qualitätssicherung, GWDG (als WLO-Betreiber) → get_wirlernenonline_info
- ItsJointly, ITsJOINTLY, JOINTLY, BIRD, Bildungsraum Digital, OER-Community, Hackathon, Sommercamp → get_edu_sharing_network_info
- edu-sharing Software, Open Source, Repository, Bildungscloud, Moodle-Integration, API, Hosting → get_edu_sharing_product_info
- metaVentis, Landes-Schulcloud, IDM-Konzepte, Redaktionslösung, GWDG-Kooperation → get_metaventis_info
- GWDG allgemein: get_wirlernenonline_info (WLO-Betrieb) UND/ODER get_edu_sharing_product_info (Software-Hosting)
- Mehrere Aspekte? → beide Tools in tools_to_use aufführen
- Navigation: zuerst ohne path aufrufen → Startseite lesen → passende Unterseite mit path erneut aufrufen

## Suchstrategie (ZWINGEND für alle Materialsuchen)
1. **Medientyp explizit genannt** (Videos, Arbeitsblätter, Quizze, Podcasts, interaktive Übungen): lookup_wlo_vocabulary(lrt) aufrufen → URI ermitteln → search_wlo_content mit learningResourceType. KEIN search_wlo_collections!
2. **Themensuche ohne Medientyp:** NUR search_wlo_collections → Themenseiten/Sammlungen als Einstieg
3. **Wenn Nutzer auf Sammlung klickt ("Inhalte"):** Wird automatisch per UI geladen — KEIN weiteres MCP nötig
4. **search_wlo_content zusätzlich NUR wenn:** search_wlo_collections lieferte 0 Treffer ODER Nutzer fragt nach Einzelmaterialien nach Sammlungsanzeige
5. NIEMALS search_wlo_collections bei explizitem Medientyp!

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
        const LP_TOOLS  = new Set(['generate_learning_path']);

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

        // ── Helper: execute generate_learning_path ────────────────────────────
        async function executeGenerateLearningPath(tc: OpenAI.ChatCompletionMessageToolCall): Promise<OpenAI.ChatCompletionToolMessageParam> {
          const args = JSON.parse(tc.function.arguments || '{}') as { nodeId?: string; title?: string };
          const nodeId = args.nodeId ?? '';
          const title  = args.title  ?? 'Sammlung';
          emit({ type: 'debug', step: 'mcp_call', data: { id: tc.id, tool: 'generate_learning_path', args } });
          try {
            const raw = await callMcp('get_collection_contents', { nodeId, contentFilter: 'files', maxResults: 12 });
            const cards = parseWloCards(raw, 'content');
            if (cards.length > 0) emit({ type: 'cards', data: cards });
            emit({ type: 'debug', step: 'mcp_result', data: { id: tc.id, result: `${cards.length} Inhalte geladen für Lernpfad` } });
            if (cards.length === 0) {
              return { role: 'tool', tool_call_id: tc.id, content: `Keine Inhalte in der Sammlung „${title}" gefunden. Bitte andere Sammlung wählen.` };
            }
            const materialList = cards.map((c, i) => {
              const types = c.learningResourceTypes.length ? ` [${c.learningResourceTypes.join(', ')}]` : '';
              const desc  = c.description ? ` – ${c.description.slice(0, 100)}` : '';
              const url   = c.url || c.wloUrl;
              return `${i + 1}. **${c.title}**${types}${desc}${url ? ` → ${url}` : ''}`;
            }).join('\n');
            return {
              role: 'tool',
              tool_call_id: tc.id,
              content:
                `Sammlung „${title}" enthält ${cards.length} Lernmaterialien:\n\n${materialList}\n\n` +
                `Erstelle jetzt einen pädagogisch strukturierten Lernpfad (z. B. Einstieg → Erarbeitung → Vertiefung → Abschluss/Anwendung). ` +
                `Nenne pro Phase 1–2 konkrete Materialien aus der Liste mit Markdown-Link [Titel](URL). ` +
                `Antworte auf Deutsch, prägnant und direkt einsetzbar.`,
            };
          } catch (e: unknown) {
            const errMsg = e instanceof Error ? e.message : String(e);
            emit({ type: 'debug', step: 'mcp_error', data: { id: tc.id, error: errMsg } });
            return { role: 'tool', tool_call_id: tc.id, content: `Fehler beim Laden der Sammlung: ${errMsg}` };
          }
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

          // generate_learning_path: run before regular MCP (sequential, may emit cards)
          const lpCalls  = allCalls.filter(tc => LP_TOOLS.has(tc.function.name));
          const lpResults = await Promise.all(lpCalls.map(executeGenerateLearningPath));

          // MCP calls: run concurrently with Promise.all
          const mcpCalls = allCalls.filter(tc => MCP_TOOLS.has(tc.function.name));
          const mcpResults = await Promise.all(mcpCalls.map(executeMcp));

          messages.push(...syncResults, ...lpResults, ...mcpResults);

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
