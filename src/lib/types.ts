// ── Shared entity types ───────────────────────────────────────────────────────

export interface Persona {
  id: string;          // P-LK | P-SL | P-BER | P-VER | P-ELT | P-RED | P-AND
  label: string;
  emoji: string;
  shortDesc: string;
  tonality: string;
  color: string;       // tailwind bg color class
  detectionHints: string[];   // linguistic / behavioral markers for classify_input
}

export interface Signal {
  id: string;
  label: string;
  dimension: 1 | 2 | 3 | 4;
  dimensionLabel: string;
  emoji: string;
  detectionHints: string[];   // linguistic markers
  botImplication: string;     // how bot adjusts
  tone: string;
}

export interface Intent {
  id: string;          // INT-W-01 … INT-W-09
  label: string;
  description: string;
  mainPersonas: string[];
  cluster: 'info' | 'klarung' | 'discovery' | 'search' | 'feedback' | 'routing' | 'meta';
  preconditions: string[];
  degradation: string;
  tools: string[];
}

export interface ConvState {
  id: string;          // state-1 … state-11
  label: string;
  description: string;
  cluster: 'A' | 'B' | 'C';
  clusterLabel: string;
  emoji: string;
  goal: string;
  botFocus: string;
  mainPersonas: string[];
  tools: string[];
  transitions: string[];
}

export interface Pattern {
  id: string;          // PAT-01 … PAT-12
  label: string;
  trigger: string;
  coreRule: string;
  length: 'kurz' | 'mittel' | 'normal' | 'bullet-liste';
  triggerSignals: string[];
  triggerStates: string[];
  triggerPersonas: string[];
  triggerIntents: string[];   // intent IDs that strongly match this pattern
}

// ── WLO card tiles ───────────────────────────────────────────────────────────

export interface WloCard {
  nodeId: string;
  title: string;
  description: string;
  disciplines: string[];
  educationalContexts: string[];
  keywords: string[];
  learningResourceTypes: string[];
  url: string;
  wloUrl: string;
  previewUrl: string;
  license: string;
  publisher: string;
  nodeType: 'collection' | 'content';
}

// ── Chat types ────────────────────────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  wloCards?: WloCard[];
}

// ── Input classification (5 dimensions) ──────────────────────────────────────

export interface PersonaResult {
  id: string;
  label: string;
  confidence: number;   // 0–1
  reasoning?: string;
}

export interface SignalResult {
  active: string[];           // signal IDs currently detected
  dominant?: string;          // strongest signal
  byDimension: {
    d1_time: string[];        // Zeit & Druck
    d2_competence: string[];  // Sicherheit & Kompetenz
    d3_attitude: string[];    // Haltung & Motivation
    d4_context: string[];     // Kontext & Nutzung
  };
}

export interface ContextResult {
  page: string;               // 'startseite' | 'suche' | 'materialseite' | 'themenseite' | 'statistik' | 'unbekannt' | 'extern'
  session: 'new' | 'returning';
  fach?: string;
  thema?: string;
  klasse?: string;
  node_id?: string;
  sammlung_id?: string;
  preconditions_met: string[];   // which preconditions are fulfilled
  preconditions_missing: string[];
}

export interface IntentResult {
  id: string;
  label: string;
  confidence: number;
  degradation_active: boolean;
  degradation_reason?: string;
}

export interface StateResult {
  id: string;
  label: string;
  cluster: 'A' | 'B' | 'C';
  reasoning?: string;
}

export interface InputClassification {
  persona: PersonaResult;
  signals: SignalResult;
  context: ContextResult;
  intent: IntentResult;
  state: StateResult;
}

// ── Output selection (3 elements) ─────────────────────────────────────────────

export interface OutputPattern {
  id: string;               // PAT-01 … PAT-12
  label: string;
  style_notes: string;      // concrete adaptation instructions
}

export interface OutputContent {
  type: string;             // 'Materiallisten' | 'Themenseiten' | 'Fakten' | 'Erklärungen' | etc.
  max_results: number;
  degradation_active: boolean;
}

export interface OutputTool {
  name: string;
  reason: string;
  status: 'pending' | 'done' | 'error' | 'skipped';
  result?: string;
}

export interface OutputSelection {
  pattern: OutputPattern;
  content: OutputContent;
  tools: OutputTool[];
}

// ── MCP call tracking ─────────────────────────────────────────────────────────

export interface McpCall {
  id: string;
  tool: string;
  args: Record<string, unknown>;
  result?: string;
  status: 'pending' | 'done' | 'error';
}

// ── Debug state ───────────────────────────────────────────────────────────────

export interface DebugState {
  status: 'idle' | 'classifying' | 'selecting' | 'executing' | 'generating' | 'done' | 'error';
  input?: InputClassification;
  output?: OutputSelection;
  mcpCalls: McpCall[];
  error?: string;
  // Cross-turn accumulation
  signalHistory: string[];         // all signals seen across turns (deduplicated)
  stateHistory: string[];          // state progression
  contentContext: Record<string, string>; // accumulated: fach, thema, klasse, …
}

// ── Stream events ─────────────────────────────────────────────────────────────

export type StreamEvent =
  | { type: 'debug'; step: 'input';     data: InputClassification }
  | { type: 'debug'; step: 'output';    data: OutputSelection }
  | { type: 'debug'; step: 'mcp_call';  data: { id: string; tool: string; args: Record<string, unknown> } }
  | { type: 'debug'; step: 'mcp_result'; data: { id: string; result: string } }
  | { type: 'debug'; step: 'mcp_error'; data: { id: string; error: string } }
  | { type: 'cards';   data: WloCard[] }
  | { type: 'content'; delta: string }
  | { type: 'done' }
  | { type: 'error'; message: string };
