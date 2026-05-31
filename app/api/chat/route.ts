import { openai, MODEL } from '@/lib/openai'
import { SYSTEM_PROMPTS } from '@/lib/prompts'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function POST(req: NextRequest) {
  const { messages, module = 'vizion' } = await req.json()

  const systemPrompt = SYSTEM_PROMPTS[module as keyof typeof SYSTEM_PROMPTS] ?? SYSTEM_PROMPTS.vizion

  const stream = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages,
    ],
    stream: true,
    max_tokens: 2000,
    temperature: 0.8,
  })

  const encoder = new TextEncoder()

  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content ?? ''
        if (text) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`))
        }
      }
      controller.enqueue(encoder.encode('data: [DONE]\n\n'))
      controller.close()
    },
  })

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
