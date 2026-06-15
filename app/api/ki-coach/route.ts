import { NextRequest, NextResponse } from 'next/server'

// Modelle in Reihenfolge — bei 429 nächstes versuchen
const GEMINI_MODELS = [
    'gemini-1.5-flash',
    'gemini-1.5-pro',
    'gemini-pro',
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

PLAN-FORMAT (wenn bereit):
Wenn du bereit bist einen Plan zu erstellen, antworte mit einem normalen Text UND füge am Ende diesen JSON-Block ein:

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

exercise_ids: b001=Bankdrücken, b002=Schrägbank, b004=KH-Drücken, b006=Fliegende, b007=Kabelfly, b010=Butterfly, b011=Liegestütze, b014=Dips, r001=Kreuzheben, r003=Klimmzüge, r005=Latzug, r007=Rudern, r009=KH-Rudern, r010=Kabelrudern, s001=Schulterdrücken, s005=Seitheben, s006=Frontheben, s007=Reverse Fly, s004=Arnold Press, bz001=LH-Curl, bz002=KH-Curl, bz003=Hammercurl, bz005=Preacher Curl, tz001=Pushdown, tz003=Skull Crusher, tz004=Dips, tz007=Close-Grip, l001=Kniebeuge, l004=Beinpresse, l005=Ausfallschritte, l007=Bulgarian, l008=Beinstrecker, l009=Beinbeuger, g001=Hip Thrust, g002=Glute Bridge, c001=Plank, c003=Crunches, c006=Leg Raises, c009=Russian Twist`

// Warte ms Millisekunden
function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

async function callGemini(model: string, contents: unknown[], apiKey: string) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
            contents,
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 2048,
            },
        }),
    })
    return response
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

        // Jeden Model versuchen, bei 429 kurz warten und nächstes probieren
        for (let i = 0; i < GEMINI_MODELS.length; i++) {
            const model = GEMINI_MODELS[i]

            // Retry loop pro Model (max 2 Versuche)
            for (let attempt = 0; attempt < 2; attempt++) {
                const response = await callGemini(model, contents, apiKey)

                if (response.status === 429) {
                    console.log(`429 on ${model} attempt ${attempt + 1}, waiting...`)
                    // Bei 429: 2 Sekunden warten, dann nächstes Model
                    await sleep(2000)
                    break // Nächstes Model probieren
                }

                if (!response.ok) {
                    const err = await response.json()
                    const msg = err.error?.message ?? `HTTP ${response.status}`
                    console.error(`${model} error:`, msg)
                    break // Nächstes Model
                }

                // Erfolg
                const data = await response.json()
                const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''

                let plan = null
                const jsonMatch = text.match(/PLAN_JSON_START\s*([\s\S]*?)\s*PLAN_JSON_END/)
                if (jsonMatch) {
                    try { plan = JSON.parse(jsonMatch[1]) } catch { /* kein Plan */ }
                }

                const cleanText = text.replace(/PLAN_JSON_START[\s\S]*?PLAN_JSON_END/g, '').trim()
                console.log(`Success with model: ${model}`)
                return NextResponse.json({ text: cleanText, plan })
            }
        }

        // Alle Models schlugen fehl
        return NextResponse.json(
            {
                error: 'Der KI-Coach ist gerade überlastet (Rate Limit). Bitte warte 30 Sekunden und versuche es erneut.',
                retryable: true,
            },
            { status: 429 }
        )

    } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unbekannter Fehler'
        console.error('KI Coach error:', msg)
        return NextResponse.json({ error: msg }, { status: 500 })
    }
}
