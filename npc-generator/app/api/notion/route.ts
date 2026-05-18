import { NextRequest, NextResponse } from 'next/server'

const NOTION_VERSION = '2022-06-28'

export async function POST(req: NextRequest) {
  const { npcs, databaseId, projectName } = await req.json()
  const NOTION_API_KEY = process.env.NOTION_API_KEY

  if (!NOTION_API_KEY) {
    return NextResponse.json({ error: 'Notion API Key 未配置' }, { status: 500 })
  }

  const results = []
  const errors = []

  for (const npc of npcs) {
    try {
      const children: unknown[] = [
        {
          object: 'block',
          type: 'heading_2',
          heading_2: { rich_text: [{ text: { content: npc.name } }] }
        },
        {
          object: 'block',
          type: 'paragraph',
          paragraph: { rich_text: [{ text: { content: npc.description || '' } }] }
        },
        {
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [{
              text: { content: `Prompt: ${npc.image_prompt || ''}` },
              annotations: { italic: true, color: 'gray' }
            }]
          }
        },
      ]

      const response = await fetch('https://api.notion.com/v1/pages', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${NOTION_API_KEY}`,
          'Content-Type': 'application/json',
          'Notion-Version': NOTION_VERSION,
        },
        body: JSON.stringify({
          parent: { database_id: databaseId },
          properties: {
            '角色名': { title: [{ text: { content: npc.name } }] },
            '描述': { rich_text: [{ text: { content: npc.description || '' } }] },
            '生图Prompt': { rich_text: [{ text: { content: npc.image_prompt || '' } }] },
            '项目': { rich_text: [{ text: { content: projectName || '' } }] },
            '图像数量': { number: npc.images?.length || 0 },
          },
          children,
        })
      })

      if (!response.ok) {
        const error = await response.json()
        errors.push({ name: npc.name, error: error.message })
      } else {
        const page = await response.json()
        results.push({ name: npc.name, url: page.url })
      }
    } catch (e) {
      errors.push({ name: npc.name, error: String(e) })
    }
  }

  return NextResponse.json({ results, errors })
}
