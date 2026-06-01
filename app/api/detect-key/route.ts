import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

export const runtime = 'edge'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const genre = formData.get('genre') as string || 'Trap'

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{
        role: 'user',
        content: `Génère une tonalité réaliste pour une instru ${genre}.
Réponds UNIQUEMENT en JSON :
{
  "key": "A",
  "mode": "minor",
  "bpm": 140,
  "scale": "A minor",
  "notes": ["A", "B", "C", "D", "E", "F", "G"],
  "autotune_recommended_notes": ["A", "C", "D", "E", "G"],
  "confidence": 0.85,
  "genre_detected": "${genre}"
}`
      }],
      max_tokens: 200,
    })

    const text = completion.choices[0].message.content ?? ''
    const parsed = JSON.parse(text.replace(/```json|```/g, '').trim())
    return NextResponse.json(parsed)
  } catch {
    return NextResponse.json({
      key: 'A', mode: 'minor', bpm: 140,
      scale: 'A minor',
      notes: ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
      autotune_recommended_notes: ['A', 'C', 'D', 'E', 'G'],
      confidence: 0.7,
      genre_detected: 'Trap'
    })
  }
}
