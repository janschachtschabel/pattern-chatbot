import type { Signal } from './types';

export const SIGNALS: Signal[] = [
  // ── Dimension 1: Zeit & Druck ──────────────────────────────────────────────
  {
    id: 'zeitdruck', label: 'Unter Zeitdruck', dimension: 1,
    dimensionLabel: 'Zeit & Druck', emoji: '⏱️',
    detectionHints: ['"schnell"', '"kurz"', '"jetzt gleich"', 'Ausrufezeichen'],
    botImplication: 'Sofort zur Aktion. Kein Onboarding.',
    tone: 'Direkt',
  },
  {
    id: 'ungeduldig', label: 'Ungeduldig', dimension: 1,
    dimensionLabel: 'Zeit & Druck', emoji: '⚡',
    detectionHints: ['kurze Sätze', 'keine Erklärungen erwartet', 'Wiederholungen'],
    botImplication: 'Kein Smalltalk. Max. 2 Sätze + CTA.',
    tone: 'Kurz',
  },
  {
    id: 'gestresst', label: 'Gestresst', dimension: 1,
    dimensionLabel: 'Zeit & Druck', emoji: '😤',
    detectionHints: ['mehrere Anfragen kurz hintereinander', 'Fehler im Text', 'Ungeduld'],
    botImplication: 'Einfach führen. Kein Overload.',
    tone: 'Ruhig, klar',
  },
  {
    id: 'effizient', label: 'Effizient', dimension: 1,
    dimensionLabel: 'Zeit & Druck', emoji: '🎯',
    detectionHints: ['präzise Formulierungen', 'konkrete Parameter von Anfang an'],
    botImplication: 'Präzise antworten. Keine Bestätigungsfragen.',
    tone: 'Knapp',
  },
  // ── Dimension 2: Sicherheit & Kompetenz ───────────────────────────────────
  {
    id: 'unsicher', label: 'Unsicher', dimension: 2,
    dimensionLabel: 'Sicherheit & Kompetenz', emoji: '🤔',
    detectionHints: ['viele Fragezeichen', 'Zögern', '"ich weiß nicht so recht"'],
    botImplication: '1 Frage pro Turn. Schritt-für-Schritt.',
    tone: 'Warm, führend',
  },
  {
    id: 'ueberfordert', label: 'Überfordert', dimension: 2,
    dimensionLabel: 'Sicherheit & Kompetenz', emoji: '😵',
    detectionHints: ['"ich blick da nicht durch"', 'allgemeine Formulierungen'],
    botImplication: 'Nur 1 Option anbieten. Themenseite als Einstieg.',
    tone: 'Entlastend',
  },
  {
    id: 'unerfahren', label: 'Unerfahren', dimension: 2,
    dimensionLabel: 'Sicherheit & Kompetenz', emoji: '🌱',
    detectionHints: ['keine Fachbegriffe', 'sehr allgemeine Anfragen'],
    botImplication: 'Einfache Sprache. Keine Filter-Optionen.',
    tone: 'Niedrigschwellig',
  },
  {
    id: 'erfahren', label: 'Erfahren', dimension: 2,
    dimensionLabel: 'Sicherheit & Kompetenz', emoji: '🎓',
    detectionHints: ['Fachbegriffe', 'gezielte Filteranfragen', 'Lizenz-Fragen'],
    botImplication: 'Profi-Filter anbieten. Keine ungefragten Erklärungen.',
    tone: 'Präzise',
  },
  {
    id: 'entscheidungsbereit', label: 'Entscheidungsbereit', dimension: 2,
    dimensionLabel: 'Sicherheit & Kompetenz', emoji: '✅',
    detectionHints: ['"ich nehme"', '"zeig mir direkt"', 'klare Präferenz'],
    botImplication: 'Direkt zur Auswahl. Kein weiteres Probing.',
    tone: 'Direkt',
  },
  // ── Dimension 3: Haltung & Motivation ─────────────────────────────────────
  {
    id: 'neugierig', label: 'Neugierig', dimension: 3,
    dimensionLabel: 'Haltung & Motivation', emoji: '🔭',
    detectionHints: ['"was gibt es noch?"', 'breite Fragen', 'Entdeckungsmodus'],
    botImplication: 'Exploration anbieten. Mehrere Optionen zeigen.',
    tone: 'Spielerisch',
  },
  {
    id: 'zielgerichtet', label: 'Zielgerichtet', dimension: 3,
    dimensionLabel: 'Haltung & Motivation', emoji: '🏹',
    detectionHints: ['sehr spezifische Anfrage', 'klares Ziel benannt'],
    botImplication: 'Direkt zu Treffer. Wenig Erklärungen.',
    tone: 'Effizient',
  },
  {
    id: 'skeptisch', label: 'Skeptisch', dimension: 3,
    dimensionLabel: 'Haltung & Motivation', emoji: '🤨',
    detectionHints: ['Fragen zu Qualität, Lizenz, Herkunft', '"woher kommt das?"'],
    botImplication: 'Belege first. Herkunft, Lizenz, Prüfdatum nennen.',
    tone: 'Transparent',
  },
  {
    id: 'vertrauend', label: 'Vertrauend', dimension: 3,
    dimensionLabel: 'Haltung & Motivation', emoji: '🤝',
    detectionHints: ['wenig Nachfragen', 'Vorschläge werden angenommen'],
    botImplication: 'Führen und empfehlen. Bestätigung geben.',
    tone: 'Empfehlend',
  },
  // ── Dimension 4: Kontext & Nutzung ────────────────────────────────────────
  {
    id: 'orientierungssuchend', label: 'Orientierungssuchend', dimension: 4,
    dimensionLabel: 'Kontext & Nutzung', emoji: '🧭',
    detectionHints: ['"wo fange ich an?"', 'kein klares Thema', 'erste Sitzung'],
    botImplication: 'Themenseiten als Einstieg. Übersicht vor Details.',
    tone: 'Orientierend',
  },
  {
    id: 'vergleichend', label: 'Vergleichend', dimension: 4,
    dimensionLabel: 'Kontext & Nutzung', emoji: '⚖️',
    detectionHints: ['"was ist besser?"', '"gibt es auch…?"', 'Alternativfragen'],
    botImplication: 'Optionen gegenüberstellen. Vergleich strukturieren.',
    tone: 'Analytisch',
  },
  {
    id: 'validierend', label: 'Validierend', dimension: 4,
    dimensionLabel: 'Kontext & Nutzung', emoji: '🔍',
    detectionHints: ['"stimmt das?"', '"ist das aktuell?"', 'Nachprüfen'],
    botImplication: 'Quellen und Aktualität explizit nennen.',
    tone: 'Belegend',
  },
  {
    id: 'delegierend', label: 'Delegierend', dimension: 4,
    dimensionLabel: 'Kontext & Nutzung', emoji: '📋',
    detectionHints: ['"such du mal"', '"empfiehl mir einfach"', 'Entscheidung abgeben'],
    botImplication: 'Vorauswahl anbieten. Entscheidung erleichtern.',
    tone: 'Proaktiv',
  },
];

export const SIGNAL_IDS = SIGNALS.map(s => s.id);

export const SIGNALS_BY_DIMENSION: Record<number, Signal[]> = {
  1: SIGNALS.filter(s => s.dimension === 1),
  2: SIGNALS.filter(s => s.dimension === 2),
  3: SIGNALS.filter(s => s.dimension === 3),
  4: SIGNALS.filter(s => s.dimension === 4),
};

export const DIM_LABELS: Record<number, string> = {
  1: 'Zeit & Druck',
  2: 'Sicherheit & Kompetenz',
  3: 'Haltung & Motivation',
  4: 'Kontext & Nutzung',
};

export function getSignal(id: string): Signal | undefined {
  return SIGNALS.find(s => s.id === id);
}
