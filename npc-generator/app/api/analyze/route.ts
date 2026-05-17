import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const client = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com',
})

export async function POST(req: NextRequest) {
  const { text } = await req.json()
  if (!text) return NextResponse.json({ error: 'No text provided' }, { status: 400 })

  const completion = await client.chat.completions.create({
    model: 'deepseek-chat',
    messages: [
      {
        role: 'system',
        content: `你是一个专业的剧本角色分析师。从用户输入的文本中识别所有NPC角色，严格按以下JSON格式输出，不要输出任何其他文字：
{"npcs":[{"name":"角色中文名","description":"外貌和性格描述2-3句","image_prompt":"英文生图prompt，包含外貌、服装、气质、风格，50字以内","negative_prompt":"ugly, deformed, blurry, low quality"}]}
只提取有名字或明确描述的角色，跳过主角。如果没有NPC则返回{"npcs":[]}`
      },
      { role: 'user', content: text }
    ],
    response_format: { type: 'json_object' }
  })

  const result = JSON.parse(completion.choices[0].message.content || '{"npcs":[]}')
  return NextResponse.json(result)
}
