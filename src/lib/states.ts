import type { ConvState } from './types';

export const CONV_STATES: ConvState[] = [
  // ── Cluster A: Orientierung ───────────────────────────────────────────────
  {
    id: 'state-1', label: 'Orientation & Persona Detection',
    description: 'Einstieg ins Gespräch, Zielgruppe erkennen',
    cluster: 'A', clusterLabel: 'Orientierung', emoji: '📍',
    goal: 'Persona erkennen und Gespräch einrahmen',
    botFocus: 'Warm, offen, max. 1 Frage. Persona soft aus Signal + Kontext ableiten.',
    mainPersonas: ['P-AND', 'P-LK', 'P-SL', 'P-ELT'],
    tools: [],
    transitions: ['state-2 (Preconditions fehlen)', 'state-3 (Politiker/Presse)', 'state-4 (neugierig)', 'state-5 (Intent klar)', 'state-10 (Redakteur)'],
  },
  {
    id: 'state-2', label: 'Context & Preconditions Building',
    description: 'Fehlende Preconditions klären (Soft Probing)',
    cluster: 'A', clusterLabel: 'Orientierung', emoji: '📋',
    goal: 'Preconditions erfüllen für nächste Aktion',
    botFocus: 'Max. 1 Frage pro Turn. Nie blockieren. Nach 1 unbeant. Frage: Degradation.',
    mainPersonas: ['P-LK', 'P-SL', 'P-ELT', 'P-BER'],
    tools: ['lookup_wlo_vocabulary'],
    transitions: ['state-4 (grob erfüllt, explorativ)', 'state-5 (erfüllt, zielgerichtet)'],
  },
  {
    id: 'state-3', label: 'Information & Explanation',
    description: 'Plattform erklären, Überblick + Fakten liefern',
    cluster: 'A', clusterLabel: 'Orientierung', emoji: 'ℹ️',
    goal: 'Plattform-Informationen bereitstellen',
    botFocus: 'Seriös, sachlich, direkt. Fakten aus MCP. Kein Suche-Angebot bei VER/RED.',
    mainPersonas: ['P-VER', 'P-RED', 'P-BER'],
    tools: ['get_wirlernenonline_info', 'get_edu_sharing_product_info', 'get_metaventis_info'],
    transitions: ['state-9 (Evaluation)', 'Abschluss'],
  },
  // ── Cluster B: Aktion (Kernschleife) ──────────────────────────────────────
  {
    id: 'state-4', label: 'Navigation & Discovery',
    description: 'Exploratives Stöbern, noch kein konkretes Ziel',
    cluster: 'B', clusterLabel: 'Aktion', emoji: '🦭',
    goal: 'Orientierung + Inspiration durch Themenseiten',
    botFocus: 'Themenseiten vorschlagen. Optionen öffnen. Mehrere Einstiegspunkte.',
    mainPersonas: ['P-LK', 'P-SL', 'P-ELT', 'P-BER', 'P-AND'],
    tools: ['search_wlo_collections', 'get_collection_contents'],
    transitions: ['state-5 (konkreter Intent)', 'state-7 (Anpassung)'],
  },
  {
    id: 'state-5', label: 'Search & Retrieval',
    description: 'Zielgerichtete Suche nach konkreten Inhalten',
    cluster: 'B', clusterLabel: 'Aktion', emoji: '🔍',
    goal: 'Passende Materialien finden',
    botFocus: 'Direkt suchen. Max. 5 Treffer. Transparent kommunizieren was gesucht wird.',
    mainPersonas: ['P-LK', 'P-SL', 'P-BER'],
    tools: ['search_wlo_content', 'search_wlo_collections', 'lookup_wlo_vocabulary'],
    transitions: ['state-6 (Treffer)', 'state-9 (0 Treffer)', 'state-7 (Anpassung)'],
  },
  {
    id: 'state-6', label: 'Result Curation & Presentation',
    description: 'Ergebnisse auswählen, priorisieren, präsentieren',
    cluster: 'B', clusterLabel: 'Aktion', emoji: '📝',
    goal: 'Kuratierte Trefferliste bereitstellen',
    botFocus: 'Kurze Einleitung + nummerierte Liste. Max. 5 Einträge. Keine langen Beschreibungen.',
    mainPersonas: ['P-LK', 'P-BER', 'P-RED'],
    tools: ['get_node_details', 'get_collection_contents'],
    transitions: ['state-9 (Nachfrage)', 'state-7 (Anpassung)', 'state-8 (Lerner)'],
  },
  {
    id: 'state-7', label: 'Refinement & Iteration',
    description: 'Ergebnisse anpassen: anderes Thema, Schwierigkeit, Filter',
    cluster: 'B', clusterLabel: 'Aktion', emoji: '🔄',
    goal: 'Suche verfeinern bis passendes Ergebnis',
    botFocus: 'Neue Parameter aufnehmen. Suche anpassen. Loop zurück zu Search oder Discovery.',
    mainPersonas: ['P-LK', 'P-SL', 'P-BER'],
    tools: ['search_wlo_content', 'search_wlo_collections', 'lookup_wlo_vocabulary'],
    transitions: ['state-5 (neue Suche)', 'state-4 (neuer Einstieg)'],
  },
  // ── Cluster C: Abschluss & Sonder ─────────────────────────────────────────
  {
    id: 'state-8', label: 'Learning / Consumption',
    description: 'Nutzer konsumiert Inhalte — liest, schaut, versteht',
    cluster: 'C', clusterLabel: 'Abschluss & Sonder', emoji: '📚',
    goal: 'Inhalte verstehen und nutzen',
    botFocus: 'Einfache Sprache. Schritt-für-Schritt. Verständnis-Fragen erlaubt.',
    mainPersonas: ['P-SL', 'P-ELT'],
    tools: ['get_node_details'],
    transitions: ['state-9 (Feedback)', 'state-7 (Schwierigkeit anpassen)'],
  },
  {
    id: 'state-9', label: 'Evaluation & Feedback',
    description: 'War das hilfreich? Qualität bewerten, Lücken erfassen.',
    cluster: 'C', clusterLabel: 'Abschluss & Sonder', emoji: '⭐',
    goal: 'Qualität prüfen, Feedback sammeln',
    botFocus: 'Ehrlich bei Null-Treffern. Feedback einladen ohne zu drängen. Fallback anbieten.',
    mainPersonas: ['P-LK', 'P-BER', 'P-VER', 'P-RED'],
    tools: [],
    transitions: ['state-7 (neue Suche)', 'Abschluss'],
  },
  {
    id: 'state-10', label: 'Redaktions-Recherche',
    description: 'P-RED erkundet WLO-Inhalte redaktionell — Themen, Sammlungen, inhaltliche Lücken identifizieren',
    cluster: 'C', clusterLabel: 'Abschluss & Sonder', emoji: '✏️',
    goal: 'Relevante WLO-Sammlungen für Redakteur:in identifizieren und thematisch einordnen',
    botFocus: 'search_wlo_collections aufrufen. Sammlungen nach thematischer Vollständigkeit bewerten. Lücken benennen. Einladend formulieren.',
    mainPersonas: ['P-RED'],
    tools: ['search_wlo_collections', 'get_collection_contents'],
    transitions: ['state-6 (Ergebnisse kuratiert)', 'state-7 (verfeinern)', 'state-9 (Feedback)'],
  },
  {
    id: 'state-11', label: 'System & Meta Interaction',
    description: 'Feedback zum Bot, Transparenz, Meta-Fragen',
    cluster: 'C', clusterLabel: 'Abschluss & Sonder', emoji: '⚙️',
    goal: 'Systemgrenzen erklären, transparent sein',
    botFocus: 'Offen und ehrlich. Grenzen kommunizieren. Keine falschen Versprechen.',
    mainPersonas: ['P-VER', 'P-AND'],
    tools: [],
    transitions: ['Beliebiger State je nach Reaktion'],
  },
];

export const STATE_IDS = CONV_STATES.map(s => s.id);
export const CLUSTER_A = CONV_STATES.filter(s => s.cluster === 'A');
export const CLUSTER_B = CONV_STATES.filter(s => s.cluster === 'B');
export const CLUSTER_C = CONV_STATES.filter(s => s.cluster === 'C');

export function getState(id: string): ConvState | undefined {
  return CONV_STATES.find(s => s.id === id);
}
