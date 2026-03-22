export interface DynamicTrait {
  id: string;
  label: string;
  emoji: string;
  description: string;
  signals: string[];         // linguistic signals that suggest this trait
  responseHint: string;      // how to adapt the response
}

export const DYNAMIC_TRAITS: DynamicTrait[] = [
  {
    id: 'impatient',
    label: 'Ungeduldig',
    emoji: '⚡',
    description: 'Möchte schnell zum Ergebnis kommen',
    signals: ['kurz', 'schnell', 'sofort', 'einfach nur', 'direkt', 'bitte kurz', 'sehr kurze Nachrichten'],
    responseHint: 'Sehr knapp, direkt zum Punkt, keine langen Erklärungen',
  },
  {
    id: 'skeptical',
    label: 'Skeptisch',
    emoji: '🤨',
    description: 'Hinterfragt Aussagen, möchte Belege',
    signals: ['wirklich?', 'bist du sicher', 'stimmt das', 'woher weißt', 'quelle', 'nachweis'],
    responseHint: 'Fakten, Quellen, transparente Argumentation — keine Übertreibungen',
  },
  {
    id: 'enthusiastic',
    label: 'Begeistert',
    emoji: '🌟',
    description: 'Hochmotiviert, positiv gestimmt',
    signals: ['super', 'toll', 'wow', 'fantastisch', 'genau das', '!', '😊', 'perfekt'],
    responseHint: 'Energie aufgreifen, mit Empfehlungen weitermachen, Möglichkeiten aufzeigen',
  },
  {
    id: 'overwhelmed',
    label: 'Überfordert',
    emoji: '😵',
    description: 'Fühlt sich von Infos/Möglichkeiten erschlagen',
    signals: ['verstehe nicht', 'zu viel', 'verwirrt', 'weiß nicht', 'keine ahnung', 'hilf mir'],
    responseHint: 'Stark vereinfachen, schrittweise führen, nur eine Sache auf einmal',
  },
  {
    id: 'goal_oriented',
    label: 'Zielgerichtet',
    emoji: '🎯',
    description: 'Klare, konkrete Anfragen — weiß was er/sie will',
    signals: ['ich brauche', 'für klasse', 'zum thema', 'mit filter', 'genau', 'spezifisch'],
    responseHint: 'Direkt die beste Lösung liefern, keine Rückfragen außer wenn nötig',
  },
  {
    id: 'exploratory',
    label: 'Explorativ',
    emoji: '🔭',
    description: 'Browst offen, noch kein klares Ziel',
    signals: ['mal schauen', 'gibt es', 'was habt ihr', 'irgendwas zu', 'zeig mir einfach'],
    responseHint: 'Überblick bieten, Optionen vorstellen, Entdeckung ermöglichen',
  },
  {
    id: 'expert',
    label: 'Fachkundig',
    emoji: '🎓',
    description: 'Verwendet Fachsprache, kennt sich aus',
    signals: ['didaktisch', 'curriculum', 'kompetenzorientiert', 'OER', 'lizenz', 'repository', 'metadaten'],
    responseHint: 'Fachsprache verwenden, Details nicht vereinfachen, auf Augenhöhe',
  },
  {
    id: 'time_pressed',
    label: 'Zeitkritisch',
    emoji: '⏰',
    description: 'Steht unter Zeitdruck',
    signals: ['morgen', 'heute noch', 'gleich', 'für nächste stunde', 'bis', 'dringend'],
    responseHint: 'Sofort verwendbare Lösungen priorisieren, keine langen Erklärungen',
  },
];

export function getTrait(id: string): DynamicTrait | undefined {
  return DYNAMIC_TRAITS.find(t => t.id === id);
}

export const TRAIT_IDS = DYNAMIC_TRAITS.map(t => t.id);
