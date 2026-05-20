import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { put } from '@vercel/blob'

export const maxDuration = 30

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

async function uploadToBlob(base64: string, filename: string): Promise<string> {
  const matches = base64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/)
  if (!matches) throw new Error('Invalid base64')
  const mimeType = matches[1]
  const buffer = Buffer.from(matches[2], 'base64')
  const blob = await put(filename, buffer, {
    access: 'public',
    contentType: mimeType,
  })
  return blob.url
}

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
  }
  return null
}

async function generateOneGPTImage(prompt: string, ratio: string): Promise<string | null> {
  const sizeMap: Record<string, '1024x1024' | '1536x1024' | '1024x1536'> = {
    '16:9': '1536x1024', '9:16': '1024x1536', '1:1': '1024x1024',
  }
  const size = sizeMap[ratio] || '1536x1024'
  const result = await openai.images.generate({ model: 'gpt-image-1', prompt, n: 1, size, quality: 'low' })
  const item = result.data?.[0]
  if (!item) return null
  return item.b64_json ? `data:image/png;base64,${item.b64_json}` : item.url || null
}

export async function POST(req: NextRequest) {
  const { prompt, negative_prompt, model, aspect_ratio, style, npcName, imageIndex } = await req.json()
  if (!prompt) return NextResponse.json({ error: 'No prompt' }, { status: 400 })

  const fullPrompt = `${prompt}${style ? `, ${style}` : ''}${negative_prompt ? `. Avoid: ${negative_prompt}` : ''}`

  try {
    let base64: string | null
    if (model === 'gpt-image-2') {
      base64 = await generateOneGPTImage(fullPrompt, aspect_ratio || '16:9')
    } else {
      base64 = await generateWithRetry(fullPrompt)
    }

    if (!base64) return NextResponse.json({ image: null })

    // Upload to Vercel Blob
    const filename = `npc/${Date.now()}_${(npcName || 'npc').replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')}_${imageIndex || 0}.png`
    const url = await uploadToBlob(base64, filename)

    return NextResponse.json({ image: url })
  } catch (e) {
    console.error('Generate error:', e)
    return NextResponse.json({ error: '生成失败' }, { status: 500 })
  }
}
