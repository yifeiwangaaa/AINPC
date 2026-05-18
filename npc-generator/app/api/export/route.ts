import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 30

export async function POST(req: NextRequest) {
  const { npcs, projectName } = await req.json()
  if (!npcs?.length) return NextResponse.json({ error: 'No NPCs' }, { status: 400 })

  const rows = npcs.map((npc: { name: string; description: string; image_prompt: string; images: string[] }) => {
    const imgCells = Array.from({ length: 4 }, (_, i) => {
      const img = npc.images?.[i]
      return img
        ? `<td class="img-cell"><img src="${img}" /></td>`
        : `<td class="img-cell empty">未生成</td>`
    }).join('')

    return `
      <tr>
        <td class="name-cell">${npc.name}</td>
        <td class="desc-cell">${npc.description || ''}<br/><span class="prompt">${npc.image_prompt || ''}</span></td>
        ${imgCells}
      </tr>`
  }).join('')

  const html = `<!DOCTYPE html>
<html lang="zh">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NPC 角色表${projectName ? ' — ' + projectName : ''}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f9f9f7; padding: 32px; color: #1a1a1a; }
    h1 { font-size: 20px; font-weight: 600; margin-bottom: 4px; }
    .meta { font-size: 13px; color: #888; margin-bottom: 24px; }
    table { width: 100%; border-collapse: collapse; background: #fff; border-radius: 10px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.08); }
    thead { background: #f0efeb; }
    th { padding: 12px 14px; text-align: left; font-size: 12px; font-weight: 500; color: #555; border-bottom: 1px solid #e8e6e0; }
    td { padding: 12px 14px; border-bottom: 1px solid #f0efeb; vertical-align: top; }
    tr:last-child td { border-bottom: none; }
    tr:hover { background: #fafaf8; }
    .name-cell { font-weight: 600; font-size: 14px; min-width: 80px; white-space: nowrap; }
    .desc-cell { font-size: 12px; line-height: 1.6; color: #444; max-width: 220px; }
    .prompt { color: #999; font-style: italic; margin-top: 4px; display: block; }
    .img-cell { padding: 8px; min-width: 160px; }
    .img-cell img { width: 160px; height: 90px; object-fit: cover; border-radius: 6px; display: block; }
    .img-cell.empty { color: #ccc; font-size: 12px; text-align: center; vertical-align: middle; }
    @media print { body { padding: 16px; background: white; } }
  </style>
</head>
<body>
  <h1>NPC 角色表</h1>
  <p class="meta">${projectName ? '项目：' + projectName + ' · ' : ''}共 ${npcs.length} 个角色 · 生成于 ${new Date().toLocaleDateString('zh-CN')}</p>
  <table>
    <thead>
      <tr>
        <th>角色名</th>
        <th>描述</th>
        <th>图像 1</th>
        <th>图像 2</th>
        <th>图像 3</th>
        <th>图像 4</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>
</body>
</html>`

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html;charset=UTF-8',
      'Content-Disposition': `attachment; filename="npc_characters.html"`,
    }
  })
}
