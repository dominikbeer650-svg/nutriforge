import { NextRequest, NextResponse } from 'next/server'

const SYSTEM_PROMPT = `Du bist ein erfahrener Personal Trainer und Sportwissenschaftler.
Du führst ein natürliches Gespräch um den PERFEKTEN Trainingsplan zu erstellen.

GESPRÄCHSREGELN:
- Stelle IMMER nur EINE Frage pro Nachricht — nie mehrere auf einmal
- Kurze, freundliche Nachrichten (max 3 Sätze + eine Frage)
- Antworte IMMER auf Deutsch
- Reagiere natürlich und empathisch auf die Antworten
- Du entscheidest selbst welche Infos du brauchst (Ziel, Erfahrung, Zeit, Equipment, Alter, Gewicht, Verletzungen etc.)
- Wenn du genug weißt, erstelle den Plan

SÄTZE & WIEDERHOLUNGEN — DIESE REGELN SIND PFLICHT:
- Grundübungen (Bankdrücken, Kniebeuge, Kreuzheben, Schulterdrücken, Klimmzüge, Rudern): 4 Sätze, 6-8 Wdh, 120s Pause
- Isolationsübungen (Curl, Pushdown, Seitheben, Fliegende, Crunches etc.): 3 Sätze, 10-12 Wdh, 60-90s Pause
- Core-Übungen (Plank, Russian Twist, Leg Raises): 3 Sätze, 12-15 Wdh oder 30-45 Sek, 60s Pause
- Beinübungen Maschinen (Beinpresse, Beinstrecker, Beinbeuger): 4 Sätze, 10-12 Wdh, 90s Pause
- NIEMALS weniger als 3 Sätze oder mehr als 5 Sätze pro Übung
- IMMER konkrete Zahlen — kein "3-4" bei Sätzen, immer z.B. "4"

ANTWORTFORMAT — IMMER dieses JSON, kein Markdown:
{
  "message": "Deine Nachricht",
  "chips": ["Option 1", "Option 2", "Option 3"],
  "plan": null
}

Chips: 2-5 konkrete, kurze Antwortmöglichkeiten passend zur aktuellen Frage.
Bei keinen sinnvollen Chips: "chips": []

Wenn Plan fertig:
{
  "message": "Hier ist dein Plan! [kurze Erklärung warum dieser Plan perfekt passt]",
  "chips": ["✅ Perfekt, speichern!", "🔄 Anpassen", "📅 Mehr Tage", "📅 Weniger Tage"],
  "plan": {
    "name": "Planname",
    "description": "Persönliche Erklärung warum dieser Plan optimal für den Nutzer ist",
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
            "notes": "Schwere Grundübung – +2.5kg wenn alle 8 Wdh sauber"
          },
          {
            "exercise_name": "Butterfly",
            "exercise_id": "b010",
            "sets": 3,
            "reps": "10-12",
            "rest_seconds": 60,
            "notes": "Isolation, volle Dehnung unten halten"
          }
        ]
      }
    ]
  }
}

exercise_ids:
Brust: b001=Bankdrücken(Grund), b002=Schrägbank LH(Grund), b004=KH-Drücken flach, b005=KH-Drücken Schrägbank, b006=Fliegende KH(Iso), b007=Kabelfliegende(Iso), b010=Butterfly(Iso), b011=Liegestütze, b014=Dips(Grund)
Rücken: r001=Kreuzheben(Grund), r002=RDL(Grund), r003=Klimmzüge(Grund), r005=Latzug(Grund), r007=LH-Rudern(Grund), r009=KH-Rudern(Grund), r010=Kabelrudern, r014=Facepull(Iso)
Schultern: s001=LH-Schulterdrücken(Grund), s002=KH-Schulterdrücken(Grund), s004=Arnold Press(Grund), s005=Seitheben(Iso), s006=Frontheben(Iso), s007=Reverse Fly(Iso)
Bizeps: bz001=LH-Curl(Iso), bz002=KH-Curl(Iso), bz003=Hammercurl(Iso), bz004=Konzentrationscurl(Iso), bz005=Preacher Curl(Iso), bz006=Kabel-Curl(Iso)
Trizeps: tz001=Seil-Pushdown(Iso), tz002=Stangen-Pushdown(Iso), tz003=Skull Crusher(Iso), tz004=Dips Trizeps(Grund), tz005=Overhead Extension(Iso), tz007=Close-Grip BP(Grund)
Beine: l001=Kniebeuge(Grund), l002=Front Squat(Grund), l003=Goblet Squat, l004=Beinpresse(Maschine), l005=Ausfallschritte, l007=Bulgarian Split Squat(Grund), l008=Beinstrecker(Maschine), l009=Beinbeuger(Maschine)
Gesäß: g001=Hip Thrust(Grund), g002=Glute Bridge, g003=Sumo Deadlift(Grund), g004=Cable Kickback(Iso)
Core: c001=Plank, c002=Side Plank, c003=Crunches(Iso), c005=Bicycle Crunches, c006=Leg Raises, c007=Hanging Leg Raises, c009=Russian Twist, c012=Cable Crunch(Iso)
Waden: w001=Wadenheben stehend, w002=Wadenheben sitzend`

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

async function getAvailableModels(apiKey: string): Promise<string[]> {
    try {
        const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}&pageSize=50`
        )
        if (!res.ok) return []
        const data = await res.json()
        return (data.models ?? [])
            .filter((m: { name: string; supportedGenerationMethods?: string[] }) =>
                m.name.includes('flash') &&
                (m.supportedGenerationMethods ?? []).includes('generateContent')
            )
            .map((m: { name: string }) => m.name.replace('models/', ''))
            .sort((a: string, b: string) => {
                if (a.includes('lite')) return -1
                if (b.includes('lite')) return 1
                return 0
            })
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

        const dynamicModels = await getAvailableModels(apiKey)
        const fallback = ['gemini-2.5-flash-lite', 'gemini-2.5-flash', 'gemini-1.5-flash-8b', 'gemini-1.5-flash']
        const modelsToTry = dynamicModels.length > 0 ? dynamicModels : fallback

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
                        generationConfig: {
                            temperature: 0.8,
                            maxOutputTokens: 3000,
                            responseMimeType: 'application/json',
                        },
                    }),
                })

                lastStatus = response.status

                if (!response.ok) {
                    const errBody = await response.json().catch(() => ({}))
                    lastError = errBody.error?.message ?? `HTTP ${response.status}`
                    console.error(`[ki-coach] ${model} → ${response.status}: ${lastError.slice(0, 120)}`)
                    if (response.status === 429) await sleep(1000)
                    continue
                }

                const data = await response.json()
                const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}'

                let parsed: { message?: string; chips?: string[]; plan?: unknown } = {}
                try {
                    const clean = rawText.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim()
                    parsed = JSON.parse(clean)
                } catch {
                    parsed = { message: rawText, chips: [] }
                }

                console.log(`[ki-coach] ✓ ${model}`)
                return NextResponse.json({
                    text: parsed.message ?? '',
                    chips: Array.isArray(parsed.chips) ? parsed.chips : [],
                    plan: parsed.plan ?? null,
                })

            } catch (fetchErr) {
                lastError = fetchErr instanceof Error ? fetchErr.message : 'Netzwerkfehler'
                console.error(`[ki-coach] ${model} error:`, lastError)
            }
        }

        return NextResponse.json(
            {
                error: lastStatus === 429
                    ? 'KI kurz überlastet – bitte 30 Sek warten.'
                    : `Fehler: ${lastError}`,
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
