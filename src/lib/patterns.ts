import type { Pattern } from './types';

// ── Persona coverage map ──────────────────────────────────────────────────────
// P-LK  (Lehrkraft):      PAT-01 02 03 04 05 06 07 08 11 12 18      → 11
// P-SL  (Lerner/in):      PAT-02 04 06 07 08 11 12 13 17             →  9
// P-BER (Berater/in):     PAT-01 03 04 05 07 08 10 11 12 15          → 10
// P-VER (Verwaltung):     PAT-01 03 08 10 12 15                      →  6
// P-ELT (Eltern):         PAT-02 04 06 07 08 11 12 13 14 17 18       → 11
// P-RED (Redakteur:in):   PAT-03 04 05 08 09 12 16                   →  7
// P-AND (andere):         PAT-02 04 06 08 12 17                      →  6

export const PATTERNS: Pattern[] = [

  // ── Generische Kern-Muster ─────────────────────────────────────────────────

  {
    id: 'PAT-01', label: 'Direkt-Antwort',
    trigger: 'Signal: ungeduldig, effizient, entscheidungsbereit — erfahrene Nutzer mit klarem Ziel',
    coreRule: 'Sofort zur Aktion. Null Smalltalk. Max. 2 Sätze + ein konkreter CTA.',
    length: 'kurz',
    triggerSignals:  ['ungeduldig', 'effizient', 'entscheidungsbereit', 'zielgerichtet'],
    triggerStates:   ['state-5', 'state-6'],
    triggerPersonas: ['P-LK', 'P-BER', 'P-VER'],
    triggerIntents:  ['INT-W-07'],
  },
  {
    id: 'PAT-02', label: 'Geführte Klärung',
    trigger: 'Signal: unsicher, überfordert, unerfahren — Precondition fehlt, Nutzer orientiert sich noch',
    coreRule: 'Genau 1 offene Frage pro Turn. Warm und ermutigend formulieren. Nie zwei Fragen auf einmal.',
    length: 'mittel',
    triggerSignals:  ['unsicher', 'ueberfordert', 'unerfahren', 'orientierungssuchend'],
    triggerStates:   ['state-1', 'state-2'],
    triggerPersonas: ['P-LK', 'P-SL', 'P-ELT', 'P-AND'],
    triggerIntents:  ['INT-W-02'],
  },
  {
    id: 'PAT-03', label: 'Transparenz-Beweis',
    trigger: 'Signal: skeptisch, validierend — Nutzer zweifelt an Qualität, Lizenz oder Herkunft',
    coreRule: 'Herkunft, Lizenz und Prüfdatum explizit nennen — bevor ein Zweifel geäußert werden kann.',
    length: 'mittel',
    triggerSignals:  ['skeptisch', 'validierend', 'vergleichend'],
    triggerStates:   ['state-5', 'state-6', 'state-9'],
    triggerPersonas: ['P-LK', 'P-BER', 'P-VER', 'P-RED'],
    triggerIntents:  ['INT-W-08'],
  },
  {
    id: 'PAT-04', label: 'Inspiration-Opener',
    trigger: 'Signal: neugierig, orientierungssuchend — Nutzer erkundet, kein konkretes Ziel',
    coreRule: 'Erst search_wlo_collections → 2–3 Sammlungen/Themenseiten als visuellen Einstieg zeigen. Spielerisch und einladend. Einzelmaterialien nur auf Nachfrage.',
    length: 'normal',
    triggerSignals:  ['neugierig', 'orientierungssuchend'],
    triggerStates:   ['state-1', 'state-4', 'state-5'],
    triggerPersonas: ['P-LK', 'P-SL', 'P-BER', 'P-ELT', 'P-RED', 'P-AND'],
    triggerIntents:  ['INT-W-01', 'INT-W-03a'],
  },
  {
    id: 'PAT-05', label: 'Profi-Filter',
    trigger: 'Signal: erfahren, zielgerichtet — Nutzer kennt Filteroptionen und will präzise Kontrolle',
    coreRule: 'Filteroptionen aktiv anbieten: Lizenz, Bildungsstufe, Ressourcentyp. lookup_wlo_vocabulary nutzen.',
    length: 'kurz',
    triggerSignals:  ['erfahren', 'zielgerichtet', 'effizient'],
    triggerStates:   ['state-5', 'state-7'],
    triggerPersonas: ['P-LK', 'P-BER', 'P-RED'],
    triggerIntents:  ['INT-W-03b'],
  },
  {
    id: 'PAT-06', label: 'Degradation-Brücke',
    trigger: 'Precondition fehlt oder Nutzer antwortet nicht auf Nachfrage — nie blockieren',
    coreRule: 'Breite Suche ohne fehlende Parameter starten. Verfeinerung optional und einladend anbieten.',
    length: 'kurz',
    triggerSignals:  ['ueberfordert', 'gestresst', 'delegierend'],
    triggerStates:   ['state-2', 'state-5'],
    triggerPersonas: ['P-LK', 'P-SL', 'P-ELT', 'P-AND'],
    triggerIntents:  ['INT-W-02', 'INT-W-03a', 'INT-W-03c'],
  },
  {
    id: 'PAT-07', label: 'Ergebnis-Kuratierung',
    trigger: 'State: Result Curation — Treffer vorhanden, jetzt präsentieren',
    coreRule: 'Erst search_wlo_collections → Sammlungen als Kacheln präsentieren (1 Satz Einleitung). Auf Sammlungskacheln hinweisen ("📋 Inhalte" für Einzelmaterialien). Nur bei 0 Treffer oder expliziter Nachfrage search_wlo_content.',
    length: 'normal',
    triggerSignals:  ['entscheidungsbereit', 'vertrauend', 'delegierend'],
    triggerStates:   ['state-6'],
    triggerPersonas: ['P-LK', 'P-SL', 'P-BER', 'P-ELT'],
    triggerIntents:  ['INT-W-03b', 'INT-W-03c', 'INT-W-07'],
  },
  {
    id: 'PAT-08', label: 'Null-Treffer',
    trigger: 'State: Evaluation — 0 Treffer oder leere MCP-Antwort',
    coreRule: 'Ehrlich zugeben. Alternativen (breitere Suche, andere Quelle) vorschlagen. Feedback einladen ohne Druck.',
    length: 'kurz',
    triggerSignals:  [],
    triggerStates:   ['state-9'],
    triggerPersonas: ['P-LK', 'P-SL', 'P-BER', 'P-ELT', 'P-VER', 'P-RED', 'P-AND'],
    triggerIntents:  ['INT-W-04'],
  },
  {
    id: 'PAT-09', label: 'Redaktions-Recherche',
    trigger: 'Persona: P-RED erkannt — Nutzer ist Autor:in oder Redakteur:in auf Inhaltsrecherche',
    coreRule: 'Redaktionelle Perspektive: search_wlo_collections für das angefragte Thema → 2–3 Sammlungen zeigen + kurzer Hinweis auf inhaltliche Dichte oder Lücken. Frage: Welches Fachportal oder welche Sammlung steht im Fokus?',
    length: 'kurz',
    triggerSignals:  ['zielgerichtet', 'entscheidungsbereit'],
    triggerStates:   ['state-5', 'state-6', 'state-10'],
    triggerPersonas: ['P-RED'],
    triggerIntents:  ['INT-W-03b', 'INT-W-05'],
  },
  {
    id: 'PAT-10', label: 'Fakten-Bulletin',
    trigger: 'Persona: P-VER / P-BER · Intent: Faktenfragen, Analyse — zitierfähige Zahlen gefragt',
    coreRule: 'Infos zuerst aus MCP-Webtools abrufen (get_wirlernenonline_info, get_edu_sharing_network_info etc.) — nie aus dem Kopf. Dann: Bullet-Facts, zitierfähig mit Quellenverweis. Kein Narrativ, keine Werbung. Max. 7 Punkte.',
    length: 'bullet-liste',
    triggerSignals:  ['zielgerichtet', 'effizient', 'validierend'],
    triggerStates:   ['state-3', 'state-9'],
    triggerPersonas: ['P-VER', 'P-BER'],
    triggerIntents:  ['INT-W-01', 'INT-W-06', 'INT-W-09'],
  },
  {
    id: 'PAT-11', label: 'Nachfrage-Schleife',
    trigger: 'State: nach Ergebnispräsentation — Hat das Angebot gepasst?',
    coreRule: '1 kurze Folgefrage: „Hat das gepasst?" — wenn nein: sofort Fallback (andere Suche, engere Filter) anbieten.',
    length: 'kurz',
    triggerSignals:  ['vertrauend', 'neugierig'],
    triggerStates:   ['state-8', 'state-9'],
    triggerPersonas: ['P-LK', 'P-SL', 'P-BER', 'P-ELT'],
    triggerIntents:  ['INT-W-04'],
  },
  {
    id: 'PAT-12', label: 'Überbrückungs-Hinweis',
    trigger: 'Tool gibt leere oder fehlerhafte Antwort — transparente Kommunikation nötig',
    coreRule: 'Transparent kommunizieren: was gesucht wurde, warum kein Treffer. Alternative sofort anbieten.',
    length: 'kurz',
    triggerSignals:  [],
    triggerStates:   ['state-5', 'state-9'],
    triggerPersonas: ['P-LK', 'P-SL', 'P-BER', 'P-ELT', 'P-VER', 'P-RED', 'P-AND'],
    triggerIntents:  [],
  },

  // ── Persona-spezifische Muster ─────────────────────────────────────────────

  {
    id: 'PAT-13', label: 'Schritt-für-Schritt-Führung',
    trigger: 'Persona: P-SL / P-ELT · Signal: überfordert, unerfahren — Lernende oder unterstützende Eltern',
    coreRule: 'Wenn Medientyp explizit (Videos, Arbeitsblätter, Quizze etc.): lookup_wlo_vocabulary(lrt) aufrufen → search_wlo_content mit learningResourceType-Filter. Sonst: search_wlo_collections. Ein Konzept pro Antwort. Verständnisfrage am Ende. Kein Info-Overload.',
    length: 'mittel',
    triggerSignals:  ['ueberfordert', 'unerfahren', 'unsicher', 'gestresst'],
    triggerStates:   ['state-4', 'state-8'],
    triggerPersonas: ['P-SL', 'P-ELT'],
    triggerIntents:  ['INT-W-03c'],
  },
  {
    id: 'PAT-14', label: 'Eltern-Empfehlung',
    trigger: 'Persona: P-ELT — Elternteil sucht kindgerechte Inhalte für Zuhause',
    coreRule: 'Altersgruppe + Thema = 2–3 konkrete Empfehlungen. Kein Fachjargon. Einfache, beruhigende Sprache.',
    length: 'mittel',
    triggerSignals:  ['delegierend', 'vertrauend', 'orientierungssuchend'],
    triggerStates:   ['state-4', 'state-6'],
    triggerPersonas: ['P-ELT'],
    triggerIntents:  ['INT-W-03a', 'INT-W-03c'],
  },
  {
    id: 'PAT-15', label: 'Analyse-Überblick',
    trigger: 'Persona: P-VER / P-BER · Signal: vergleichend — strukturierte Auswertung gefragt',
    coreRule: 'Daten zuerst aus MCP-Webtools abrufen (get_wirlernenonline_info, get_edu_sharing_network_info etc.) — nie aus dem Kopf. Dann: Befund → Zahlen/Belege → Handlungsempfehlung. Tabellarisch wenn möglich. Kein Fließtext.',
    length: 'bullet-liste',
    triggerSignals:  ['vergleichend', 'validierend', 'effizient', 'erfahren'],
    triggerStates:   ['state-3', 'state-9'],
    triggerPersonas: ['P-VER', 'P-BER'],
    triggerIntents:  ['INT-W-06', 'INT-W-08', 'INT-W-09'],
  },
  {
    id: 'PAT-16', label: 'Themen-Exploration',
    trigger: 'Persona: P-RED — Redakteur:in erkundet Themenbereich auf WLO',
    coreRule: 'Themenrecherche für Redaktion: search_wlo_collections für das Fachgebiet → Sammlungen als Überblick zeigen + Einladung, tiefer in eine Themenseite einzutauchen. Einladend, kein Fachjargon.',
    length: 'mittel',
    triggerSignals:  ['neugierig', 'vertrauend', 'zielgerichtet'],
    triggerStates:   ['state-1', 'state-3', 'state-4'],
    triggerPersonas: ['P-RED'],
    triggerIntents:  ['INT-W-01', 'INT-W-03a', 'INT-W-05'],
  },
  {
    id: 'PAT-17', label: 'Sanfter Einstieg',
    trigger: 'Persona: P-AND / P-ELT / P-SL · Signal: orientierungssuchend — erster Kontakt, kein klares Ziel',
    coreRule: 'Bei "Was ist WLO?" oder Plattform-Infofragen: get_wirlernenonline_info aufrufen — KEIN search_wlo_collections. Dann 3 Einstiegswege benennen (Suche, Themenseiten, Frage stellen). Keine Fachbegriffe. Warm und einladend.',
    length: 'normal',
    triggerSignals:  ['orientierungssuchend', 'unerfahren', 'neugierig'],
    triggerStates:   ['state-1'],
    triggerPersonas: ['P-AND', 'P-ELT', 'P-SL'],
    triggerIntents:  ['INT-W-01', 'INT-W-03a'],
  },
  {
    id: 'PAT-18', label: 'Unterrichts-Paket',
    trigger: 'Persona: P-LK · Signal: Zeitdruck, gestresst — Lehrkraft braucht sofort einsetzbare Materialien',
    coreRule: 'Erst search_wlo_collections mit Fach+Klasse → passende Sammlungen als Einstieg. Hinweis: per "📋 Inhalte"-Button direkt in Sammlung eintauchen. Nur bei 0 Treffer oder "zeig mir direkt Materialien" → search_wlo_content. Max. 1 Rückfrage. Lehrkraft entlasten.',
    length: 'normal',
    triggerSignals:  ['zeitdruck', 'gestresst', 'delegierend', 'effizient'],
    triggerStates:   ['state-5', 'state-6', 'state-7'],
    triggerPersonas: ['P-LK', 'P-ELT'],
    triggerIntents:  ['INT-W-03b'],
  },
  {
    id: 'PAT-19', label: 'Unterrichts-Lernpfad',
    trigger: 'Persona: P-LK · Intent: INT-W-10 — Stundenentwurf, Unterrichtsplanung, Lernpfad mit didaktischer Struktur und WLO-Materialien gewünscht',
    coreRule: 'Ablauf: (1) search_wlo_collections für Thema/Fach → beste Sammlung identifizieren. (2) generate_learning_path aufrufen → strukturierter Stundenentwurf. Ausgabe-Format: 🎯 Lernziele (3–5, messbar) | ⏱ Phasierung (Einstieg/Erarbeitung/Vertiefung/Sicherung mit Zeitangaben) | 📚 Methoden + WLO-Materialien (Links) pro Phase | 📝 Lehrerhinweise. (3) BINNENDIFFERENZIERUNG: Falls Teilgruppen erwähnt (z.B. DaZ, LRS, Hochbegabte, Niveaustufen A/B/C) → pro Teilgruppe eigenen Abschnitt mit angepassten Aufgaben, Materialien und Methoden. Ohne Angabe: kurzen "Differenzierungshinweis" am Ende anhängen (einfach/mittel/schwer).',
    length: 'lang',
    triggerSignals:  ['zielgerichtet', 'erfahren', 'zeitdruck', 'effizient'],
    triggerStates:   ['state-6', 'state-7', 'state-8'],
    triggerPersonas: ['P-LK'],
    triggerIntents:  ['INT-W-10', 'INT-W-03b'],
  },
];

export const PATTERN_IDS = PATTERNS.map(p => p.id);

export function getPattern(id: string): Pattern | undefined {
  return PATTERNS.find(p => p.id === id);
}

export function scorePatternsForContext(
  personaId: string,
  signals: string[],
  stateId: string,
  intentId?: string,
  dominantSignal?: string
): Pattern[] {
  return PATTERNS
    .map(p => {
      let score = 0;
      if (intentId && p.triggerIntents.includes(intentId)) score += 4;   // intent = strongest predictor
      if (p.triggerPersonas.includes(personaId)) score += 3;
      if (p.triggerStates.includes(stateId)) score += 3;
      signals.forEach(s => {
        if (p.triggerSignals.includes(s)) {
          score += s === dominantSignal ? 3 : 2;  // dominant signal gets bonus
        }
      });
      return { pattern: p, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(x => x.pattern);
}
