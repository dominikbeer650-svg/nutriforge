import { NextRequest, NextResponse } from 'next/server'

// gemini-1.5-flash ist stabiler und breiter verfügbar
const GEMINI_MODELS = [
    'gemini-1.5-flash',
    'gemini-1.5-flash-latest',
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
      "name": "Push Day – Brust/Schultern/Trizeps",
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

Nutze echte exercise_ids aus dieser Liste (wichtige IDs):
Brust: b001(Bankdrücken), b002(Schrägbank), b004(KH-Drücken), b006(Fliegende), b007(Kabelfliegende), b010(Butterfly), b011(Liegestütze), b014(Dips)
Rücken: r001(Kreuzheben), r003(Klimmzüge), r005(Latzug), r007(Rudern), r009(KH-Rudern), r010(Kabelrudern)
Schultern: s001(Schulterdrücken), s005(Seitheben), s006(Frontheben), s007(Reverse Fly), s004(Arnold Press)
Bizeps: bz001(LH-Curl), bz002(KH-Curl), bz003(Hammercurl), bz005(Preacher Curl)
Trizeps: tz001(Pushdown), tz003(Skull Crusher), tz004(Dips), tz007(Close-Grip BP)
Beine: l001(Kniebeuge), l004(Beinpresse), l005(Ausfallschritte), l007(Bulgarian), l008(Beinstrecker), l009(Beinbeuger)
Gesäß: g001(Hip Thrust), g002(Glute Bridge), g004(Cable Kickback)
Core: c001(Plank), c003(Crunches), c006(Leg Raises), c007(Hanging Leg Raises), c009(Russian Twist)`

export async function POST(req: NextRequest) {
    try {
        const { messages } = await req.json()
        const apiKey = process.env.GEMINI_API_KEY

        if (!apiKey) {
            console.error('GEMINI_API_KEY is not set')
            return NextResponse.json({ error: 'GEMINI_API_KEY nicht konfiguriert' }, { status: 500 })
        }

        // Convert messages to Gemini format
        const contents = messages.map((m: { role: string; content: string }) => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }],
        }))

        // Try models in order until one works
        let lastError = ''
        for (const model of GEMINI_MODELS) {
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

            if (!response.ok) {
                const errBody = await response.json()
                lastError = errBody.error?.message ?? `HTTP ${response.status}`
                console.error(`Model ${model} failed:`, lastError)
                // Try next model
                continue
            }

            const data = await response.json()
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''

            // Extract plan JSON if present
            let plan = null
            const jsonMatch = text.match(/PLAN_JSON_START\s*([\s\S]*?)\s*PLAN_JSON_END/)
            if (jsonMatch) {
                try { plan = JSON.parse(jsonMatch[1]) } catch { /* no plan */ }
            }

            const cleanText = text.replace(/PLAN_JSON_START[\s\S]*?PLAN_JSON_END/g, '').trim()
            return NextResponse.json({ text: cleanText, plan })
        }

        // All models failed
        console.error('All Gemini models failed. Last error:', lastError)
        return NextResponse.json(
            { error: `Gemini API Fehler: ${lastError}` },
            { status: 500 }
        )

    } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unbekannter Fehler'
        console.error('KI Coach error:', msg)
        return NextResponse.json({ error: msg }, { status: 500 })
    }
}
