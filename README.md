# 🐦 Birdpattern – WLO Chatbot

Ein intelligenter Chatbot für die **WirLernenOnline (WLO)** Plattform. Birdpattern erkennt Persona, Kontext, Signale und Intentionen des Nutzers und wählt daraus das passende Antwort-Pattern aus – statt starre Dialoge abzuarbeiten.

---

## Konzept

```
Persona · Signal · Kontext · Intent · State
              ↓
         Pattern-Auswahl
              ↓
   MCP-Tools (WLO-Suche, Sammlungen…)
              ↓
         Streaming-Antwort
```

Die Kernidee: jede Antwort wird aus **5 Dimensionen** abgeleitet:

| Dimension | Beschreibung | Beispiel |
|-----------|-------------|---------|
| **Persona** | Wer fragt? | Lehrkraft, Lerner, Elternteil |
| **Signal** | Wie fragt die Person? | Unter Zeitdruck, Neugierig, Skeptisch |
| **Kontext** | Was ist bekannt? | Fach, Klasse, Thema |
| **Intent** | Was will die Person? | Unterrichtsmaterial suchen, WLO kennenlernen |
| **State** | Wo im Gespräch? | Orientierung, Suche & Retrieval, Ergebnis |

---

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **UI:** React 18 + TailwindCSS + Lucide Icons
- **KI:** OpenAI SDK (`gpt-4.1-mini`), Streaming via Server-Sent Events
- **WLO-Daten:** WLO MCP Server (`https://wlo-mcp-server.vercel.app/mcp`)
- **Port:** `3333`

---

## Schnellstart

```bash
cd birdpattern
npm install

# .env.local anlegen:
echo "OPENAI_API_KEY=sk-..." > .env.local
# optional:
echo "MCP_SERVER_URL=https://wlo-mcp-server.vercel.app/mcp" >> .env.local

npm run dev   # → http://localhost:3333
```

---

## Umgebungsvariablen

| Variable | Pflicht | Default | Beschreibung |
|----------|---------|---------|-------------|
| `OPENAI_API_KEY` | ✅ | – | OpenAI API Key |
| `MCP_SERVER_URL` | ❌ | `https://wlo-mcp-server.vercel.app/mcp` | WLO MCP Server URL |

---

## Projektstruktur

```
birdpattern/
├── src/
│   ├── app/
│   │   ├── page.tsx                  # Haupt-UI, State-Management
│   │   └── api/
│   │       ├── chat/route.ts         # Chat-Endpunkt (SSE Streaming)
│   │       └── learning-path/route.ts # Lernpfad-Generator (SSE)
│   ├── components/
│   │   ├── ChatPanel.tsx             # Chat-Interface
│   │   └── DebugPanel.tsx            # Debug-Ansicht (Input/Output)
│   └── lib/
│       ├── types.ts                  # Alle TypeScript-Interfaces
│       ├── patterns.ts               # 18 Antwort-Patterns
│       ├── personas.ts               # 7 Personas + Erkennungsmerkmale
│       ├── intents.ts                # 10 Intentionen
│       ├── states.ts                 # 11 Konversations-States
│       ├── signals.ts                # 17 Signale in 4 Dimensionen
│       └── mcp.ts                    # WLO MCP Client
└── public/
    └── personas/                     # Persona-Prompts als Markdown
        ├── lk.md                     # Lehrkraft
        ├── sl.md                     # Lerner/in
        ├── ber.md                    # Berater/in
        ├── ver.md                    # Verwaltung
        ├── elt.md                    # Eltern
        ├── red.md                    # Autor/in · Redakteur:in
        └── and.md                    # Andere / Unbekannt
```

---

## API-Routen

### `POST /api/chat`

Streaming-Chat. Verarbeitet Nutzernachrichten in 3 Phasen:

1. **classify_input** – LLM ermittelt Persona, Signale, Intent, State, Kontext
2. **select_output** – LLM wählt passendes Pattern + Content-Typ + Tools
3. **Execute** – MCP-Tools ausführen, finale Antwort streamen

**Body:**
```json
{
  "messages": [...],
  "currentStateId": "state-1",
  "currentPersonaId": "P-AND",
  "signalHistory": [],
  "contentContext": {}
}
```

**SSE-Events:**
| Event | Inhalt |
|-------|--------|
| `debug/input` | InputClassification (Persona, Signale, Intent, State) |
| `debug/output` | OutputSelection (Pattern, Content-Typ, Tools) |
| `text` | Streaming-Text der Antwort |
| `card` | WLO-Inhaltskarte (Materialien, Sammlungen) |
| `done` | Abschluss |

### `POST /api/learning-path`

Generiert einen strukturierten Lernpfad aus einer WLO-Sammlung (Themenseite).

**Body:**
```json
{ "collectionId": "...", "collectionTitle": "..." }
```

---

## Personas

| ID | Emoji | Bezeichnung | Typische Anfragen |
|----|-------|-------------|-------------------|
| `P-LK` | 👩‍🏫 | Lehrkraft | Unterrichtsmaterial für Fach + Klasse |
| `P-SL` | 🎒 | Lerner/in | Thema verstehen, Übungsaufgaben |
| `P-BER` | 🤝 | Berater/in | OER-Strategie, Plattformvergleich |
| `P-VER` | 🏛️ | Verwaltung | Statistiken, Projektinfos |
| `P-ELT` | 👪 | Eltern | Lernmaterial für Kind |
| `P-RED` | ✏️ | Autor/in · Redakteur:in | Inhalte hochladen → Routing |
| `P-AND` | 🧭 | Andere / Unbekannt | Allgemeiner Einstieg |

---

## Verfügbare MCP-Tools

| Tool | Beschreibung |
|------|-------------|
| `search_wlo_collections` | Sammlungen / Themenseiten suchen |
| `search_wlo_content` | Einzelmaterialien suchen |
| `get_collection_contents` | Inhalt einer Sammlung abrufen |
| `get_node_details` | Details zu einem Material |
| `lookup_wlo_vocabulary` | WLO-Vokabular (Fächer, Bildungsstufen) |
| `get_wirlernenonline_info` | Allgemeine WLO-Plattforminfos |
| `get_edu_sharing_product_info` | edu-sharing Produktinfos |
| `get_edu_sharing_network_info` | edu-sharing Netzwerkinfos |
| `get_metaventis_info` | Metaventis-Infos |

---

## Konfiguration pflegen

Die Datendateien in `src/lib/` können direkt bearbeitet werden – oder komfortabel über das **Birdpattern Studio** (siehe separates Projekt).

**Export-Workflow (mit Studio):**
1. Im Studio bearbeiten
2. TypeScript-Dateien exportieren
3. In `birdpattern/src/lib/` ablegen
4. `npm run dev` neu starten

---

## Vercel Deployment

```bash
npm run build   # Build testen
vercel --prod   # Deployen
```

Umgebungsvariablen in Vercel Dashboard setzen:
- `OPENAI_API_KEY`
- `MCP_SERVER_URL` (optional)
