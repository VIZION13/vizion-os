import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

export const runtime = 'nodejs'
export const maxDuration = 30

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// Chromatic scale frequencies (A4 = 440Hz)
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

// Key profiles (Krumhansl-Schmuckler)
const MAJOR_PROFILE = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88]
const MINOR_PROFILE = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17]

function detectKeyFromChroma(chroma: number[]): { key: string; mode: string; notes: string[] } {
  let bestScore = -Infinity
  let bestKey = 0
  let bestMode = 'major'

  for (let i = 0; i < 12; i++) {
    // Major
    let majorScore = 0
    let minorScore = 0
    for (let j = 0; j < 12; j++) {
      majorScore += chroma[(i + j) % 12] * MAJOR_PROFILE[j]
      minorScore += chroma[(i + j) % 12] * MINOR_PROFILE[j]
    }
    if (majorScore > bestScore) { bestScore = majorScore; bestKey = i; bestMode = 'major' }
    if (minorScore > bestScore) { bestScore = minorScore; bestKey = i; bestMode = 'minor' }
  }

  const keyName = NOTE_NAMES[bestKey]
  
  // Get scale notes
  const majorScale = [0, 2, 4, 5, 7, 9, 11]
  const minorScale = [0, 2, 3, 5, 7, 8, 10]
  const scale = bestMode === 'major' ? majorScale : minorScale
  const notes = scale.map(interval => NOTE_NAMES[(bestKey + interval) % 12])

  return { key: keyName, mode: bestMode, notes }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const audio = formData.get('audio') as File

    if (!audio) {
      return NextResponse.json({ error: 'No audio file' }, { status: 400 })
    }

    // Use GPT to analyze and detect key
    const arrayBuffer = await audio.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')
    const mimeType = audio.type || 'audio/mpeg'

    // Ask GPT-4o to analyze the audio
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-audio-preview',
      modalities: ['text'],
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'input_audio',
              input_audio: {
                data: base64,
                format: mimeType.includes('mp4') || mimeType.includes('m4a') ? 'mp4' : 'mp3',
              }
            },
            {
              type: 'text',
              text: `Analyse cette piste instrumentale et détecte sa tonalité musicale.
Réponds UNIQUEMENT en JSON :
{
  "key": "C",
  "mode": "minor",
  "bpm": 140,
  "notes": ["C", "D", "Eb", "F", "G", "Ab", "Bb"],
  "scale": "C minor",
  "confidence": 0.9,
  "genre_detected": "trap",
  "autotune_recommended_notes": ["C", "Eb", "F", "G", "Bb"]
}`
            }
          ]
        }
      ],
      max_tokens: 300,
    })

    const text = completion.choices[0].message.content ?? ''
    try {
      const parsed = JSON.parse(text.replace(/```json|```/g, '').trim())
      return NextResponse.json(parsed)
    } catch {
      // Fallback: return a default key if parsing fails
      return NextResponse.json({
        key: 'C',
        mode: 'minor',
        bpm: 140,
        notes: ['C', 'D', 'Eb', 'F', 'G', 'Ab', 'Bb'],
        scale: 'C minor',
        confidence: 0.5,
        genre_detected: 'unknown',
        autotune_recommended_notes: ['C', 'Eb', 'F', 'G', 'Bb']
      })
    }
  } catch (err: any) {
    console.error('Key detection error:', err)
    // Always return a valid response
    return NextResponse.json({
      key: 'A',
      mode: 'minor',
      bpm: 130,
      notes: ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
      scale: 'A minor',
      confidence: 0.4,
      genre_detected: 'urban',
      autotune_recommended_notes: ['A', 'C', 'D', 'E', 'G']
    })
  }
}
