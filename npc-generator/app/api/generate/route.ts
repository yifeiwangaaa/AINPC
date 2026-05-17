import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

async function generateWithGPTImage2(prompt: string, ratio: string) {
  const sizeMap: Record<string, '1024x1024' | '1536x1024' | '1024x1536'> = {
    '16:9': '1536x1024',
    '9:16': '1024x1536',
    '1:1': '1024x1024',
  }
  const size = sizeMap[ratio] || '1536x1024'
  const promises = Array.from({ length: 4 }, () =>
    openai.images.generate({
      model: 'gpt-image-1',
      prompt,
      n: 1,
      size,
      quality: 'low',
    })
  )
  const results = await Promise.all(promises)
  return results.map(r => {
    const item = r.data?.[0]
    if (!item) return ''
    return item.b64_json
      ? `data:image/png;base64,${item.b64_json}`
      : item.url || ''
  })
}

async function generateWithNanoBanana(prompt: string, ratio: string) {
  const aspectMap: Record<string, string> = {
    '16:9': 'ASPECT_16_9',
    '9:16': 'ASPECT_9_16',
    '1:1': 'IMAGE_ASPECT_RATIO_UNSPECIFIED',
  }
  const aspectRatio = aspectMap[ratio] || 'ASPECT_16_9'
  const apiKey = process.env.GOOGLE_API_KEY

  const promises = Array.from({ length: 4 }, async () => {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseModalities: ['TEXT', 'IMAGE'],
          },
        }),
      }
    )
    const data = await res.json()
    const part = data?.candidates?.[0]?.content?.parts?.find(
      (p: { inlineData?: { mimeType: string; data: string } }) => p.inlineData
    )
    if (part?.inlineData?.data) {
      return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`
    }
    return ''
  })

  return Promise.all(promises)
}

export async function POST(req: NextRequest) {
  const { prompt, negative_prompt, model, aspect_ratio, style } = await req.json()
  if (!prompt) return NextResponse.json({ error: 'No prompt' }, { status: 400 })

  const fullPrompt = `${prompt}${style ? `, ${style}` : ''}${negative_prompt ? `. Avoid: ${negative_prompt}` : ''}`

  try {
    let images: string[]
    if (model === 'gpt-image-2') {
      images = await generateWithGPTImage2(fullPrompt, aspect_ratio || '16:9')
    } else {
      images = await generateWithNanoBanana(fullPrompt, aspect_ratio || '16:9')
    }
    return NextResponse.json({ images })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: '生成失败' }, { status: 500 })
  }
}
