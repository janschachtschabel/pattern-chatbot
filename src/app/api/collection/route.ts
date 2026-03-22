import { NextRequest } from 'next/server';
import { callMcp } from '@/lib/mcp';
import { parseWloCards } from '@/lib/parseWloCards';

export async function POST(req: NextRequest) {
  const { nodeId, skip = 0 } = await req.json() as { nodeId: string; skip?: number };

  if (!nodeId) {
    return Response.json({ error: 'nodeId fehlt', cards: [] }, { status: 400 });
  }

  try {
    const raw = await callMcp('get_collection_contents', { nodeId, skip });
    const cards = parseWloCards(raw, 'content');
    const totalMatch = raw.match(/Gefundene Treffer gesamt:\s*(\d+)/);
    const total = totalMatch ? parseInt(totalMatch[1], 10) : skip + cards.length;
    return Response.json({ cards, total, skip });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return Response.json({ error: msg, cards: [] }, { status: 500 });
  }
}
