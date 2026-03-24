import type { Intent } from './types';

export const INTENTS: Intent[] = [
  {
    id: 'INT-W-01', label: 'WLO kennenlernen',
    description: 'Plattform verstehen, Überblick, Projektinfos',
    mainPersonas: ['P-VER', 'P-RED', 'P-AND'],
    cluster: 'info',
    preconditions: ['Persona erkannt'],
    degradation: 'Allgemeinen Plattform-Überblick geben (statischer Content)',
    tools: ['get_wirlernenonline_info', 'get_edu_sharing_network_info', 'get_edu_sharing_product_info', 'get_metaventis_info'],
  },
  {
    id: 'INT-W-02', label: 'Soft Probing',
    description: 'Preconditions klären, Persona erkennen (intern)',
    mainPersonas: ['P-AND', 'P-LK', 'P-SL', 'P-ELT'],
    cluster: 'klarung',
    preconditions: [],
    degradation: 'Nach 1 unbeantworteter Frage: Degradation aktivieren',
    tools: [],
  },
  {
    id: 'INT-W-03a', label: 'Themenseite entdecken',
    description: 'Passende Themenseite finden, explorativ',
    mainPersonas: ['P-LK', 'P-SL', 'P-BER', 'P-ELT', 'P-RED', 'P-AND'],
    cluster: 'discovery',
    preconditions: ['Fach oder Thema (grob) bekannt'],
    degradation: 'Top-Themenseiten nach Beliebtheit zeigen',
    tools: ['search_wlo_collections', 'get_collection_contents'],
  },
  {
    id: 'INT-W-03b', label: 'Unterrichtsmaterial suchen',
    description: 'Gezielt Material für Fach + Klasse finden',
    mainPersonas: ['P-LK', 'P-ELT'],
    cluster: 'search',
    preconditions: ['Fach bekannt', 'Klassenstufe bekannt'],
    degradation: 'Ohne Klassenstufe: breite Suche nach Fach',
    tools: ['lookup_wlo_vocabulary', 'search_wlo_content', 'get_collection_contents'],
  },
  {
    id: 'INT-W-03c', label: 'Lerninhalt suchen',
    description: 'Lernmaterial finden, Thema verstehen',
    mainPersonas: ['P-SL', 'P-ELT'],
    cluster: 'search',
    preconditions: ['Thema (grob) bekannt'],
    degradation: 'Themenseiten-Übersicht zeigen als sanfter Einstieg',
    tools: ['search_wlo_content', 'get_node_details'],
  },
  {
    id: 'INT-W-04', label: 'Feedback geben',
    description: 'Kein Treffer gefunden oder fehlende Inhalte melden',
    mainPersonas: ['P-LK', 'P-SL', 'P-ELT', 'P-BER', 'P-VER', 'P-RED', 'P-AND'],
    cluster: 'feedback',
    preconditions: [],
    degradation: 'Freitext oder Formular-Link',
    tools: [],
  },
  {
    id: 'INT-W-05', label: 'Redaktions-Recherche',
    description: 'WLO-Inhalte für Redaktion erkunden — Sammlungen finden, Themengebiete einschätzen, Lücken identifizieren',
    mainPersonas: ['P-RED'],
    cluster: 'discovery',
    preconditions: ['Persona = P-RED erkannt', 'Thema oder Fachgebiet (grob) bekannt'],
    degradation: 'Populäre WLO-Sammlungen als redaktionellen Einstieg zeigen',
    tools: ['search_wlo_collections', 'get_collection_contents'],
  },
  {
    id: 'INT-W-06', label: 'Faktenfragen',
    description: 'Zahlen, Belege, zitierfähige Infos',
    mainPersonas: ['P-VER', 'P-BER'],
    cluster: 'info',
    preconditions: ['Persona bekannt'],
    degradation: 'Allgemeine WLO-Fakten aus statischem Content',
    tools: ['get_wirlernenonline_info', 'get_edu_sharing_network_info', 'get_edu_sharing_product_info', 'get_metaventis_info'],
  },
  {
    id: 'INT-W-07', label: 'Material herunterladen',
    description: 'Direkter Zugriff auf ein bekanntes Material',
    mainPersonas: ['P-LK', 'P-SL'],
    cluster: 'search',
    preconditions: ['Node-ID bekannt (aus URL)'],
    degradation: 'Node-ID aus URL lesen',
    tools: ['get_node_details'],
  },
  {
    id: 'INT-W-08', label: 'Inhalte evaluieren',
    description: 'Qualität prüfen, Vergleich, Empfehlung',
    mainPersonas: ['P-BER', 'P-VER', 'P-RED'],
    cluster: 'meta',
    preconditions: ['Mindestens 1 Material oder Sammlung bekannt'],
    degradation: 'Allgemeinen Qualitätshinweis geben',
    tools: ['get_node_details', 'get_collection_contents'],
  },
  {
    id: 'INT-W-09', label: 'Analyse & Reporting',
    description: 'Nutzungsübersicht, Statistiken, KPIs',
    mainPersonas: ['P-VER', 'P-BER'],
    cluster: 'meta',
    preconditions: ['Persona bekannt'],
    degradation: 'Verfügbare Statistiken aus WLO-Projektseite zeigen',
    tools: ['get_wirlernenonline_info', 'get_edu_sharing_network_info', 'get_edu_sharing_product_info', 'get_metaventis_info'],
  },
  {
    id: 'INT-W-10', label: 'Unterrichtsplanung / Lernpfad',
    description: 'Detaillierten Stundenentwurf mit Lernzielen, Zeitangaben, didaktischen Hinweisen und WLO-Materialien erstellen. Binnendifferenzierung für Teilgruppen auf Anfrage.',
    mainPersonas: ['P-LK'],
    cluster: 'planning',
    preconditions: ['Fach oder Thema bekannt'],
    degradation: 'Erst Themenseite per search_wlo_collections suchen, dann Lernpfad-Angebot machen',
    tools: ['search_wlo_collections', 'generate_learning_path'],
  },
];

export const INTENT_IDS = INTENTS.map(i => i.id);

export function getIntent(id: string): Intent | undefined {
  return INTENTS.find(i => i.id === id);
}

export function getIntentsForPersona(personaId: string): Intent[] {
  return INTENTS.filter(i => i.mainPersonas.includes(personaId));
}
