import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 30

export async function POST(req: NextRequest) {
  const { npcs } = await req.json()
  if (!npcs?.length) return NextResponse.json({ error: 'No NPCs' }, { status: 400 })

  // Build HTML table with embedded base64 images
  const rows = npcs.map((npc: { name: string; description: string; images: string[] }) => {
    const imgCells = Array.from({ length: 4 }, (_, i) => {
      const img = npc.images?.[i]
      return img
        ? `<td style="padding:4px;border:1px solid #ccc;"><img src="${img}" width="160" height="90" style="display:block;object-fit:cover;" /></td>`
        : `<td style="padding:4px;border:1px solid #ccc;color:#999;font-size:12px;">无图</td>`
    }).join('')

    return `
      <tr>
        <td style="padding:8px;border:1px solid #ccc;font-weight:bold;vertical-align:top;min-width:80px;">${npc.name}</td>
        <td style="padding:8px;border:1px solid #ccc;font-size:12px;vertical-align:top;max-width:200px;">${npc.description || ''}</td>
        ${imgCells}
      </tr>`
  }).join('')

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: system-ui, sans-serif; padding: 20px; }
    h1 { font-size: 18px; margin-bottom: 16px; }
    table { border-collapse: collapse; width: 100%; }
    th { background: #f0f0f0; padding: 8px; border: 1px solid #ccc; text-align: left; }
  </style>
</head>
<body>
  <h1>NPC 角色表</h1>
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
      'Content-Type': 'application/vnd.ms-excel;charset=UTF-8',
      'Content-Disposition': 'attachment; filename="npc_characters.xls"',
    }
  })
}
