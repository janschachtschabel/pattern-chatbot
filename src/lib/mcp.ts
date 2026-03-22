const MCP_URL = process.env.MCP_SERVER_URL ?? 'https://wlo-mcp-server.vercel.app/mcp';

let _reqId = 1;

export async function callMcp(
  tool: string,
  args: Record<string, unknown>,
): Promise<string> {
  const id = _reqId++;
  const body = JSON.stringify({
    jsonrpc: '2.0',
    method: 'tools/call',
    params: { name: tool, arguments: args },
    id,
  });

  const res = await fetch(MCP_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
    body,
  });

  const contentType = res.headers.get('content-type') ?? '';

  // SSE response – collect all data lines
  if (contentType.includes('text/event-stream')) {
    const text = await res.text();
    const lines = text.split('\n').filter(l => l.startsWith('data:'));
    for (const line of lines) {
      try {
        const payload = JSON.parse(line.slice(5).trim());
        if (payload.result?.content) {
          return payload.result.content.map((c: { text?: string }) => c.text ?? '').join('\n');
        }
      } catch { /* skip */ }
    }
    return '(keine Ergebnisse)';
  }

  // Plain JSON response
  const json = await res.json();
  if (json.result?.content) {
    return json.result.content.map((c: { text?: string }) => c.text ?? '').join('\n');
  }
  if (json.error) throw new Error(json.error.message ?? 'MCP-Fehler');
  return JSON.stringify(json.result ?? json);
}
