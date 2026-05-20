import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

export const maxDuration = 30

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

async function generateOneNanoBanana(prompt: string): Promise<string | null> {
  const apiKey = process.env.GOOGLE_API_KEY
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
      }),
    }
  )
  const data = await res.json()
  console.log('Google status:', res.status, JSON.stringify(data).slice(0, 200))
  const parts = data?.candidates?.[0]?.content?.parts
  if (!parts) return null
  const part = parts.find((p: { inlineData?: { mimeType: string; data: string } }) => p.inlineData)
  if (part?.inlineData?.data) {
    return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`
  }
  return null
}

async function generateWithRetry(prompt: string, maxRetries = 3): Promise<string | null> {
  for (let i = 0; i < maxRetries; i++) {
    const result = await generateOneNanoBanana(prompt)
    if (result) return result
    console.log(`Attempt ${i + 1} failed, retrying...`)
  }
  return null
}

async function generateOneGPTImage(prompt: string, ratio: string): Promise<string | null> {
  const sizeMap: Record<string, '1024x1024' | '1536x1024' | '1024x1536'> = {
    '16:9': '1536x1024', '9:16': '1024x1536', '1:1': '1024x1024',
  }
  const size = sizeMap[ratio] || '1536x1024'
  const result = await openai.images.generate({
    model: 'gpt-image-1', prompt, n: 1, size, quality: 'low',
  })
  const item = result.data?.[0]
  if (!item) return null
  return item.b64_json ? `data:image/png;base64,${item.b64_json}` : item.url || null
}

export async function POST(req: NextRequest) {
  const { prompt, negative_prompt, model, aspect_ratio, style } = await req.json()
  if (!prompt) return NextResponse.json({ error: 'No prompt' }, { status: 400 })

  const fullPrompt = `${prompt}${style ? `, ${style}` : ''}${negative_prompt ? `. Avoid: ${negative_prompt}` : ''}`

  try {
    let image: string | null
    if (model === 'gpt-image-2') {
      image = await generateOneGPTImage(fullPrompt, aspect_ratio || '16:9')
    } else {
      image = await generateWithRetry(fullPrompt)
    }
    return NextResponse.json({ image })
  } catch (e) {
    console.error('Generate error:', e)
    return NextResponse.json({ error: '生成失败' }, { status: 500 })
  }
}
