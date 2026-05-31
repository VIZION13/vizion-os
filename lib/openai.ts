import OpenAI from 'openai'

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export const MODEL = 'gpt-4o' // swap to gpt-5.5 when available via API
