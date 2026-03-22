import OpenAI from 'openai';
import { callMcp } from '@/lib/mcp';
import { parseWloCards } from '@/lib/parseWloCards';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  const { nodeId, title } = (await req.json()) as { nodeId: string; title: string };

  if (!nodeId) {
    return Response.json({ error: 'nodeId fehlt' }, { status: 400 });
  }

  // 1. Inhalte der Sammlung direkt per MCP holen (wie Boerdi)
  let raw = '';
  try {
    raw = await callMcp('get_collection_contents', { nodeId });
  } catch (e: unknown) {
    return Response.json({ error: String(e) }, { status: 500 });
  }

  const cards = parseWloCards(raw, 'content');
  if (cards.length === 0) {
    return Response.json({ error: `Keine Inhalte in „${title}" gefunden.` }, { status: 404 });
  }

  // 2. Materialliste für LLM-Prompt aufbauen
  const materialList = cards.map((c, i) => {
    const types = c.learningResourceTypes.length ? ` [${c.learningResourceTypes.join(', ')}]` : '';
    const desc  = c.description ? ` – ${c.description.slice(0, 120)}` : '';
    return `${i + 1}. **${c.title}**${types}${desc}`;
  }).join('\n');

  const userPrompt =
    `Erstelle einen strukturierten Lernpfad für das Thema „${title}" ` +
    `auf Basis der folgenden Materialien aus der WLO-Sammlung:\n\n${materialList}\n\n` +
    `Strukturiere die Materialien in sinnvolle Lernschritte ` +
    `(z. B. Einstieg → Erarbeitung → Vertiefung → Anwendung/Abschluss). ` +
    `Erkläre pro Schritt kurz, welches Material eingesetzt wird und warum es an dieser Stelle passt. ` +
    `Antworte auf Deutsch, halte dich kurz und prägnant.`;

  // 3. SSE-Stream: erst Kacheln, dann LLM-Text
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const emit = (obj: object) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));

      // Cards zuerst senden (werden im Chat als Tiles angezeigt)
      emit({ type: 'cards', data: cards });

      // LLM streamen
      try {
        const completion = await client.chat.completions.create({
          model: 'gpt-4.1-mini',
          stream: true,
          messages: [
            {
              role: 'system',
              content: 'Du bist ein Bildungsexperte. Du hilfst Lehrkräften, ' +
                       'strukturierte Lernpfade aus vorhandenen OER-Materialien zu erstellen.',
            },
            { role: 'user', content: userPrompt },
          ],
        });

        for await (const chunk of completion) {
          const delta = chunk.choices[0]?.delta?.content ?? '';
          if (delta) emit({ type: 'content', delta });
        }
      } catch (e: unknown) {
        emit({ type: 'error', message: String(e) });
      }

      emit({ type: 'done' });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache',
    },
  });
}
