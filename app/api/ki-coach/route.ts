import { NextRequest, NextResponse } from 'next/server'

// Aktuelle Gemini Modelle (Stand Juni 2026)
// 2.0 Flash wurde März 2026 abgeschaltet!
const GEMINI_MODELS = [
    'gemini-2.5-flash-lite-preview-06-17',  // Neuestes, 15 RPM, 1000 RPD
    'gemini-2.5-flash-preview-05-20',        // 10 RPM, 250 RPD
    'gemini-2.5-flash',                      // Fallback
    'gemini-2.5-flash-latest',               // Alias
]

const SYSTEM_PROMPT = `Du bist ein professioneller Personal Trainer und Sportwissenschaftler mit 20 Jahren Erfahrung.
Du erstellst PERFEKTE, wissenschaftlich fundierte Trainingspläne auf Basis der individuellen Angaben des Nutzers.

WICHTIGE REGELN:
- Antworte IMMER auf Deutsch
- Stelle gezielte Fragen um den BESTEN Plan zu erstellen
- Wenn du genug Infos hast, erstelle einen vollständigen Plan im JSON-Format
- Berücksichtige: Ziel, Erfahrungslevel, verfügbare Zeit, Equipment, Verletzungen, Körpertyp
- Erkläre WARUM du bestimmte Übungen wählst (kurz)
- Periodisierung und progressive Überlastung einplanen

PLAN-FORMAT (wenn du alle nötigen Infos hast):
PLAN_JSON_START
{
  "name": "Planname",
  "description": "Kurzbeschreibung",
  "days_per_week": 4,
  "goal": "Muskelaufbau",
  "difficulty": "Fortgeschritten",
  "duration_weeks": 8,
  "days": [
    {
      "day_number": 1,
      "name": "Push Day",
      "focus": "Brust, Schultern, Trizeps",
      "exercises": [
        {
          "exercise_name": "Flachbankdrücken",
          "exercise_id": "b001",
          "sets": 4,
          "reps": "6-8",
          "rest_seconds": 120,
          "notes": "Schwere Grundübung"
        }
      ]
    }
  ]
}
PLAN_JSON_END

exercise_ids: b001=Bankdrücken, b002=Schrägbank, b004=KH-Drücken, b006=Fliegende, b007=Kabelfly, b010=Butterfly, b011=Liegestütze, b014=Dips, r001=Kreuzheben, r003=Klimmzüge, r005=Latzug, r007=Rudern, r009=KH-Rudern, s001=Schulterdrücken, s005=Seitheben, s006=Frontheben, s007=Reverse Fly, s004=Arnold Press, bz001=LH-Curl, bz002=KH-Curl, bz003=Hammercurl, tz001=Pushdown, tz003=Skull Crusher, tz004=Dips, l001=Kniebeuge, l004=Beinpresse, l005=Ausfallschritte, l007=Bulgarian, l008=Beinstrecker, l009=Beinbeuger, g001=Hip Thrust, g002=Glute Bridge, c001=Plank, c003=Crunches, c006=Leg Raises`

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

export async function POST(req: NextRequest) {
    try {
        const { messages } = await req.json()
        const apiKey = process.env.GEMINI_API_KEY

        if (!apiKey) {
            return NextResponse.json({ error: 'GEMINI_API_KEY nicht gesetzt' }, { status: 500 })
        }

        const contents = messages.map((m: { role: string; content: string }) => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }],
        }))

        let lastError = ''
        let lastStatus = 500

        for (const model of GEMINI_MODELS) {
            try {
                const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
                        contents,
                        generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
                    }),
                })

                lastStatus = response.status

                if (!response.ok) {
                    const errBody = await response.json().catch(() => ({}))
                    lastError = errBody.error?.message ?? `HTTP ${response.status}`
                    console.error(`[ki-coach] ${model} → ${response.status}: ${lastError}`)
                    if (response.status === 429) await sleep(1500)
                    continue
                }

                const data = await response.json()
                const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''

                let plan = null
                const jsonMatch = text.match(/PLAN_JSON_START\s*([\s\S]*?)\s*PLAN_JSON_END/)
                if (jsonMatch) {
                    try { plan = JSON.parse(jsonMatch[1]) } catch { /* kein Plan im Text */ }
                }

                const cleanText = text.replace(/PLAN_JSON_START[\s\S]*?PLAN_JSON_END/g, '').trim()
                console.log(`[ki-coach] ✓ ${model}`)
                return NextResponse.json({ text: cleanText, plan })

            } catch (fetchErr) {
                lastError = fetchErr instanceof Error ? fetchErr.message : 'Netzwerkfehler'
                console.error(`[ki-coach] ${model} fetch error:`, lastError)
            }
        }

        return NextResponse.json(
            {
                error: lastStatus === 429
                    ? 'KI kurz überlastet – bitte 30 Sekunden warten und nochmal senden.'
                    : `KI Fehler: ${lastError}`,
                retryable: lastStatus === 429,
            },
            { status: lastStatus }
        )

    } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unbekannter Fehler'
        console.error('[ki-coach] Fatal:', msg)
        return NextResponse.json({ error: msg }, { status: 500 })
    }
}
