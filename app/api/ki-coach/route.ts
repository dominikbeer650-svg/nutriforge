import { NextRequest, NextResponse } from 'next/server'

const SYSTEM_PROMPT = `Du bist ein professioneller Personal Trainer mit 20 Jahren Erfahrung.
Du erstellst den PERFEKTEN, individualisierten Trainingsplan.

KONVERSATIONSREGELN — SEHR WICHTIG:
- Stelle IMMER NUR EINE EINZIGE Frage pro Nachricht
- Warte auf die Antwort, bevor du die nächste Frage stellst
- Keine Listen mit mehreren Fragen gleichzeitig
- Kurze, freundliche Nachrichten — max 3 Sätze
- Antworte IMMER auf Deutsch

REIHENFOLGE DER FRAGEN (eine nach der anderen):
1. Ziel (Muskelaufbau, Abnehmen, Kraft, Ausdauer)
2. Alter
3. Körpergewicht (in kg)
4. Körpergröße (in cm)  
5. Trainingserfahrung (wie lange schon)
6. Trainingstage pro Woche (wie viele)
7. Zeit pro Einheit (wie viele Minuten)
8. Equipment (Fitnessstudio / Zuhause mit Geräten / Zuhause ohne)
9. Verletzungen oder Einschränkungen (Knie, Rücken, Schulter etc.)
10. Körpertyp (schlank und schwer zunehmen = Ektomorph / Schnell Fett ansetzen = Endomorph / Dazwischen = Mesomorph)

Wenn du ALLE 10 Infos gesammelt hast, erstelle den Plan.
Fasse kurz zusammen was du weißt und erstelle dann den perfekten Plan.

PLAN-FORMAT:
PLAN_JSON_START
{
  "name": "Planname",
  "description": "Kurze Beschreibung warum dieser Plan perfekt für den Nutzer ist",
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
          "notes": "Schwere Grundübung – progressive Überlastung jede Woche +2.5kg"
        }
      ]
    }
  ]
}
PLAN_JSON_END

exercise_ids:
Brust: b001=Bankdrücken, b002=Schrägbank LH, b004=KH-Drücken flach, b005=KH-Drücken Schrägbank, b006=Fliegende KH, b007=Kabelfliegende, b010=Butterfly Maschine, b011=Liegestütze, b014=Dips Brust
Rücken: r001=Kreuzheben, r002=RDL, r003=Klimmzüge, r005=Latzug vorne, r007=LH-Rudern, r009=KH-Rudern einarmig, r010=Kabelrudern, r014=Facepull
Schultern: s001=LH-Schulterdrücken, s002=KH-Schulterdrücken, s004=Arnold Press, s005=Seitheben KH, s006=Frontheben, s007=Reverse Fly
Bizeps: bz001=LH-Curl, bz002=KH-Curl, bz003=Hammercurl, bz004=Konzentrationscurl, bz005=Preacher Curl, bz006=Kabel-Curl
Trizeps: tz001=Seil-Pushdown, tz002=Stangen-Pushdown, tz003=Skull Crusher, tz004=Dips Trizeps, tz005=Overhead Extension KH, tz007=Close-Grip Bankdrücken
Beine: l001=Kniebeuge, l002=Front Squat, l003=Goblet Squat, l004=Beinpresse, l005=Ausfallschritte, l007=Bulgarian Split Squat, l008=Beinstrecker, l009=Beinbeuger, l010=Sumo Kniebeuge
Gesäß: g001=Hip Thrust, g002=Glute Bridge, g003=Sumo Deadlift, g004=Cable Kickback
Core: c001=Plank, c002=Side Plank, c003=Crunches, c005=Bicycle Crunches, c006=Leg Raises, c007=Hanging Leg Raises, c009=Russian Twist, c012=Cable Crunch
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
                        generationConfig: { temperature: 0.7, maxOutputTokens: 3000 },
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
                const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''

                let plan = null
                const jsonMatch = text.match(/PLAN_JSON_START\s*([\s\S]*?)\s*PLAN_JSON_END/)
                if (jsonMatch) {
                    try { plan = JSON.parse(jsonMatch[1]) } catch { /* kein plan */ }
                }

                const cleanText = text.replace(/PLAN_JSON_START[\s\S]*?PLAN_JSON_END/g, '').trim()
                console.log(`[ki-coach] ✓ ${model}`)
                return NextResponse.json({ text: cleanText, plan })

            } catch (fetchErr) {
                lastError = fetchErr instanceof Error ? fetchErr.message : 'Netzwerkfehler'
                console.error(`[ki-coach] ${model} error:`, lastError)
            }
        }

        return NextResponse.json(
            { error: lastStatus === 429 ? 'KI kurz überlastet – bitte 30 Sek warten.' : `Fehler: ${lastError}`, retryable: lastStatus === 429 },
            { status: lastStatus }
        )

    } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unbekannter Fehler'
        console.error('[ki-coach] Fatal:', msg)
        return NextResponse.json({ error: msg }, { status: 500 })
    }
}
