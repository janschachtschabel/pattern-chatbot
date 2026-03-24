import type { Persona } from './types';

export const PERSONA_IDS = ['P-LK','P-SL','P-BER','P-VER','P-ELT','P-RED','P-AND'] as const;
export type PersonaId = typeof PERSONA_IDS[number];

export const PERSONA_MD_FILES: Record<string, string> = {
  'P-LK':  'personas/lk.md',
  'P-SL':  'personas/sl.md',
  'P-BER': 'personas/ber.md',
  'P-VER': 'personas/ver.md',
  'P-ELT': 'personas/elt.md',
  'P-RED': 'personas/red.md',
  'P-AND': 'personas/and.md',
};

export const PERSONAS: Persona[] = [
  {
    id: 'P-LK', label: 'Lehrkraft', emoji: '👩‍🏫',
    shortDesc: 'Unterrichtsvorbereitung, Material für Fach + Klasse',
    tonality: 'Kollegial · praktisch · lösungsorientiert',
    color: 'bg-blue-900/40 border-blue-700',
    detectionHints: [
      'ich unterrichte', 'für meine Klasse', 'Klasse [Zahl]', 'meine Schüler',
      'Unterrichtsstunde', 'Fach ', 'Lehrplan', 'Stunde vorbereiten',
      'Material für den Unterricht', 'Arbeitsblatt', 'OER für Klasse',
      'Themenseiten', 'welche Themen', 'was gibt es auf WLO', 'was gibt es zu',
      'Materialien zu', 'Sammlungen zu', 'gibt es Materialien', 'für den Unterricht',
      'Unterrichtsmaterial', 'Bildungsmaterial', 'für Schüler', 'für die Klasse',
    ],
  },
  {
    id: 'P-SL', label: 'Lerner/in', emoji: '🎒',
    shortDesc: 'Lernmaterial finden, Thema verstehen, Schüler:in oder Studierende:r',
    tonality: 'Einfach · freundlich · ermutigend',
    color: 'bg-green-900/40 border-green-700',
    detectionHints: [
      'ich lerne', 'ich verstehe nicht', 'erkläre mir', 'kannst du mir erklären',
      'wie funktioniert', 'Schritt für Schritt', 'ich bin Schüler', 'ich bin Studentin',
      'Hausaufgaben', 'üben', 'ich möchte verstehen', 'ich kapiere das nicht',
      'einfach erklärt', 'ich brauche Hilfe bei', 'Aufgabe lösen',
    ],
  },
  {
    id: 'P-BER', label: 'Berater/in', emoji: '🤝',
    shortDesc: 'Analysieren, vergleichen, Empfehlungen für Einrichtungen',
    tonality: 'Sachlich · analytisch · Begründungen',
    color: 'bg-teal-900/40 border-teal-700',
    detectionHints: [
      'Vergleich', 'welche Plattform', 'Empfehlung für', 'für unsere Schule',
      'für meine Einrichtung', 'OER-Strategie', 'Beratung', 'evaluieren',
      'welche Materialien eignen sich', 'Einführung von OER', 'Pilotprojekt',
    ],
  },
  {
    id: 'P-VER', label: 'Verwaltung', emoji: '🏛️',
    shortDesc: 'Überblick, Reporting, Zahlen & Fakten zu WLO',
    tonality: 'Strukturiert · klar · datenorientiert',
    color: 'bg-slate-800/60 border-slate-600',
    detectionHints: [
      'Statistiken', 'wie viele Materialien', 'wer steckt dahinter', 'Träger',
      'Fakten über WLO', 'Projektinfos', 'Förderung', 'Bericht', 'Zahlen',
      'WLO Hintergrund', 'offizielle Infos', 'Pressemitteilung',
    ],
  },
  {
    id: 'P-ELT', label: 'Eltern', emoji: '👪',
    shortDesc: 'Passende Inhalte für eigene Kinder finden',
    tonality: 'Freundlich · unterstützend · empfehlend',
    color: 'bg-yellow-900/40 border-yellow-700',
    detectionHints: [
      'mein Kind', 'meine Tochter', 'mein Sohn', 'für zu Hause',
      'zu Hause lernen', 'Hausaufgaben meines Kindes', 'für Kinder',
      'mein Kind ist in Klasse', '[Alter] Jahre alt', 'Nachhilfe',
      'wie kann ich meinem Kind helfen',
    ],
  },
  {
    id: 'P-RED', label: 'Autor/in · Redakteur:in', emoji: '✏️',
    shortDesc: 'WLO-Inhalte redaktionell erkunden, kuratieren und thematisch einordnen',
    tonality: 'Einladend · kompetent · inhaltsorientiert',
    color: 'bg-purple-900/40 border-purple-700',
    detectionHints: [
      'ich bin Redakteur', 'ich kuratiere', 'ich möchte hochladen', 'eigene Materialien',
      'Inhalte einstellen', 'Autor', 'Redaktion', 'Material veröffentlichen',
      'ich habe Materialien erstellt', 'meine OER teilen', 'beitragen',
      'Inhalte prüfen', 'Sammlungen erkunden', 'OER kuratieren', 'was gibt es zu Thema',
    ],
  },
  {
    id: 'P-AND', label: 'andere', emoji: '🌐',
    shortDesc: 'Orientierungssuche, erster Kontakt, Rolle unklar',
    tonality: 'Offen · einladend · robust',
    color: 'bg-indigo-900/30 border-indigo-700',
    detectionHints: [
      'was ist WLO', 'was gibt es hier', 'ich bin neu', 'zeig mir',
      'was kann ich finden', 'ich schaue mich um', 'keine klare Rolle erkennbar',
    ],
  },
];

export function getPersona(id: string): Persona | undefined {
  return PERSONAS.find(p => p.id === id);
}
