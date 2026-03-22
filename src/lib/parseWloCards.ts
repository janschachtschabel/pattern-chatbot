import type { WloCard } from './types';

/** Parst das renderToText-Format des WLO-MCP-Servers in WloCard-Objekte. */
export function parseWloCards(text: string, defaultType: 'collection' | 'content'): WloCard[] {
  if (!text) return [];
  const blocks = text.split(/\n(?=## )/);
  return blocks.map(block => {
    const lines = block.split('\n');
    const title = (lines[0] ?? '').replace(/^##\s+/, '').trim();
    const get = (key: string): string => {
      const line = lines.find(l => l.startsWith(key + ': '));
      return line ? line.slice(key.length + 2).trim() : '';
    };
    const getList = (key: string): string[] => {
      const val = get(key);
      return val ? val.split(', ').map(s => s.trim()).filter(Boolean) : [];
    };
    const nodeId = get('nodeId');
    return {
      nodeId,
      title,
      description: get('Beschreibung'),
      disciplines: getList('Fach'),
      educationalContexts: getList('Bildungsstufe'),
      keywords: getList('Schlagworte'),
      learningResourceTypes: getList('Ressourcentyp'),
      url: get('URL'),
      previewUrl: get('Vorschaubild'),
      license: get('Lizenz'),
      publisher: get('Anbieter'),
      wloUrl: nodeId ? `https://redaktion.openeduhub.net/edu-sharing/components/render/${nodeId}` : '',
      nodeType: get('Typ') === 'Sammlung' ? 'collection' : get('Typ') === 'Inhalt' ? 'content' : defaultType,
    } as WloCard;
  }).filter(c => !!c.nodeId && !!c.title);
}
