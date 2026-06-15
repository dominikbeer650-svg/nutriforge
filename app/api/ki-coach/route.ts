import { NextRequest, NextResponse } from 'next/server'

// Erst alle Modelle dynamisch abfragen, dann das erste funktionierende nehmen
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
          "notes": "Schwere Grundübung, progressive Überlastung"
        }
      ]
    }
  ]
}
PLAN_JSON_END

exercise_ids: b001=Bankdrücken, b002=Schrägbank, b004=KH-Drücken, b006=Fliegende, b007=Kabelfly, b010=Butterfly, b011=Liegestütze, b014=Dips(Brust), r001=Kreuzheben, r003=Klimmzüge, r005=Latzug, r007=Rudern, r009=KH-Rudern, s001=Schulterdrücken, s005=Seitheben, s006=Frontheben, s007=Reverse Fly, s004=Arnold Press, bz001=LH-Curl, bz002=KH-Curl, bz003=Hammercurl, tz001=Pushdown, tz003=Skull Crusher, tz004=Dips(Trizeps), l001=Kniebeuge, l004=Beinpresse, l005=Ausfallschritte, l007=Bulgarian, l008=Beinstrecker, l009=Beinbeuger, g001=Hip Thrust, g002=Glute Bridge, c001=Plank, c003=Crunches, c006=Leg Raises`

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

// Verfügbare Flash-Modelle direkt von der API holen
async function getAvailableModels(apiKey: string): Promise<string[]> {
    try {
        const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}&pageSize=50`,
            { method: 'GET' }
        )
        if (!res.ok) return []
        const data = await res.json()
        // Nur generateContent-fähige Flash-Modelle
        const models: string[] = (data.models ?? [])
            .filter((m: { name: string; supportedGenerationMethods?: string[] }) =>
                m.name.includes('flash') &&
                (m.supportedGenerationMethods ?? []).includes('generateContent')
            )
            .map((m: { name: string }) => m.name.replace('models/', ''))
            // Flash-Lite zuerst (höheres RPM-Limit)
            .sort((a: string, b: string) => {
                if (a.includes('lite')) return -1
                if (b.includes('lite')) return 1
                return 0
            })
        console.log('[ki-coach] Available models:', models)
        return models
    } catch {
        return []
    }
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

        // Modelle dynamisch abrufen
        const dynamicModels = await getAvailableModels(apiKey)

        // Fallback-Liste falls dynamisch nichts kommt
        const fallbackModels = [
            'gemini-2.5-flash-lite',
            'gemini-2.5-flash',
            'gemini-1.5-flash-8b',
            'gemini-1.5-flash',
        ]

        const modelsToTry = dynamicModels.length > 0 ? dynamicModels : fallbackModels
        console.log('[ki-coach] Trying models:', modelsToTry)

        let lastError = ''
        let lastStatus = 500

        for (const model of modelsToTry) {
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
                    console.error(`[ki-coach] ${model} → ${response.status}: ${lastError.slice(0, 100)}`)
                    if (response.status === 429) await sleep(1000)
                    continue
                }

                const data = await response.json()
                const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''

                let plan = null
                const jsonMatch = text.match(/PLAN_JSON_START\s*([\s\S]*?)\s*PLAN_JSON_END/)
                if (jsonMatch) {
                    try { plan = JSON.parse(jsonMatch[1]) } catch { /* kein Plan */ }
                }

                const cleanText = text.replace(/PLAN_JSON_START[\s\S]*?PLAN_JSON_END/g, '').trim()
                console.log(`[ki-coach] ✓ Success with: ${model}`)
                return NextResponse.json({ text: cleanText, plan })

            } catch (fetchErr) {
                lastError = fetchErr instanceof Error ? fetchErr.message : 'Netzwerkfehler'
                console.error(`[ki-coach] ${model} fetch error:`, lastError)
            }
        }

        console.error('[ki-coach] All models failed. Last:', lastError, lastStatus)
        return NextResponse.json(
            {
                error: lastStatus === 429
                    ? 'KI kurz überlastet – bitte 30 Sekunden warten und nochmal senden.'
                    : `KI Fehler (${lastStatus}): ${lastError}`,
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
