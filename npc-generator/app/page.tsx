'use client'
import { useState, useRef } from 'react'

type NPC = {
  name: string
  description: string
  image_prompt: string
  negative_prompt: string
}

type NPCWithImages = NPC & {
  images: string[]
  loading: boolean
  selected: boolean
}

const MODELS = [
  { value: 'nano-banana-2', label: 'Nano Banana 2 (Google)' },
  { value: 'gpt-image-2', label: 'GPT Image 2' },
]

const STYLES = [
  { value: '', label: '无风格' },
  { value: 'dark fantasy game art, concept art, cinematic lighting', label: '暗黑奇幻' },
  { value: 'anime style, detailed illustration', label: '动漫风' },
  { value: 'realistic portrait, photorealistic, 8k', label: '写实风格' },
  { value: 'watercolor illustration, soft colors', label: '水彩插画' },
  { value: 'cyberpunk, neon lights, futuristic', label: '赛博朋克' },
]

const RATIOS = ['16:9', '1:1', '9:16']

const DATABASE_ID = '364d9d2583d58023a70edb649b030306'

async function downloadAllImages(npc: NPCWithImages) {
  for (let i = 0; i < npc.images.length; i++) {
    const img = npc.images[i]
    try {
      const res = await fetch(img)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${npc.name}_${i + 1}.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      await new Promise(r => setTimeout(r, 400))
    } catch {
      const a = document.createElement('a')
      a.href = img
      a.download = `${npc.name}_${i + 1}.png`
      a.target = '_blank'
      a.click()
    }
  }
}

export default function Home() {
  const [text, setText] = useState('')
  const [npcs, setNpcs] = useState<NPCWithImages[]>([])
  const [analyzing, setAnalyzing] = useState(false)
  const [model, setModel] = useState('nano-banana-2')
  const [style, setStyle] = useState('')
  const [ratio, setRatio] = useState('16:9')
  const [error, setError] = useState('')
  const [projectName, setProjectName] = useState('')
  const [exportStatus, setExportStatus] = useState('')
  const [generating, setGenerating] = useState(false)
  const stopRef = useRef(false)

  async function analyzeText() {
    if (!text.trim()) return
    setAnalyzing(true)
    setError('')
    setNpcs([])
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      const data = await res.json()
      if (!data.npcs?.length) { setError('未识别到NPC，请尝试包含角色描述的文本'); return }
      setNpcs(data.npcs.map((n: NPC) => ({ ...n, images: [], loading: false, selected: false })))
    } catch {
      setError('分析失败，请检查 API Key')
    } finally {
      setAnalyzing(false)
    }
  }

  async function generateForNPC(idx: number) {
    const npc = npcs[idx]
    setNpcs(prev => prev.map((n, i) => i === idx ? { ...n, loading: true } : n))
    for (let i = 0; i < 4; i++) {
      if (stopRef.current) break
      try {
        const res = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: npc.image_prompt, negative_prompt: npc.negative_prompt, model, style, aspect_ratio: ratio, npcName: npc.name, imageIndex: i }),
        })
        const data = await res.json()
        if (data.image) {
          setNpcs(prev => prev.map((n, j) => j === idx ? { ...n, images: [...n.images.slice(0, 3), data.image] } : n))
        }
      } catch { /* continue */ }
    }
    setNpcs(prev => prev.map((n, i) => i === idx ? { ...n, loading: false } : n))
  }

  async function generateAll() {
    stopRef.current = false
    setGenerating(true)
    for (let i = 0; i < npcs.length; i++) {
      if (stopRef.current) break
      await generateForNPC(i)
    }
    setGenerating(false)
    stopRef.current = false
  }

  function stopGenerating() {
    stopRef.current = true
    setGenerating(false)
    setNpcs(prev => prev.map(n => ({ ...n, loading: false })))
    // images are preserved
  }

  function toggleSelect(idx: number) {
    setNpcs(prev => prev.map((n, i) => i === idx ? { ...n, selected: !n.selected } : n))
  }

  function selectAll() {
    const allSelected = npcs.every(n => n.selected)
    setNpcs(prev => prev.map(n => ({ ...n, selected: !allSelected })))
  }


  function exportToExcel() {
    const selected = npcs.filter(n => n.selected && n.images.length > 0)
    if (!selected.length) return

    const rows = selected.map((npc: NPCWithImages) => {
      const imgCells = Array.from({ length: 4 }, (_, i) => {
        const img = npc.images?.[i]
        return img
          ? `<td class="img-cell"><img src="${img}" /></td>`
          : `<td class="img-cell empty">未生成</td>`
      }).join("")
      return `<tr>
        <td class="name-cell">${npc.name}</td>
        <td class="desc-cell">${npc.description || ""}<br/><span class="prompt">${npc.image_prompt || ""}</span></td>
        ${imgCells}
      </tr>`
    }).join("")

    const html = `<!DOCTYPE html>
<html lang="zh">
<head>
  <meta charset="UTF-8">
  <title>NPC 角色表</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; background: #f9f9f7; padding: 32px; color: #1a1a1a; }
    h1 { font-size: 20px; font-weight: 600; margin-bottom: 4px; }
    .meta { font-size: 13px; color: #888; margin-bottom: 24px; }
    table { width: 100%; border-collapse: collapse; background: #fff; border-radius: 10px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.08); }
    thead { background: #f0efeb; }
    th { padding: 12px 14px; text-align: left; font-size: 12px; font-weight: 500; color: #555; border-bottom: 1px solid #e8e6e0; }
    td { padding: 12px 14px; border-bottom: 1px solid #f0efeb; vertical-align: top; }
    tr:last-child td { border-bottom: none; }
    .name-cell { font-weight: 600; font-size: 14px; min-width: 80px; white-space: nowrap; }
    .desc-cell { font-size: 12px; line-height: 1.6; color: #444; max-width: 200px; }
    .prompt { color: #999; font-style: italic; margin-top: 4px; display: block; }
    .img-cell { padding: 8px; min-width: 160px; }
    .img-cell img { width: 160px; height: 90px; object-fit: cover; border-radius: 6px; display: block; }
    .img-cell.empty { color: #ccc; font-size: 12px; text-align: center; }
  </style>
</head>
<body>
  <h1>NPC 角色表</h1>
  <p class="meta">共 ${selected.length} 个角色 · 生成于 ${new Date().toLocaleDateString("zh-CN")}</p>
  <table>
    <thead>
      <tr><th>角色名</th><th>描述</th><th>图像 1</th><th>图像 2</th><th>图像 3</th><th>图像 4</th></tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
</body>
</html>`

    const blob = new Blob([html], { type: "text/html;charset=UTF-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "npc_characters.html"
    a.click()
    URL.revokeObjectURL(url)
    setExportStatus("✓ 表格已下载，用浏览器打开查看")
  }

  function exportToXlsx() {
    const selected = npcs.filter(n => n.selected && n.images.length > 0)
    if (!selected.length) return
    const headers = ['角色名', '描述', '生图Prompt', '图像1', '图像2', '图像3', '图像4']
    const rows = selected.map(npc => [
      npc.name,
      npc.description || '',
      npc.image_prompt || '',
      npc.images[0] ? `=IMAGE("${npc.images[0]}")` : '',
      npc.images[1] ? `=IMAGE("${npc.images[1]}")` : '',
      npc.images[2] ? `=IMAGE("${npc.images[2]}")` : '',
      npc.images[3] ? `=IMAGE("${npc.images[3]}")` : '',
    ])
    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `npc_${projectName || 'characters'}.csv`
    a.click()
    URL.revokeObjectURL(url)
    setExportStatus('✓ 已下载 CSV，用腾讯文档打开可显示图片')
  }

  const selectedCount = npcs.filter(n => n.selected).length
  const doneCount = npcs.filter(n => n.images.length > 0).length

  return (
    <main style={{ maxWidth: 1100, margin: '0 auto', padding: '2rem 1rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 4 }}>NPC 形象生成器</h1>
      <p style={{ color: '#666', marginBottom: 24, fontSize: 14 }}>输入剧情文本，自动识别角色并生成形象图，每个角色4张</p>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <label style={{ fontSize: 13, color: '#555' }}>生图模型</label>
          <select value={model} onChange={e => setModel(e.target.value)} style={selectStyle}>
            {MODELS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <label style={{ fontSize: 13, color: '#555' }}>风格</label>
          <select value={style} onChange={e => setStyle(e.target.value)} style={selectStyle}>
            {STYLES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <label style={{ fontSize: 13, color: '#555' }}>比例</label>
          <select value={ratio} onChange={e => setRatio(e.target.value)} style={selectStyle}>
            {RATIOS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
      </div>

      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="粘贴剧情文本，工具会自动识别其中的NPC角色..."
        style={{ width: '100%', height: 130, padding: 12, fontSize: 14, borderRadius: 8, border: '1px solid #ddd', resize: 'vertical', boxSizing: 'border-box' }}
      />
      <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
        <button onClick={analyzeText} disabled={analyzing || !text.trim()} style={btnPrimary}>
          {analyzing ? '识别中...' : '识别 NPC'}
        </button>
        {npcs.length > 0 && (
          generating
            ? <button onClick={stopGenerating} style={{ ...btnSecondary, borderColor: '#c00', color: '#c00' }}>停止生成</button>
            : <button onClick={generateAll} style={btnSecondary}>全部生图 ({npcs.length} 个角色)</button>
        )}
      </div>
      {error && <p style={{ color: '#c00', marginTop: 8, fontSize: 13 }}>{error}</p>}

      {npcs.length > 0 && (
        <div style={{ marginTop: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
            <span style={{ fontSize: 14, color: '#555' }}>识别到 {npcs.length} 个角色，已生成 {doneCount} 个</span>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <button onClick={selectAll} style={btnSmall}>
                {npcs.every(n => n.selected) ? '取消全选' : '全选'}
              </button>
              <input
                value={projectName}
                onChange={e => setProjectName(e.target.value)}
                placeholder="项目名称（可选）"
                style={{ fontSize: 13, padding: '5px 8px', borderRadius: 6, border: '1px solid #ddd', width: 140 }}
              />
              <button
                onClick={exportToExcel}
                disabled={selectedCount === 0}
                style={{ ...btnSmall, background: selectedCount > 0 ? "#1a1a1a" : "#ccc", color: "#fff", borderColor: "transparent" }}
              >
                `导出 HTML (${selectedCount})`
              </button>

              <button
                onClick={exportToXlsx}
                disabled={selectedCount === 0}
                style={{ ...btnSmall, background: selectedCount > 0 ? '#1a1a1a' : '#ccc', color: '#fff', borderColor: 'transparent' }}
              >
                导出 CSV ({selectedCount})
              </button>
            </div>
          </div>
          {exportStatus && (
            <p style={{ fontSize: 13, color: exportStatus.includes('✓') ? '#27500A' : '#555', marginBottom: 12, background: exportStatus.includes('✓') ? '#EAF3DE' : '#f5f5f5', padding: '8px 12px', borderRadius: 6 }}>
              {exportStatus}
            </p>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
            {npcs.map((npc, idx) => (
              <div
                key={npc.name}
                style={{ border: npc.selected ? '2px solid #1a1a1a' : '1px solid #e0e0e0', borderRadius: 10, overflow: 'hidden', background: '#fff', cursor: 'pointer' }}
                onClick={() => toggleSelect(idx)}
              >
                <div style={{ background: '#f5f5f5', aspectRatio: ratio === '16:9' ? '16/9' : ratio === '9:16' ? '9/16' : '1/1', position: 'relative', overflow: 'hidden' }}>
                  {npc.images.length > 0 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', height: '100%' }}>
                      {npc.images.map((img, i) => (
                        <img key={i} src={img} alt={`${npc.name} ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ))}
                      {npc.loading && Array.from({ length: 4 - npc.images.length }).map((_, i) => (
                        <div key={i} style={{ ...centerFlex, background: '#f0f0f0' }}>
                          <div style={spinner} />
                        </div>
                      ))}
                    </div>
                  ) : npc.loading ? (
                    <div style={centerFlex}>
                      <div style={spinner} />
                      <span style={{ fontSize: 12, color: '#888', marginTop: 8 }}>生成中 {npc.images.length}/4...</span>
                    </div>
                  ) : (
                    <div style={centerFlex}>
                      <button onClick={e => { e.stopPropagation(); setNpcs(prev => prev.map((n, i) => i === idx ? { ...n, images: [] } : n)); generateForNPC(idx) }} style={btnPrimary}>生成图像</button>
                    </div>
                  )}
                  {npc.selected && (
                    <div style={{ position: 'absolute', top: 8, right: 8, width: 22, height: 22, borderRadius: '50%', background: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ color: '#fff', fontSize: 12 }}>✓</span>
                    </div>
                  )}
                </div>
                <div style={{ padding: '10px 12px' }}>
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 3 }}>{npc.name}</div>
                  <div style={{ fontSize: 12, color: '#666', lineHeight: 1.5, marginBottom: 6 }}>{npc.description}</div>
                  <div style={{ fontSize: 11, color: '#999', fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{npc.image_prompt}</div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    {npc.images.length > 0 && !npc.loading && (
                      <>
                        <button onClick={e => { e.stopPropagation(); setNpcs(prev => prev.map((n, i) => i === idx ? { ...n, images: [] } : n)); setTimeout(() => generateForNPC(idx), 0) }} style={{ ...btnSmall, fontSize: 11 }}>重新生成</button>
                        <button onClick={e => { e.stopPropagation(); downloadAllImages(npc) }} style={{ ...btnSmall, fontSize: 11 }}>下载图片</button>
                      </>
                    )}
                    {npc.loading && <span style={{ fontSize: 12, color: '#888' }}>已生成 {npc.images.length}/4 张...</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  )
}

const selectStyle: React.CSSProperties = { fontSize: 13, padding: '5px 8px', borderRadius: 6, border: '1px solid #ddd', background: '#fff', cursor: 'pointer' }
const btnPrimary: React.CSSProperties = { padding: '8px 18px', fontSize: 14, fontWeight: 500, borderRadius: 7, border: '1px solid #1a1a1a', background: '#1a1a1a', color: '#fff', cursor: 'pointer' }
const btnSecondary: React.CSSProperties = { padding: '8px 18px', fontSize: 14, fontWeight: 500, borderRadius: 7, border: '1px solid #ddd', background: '#fff', color: '#333', cursor: 'pointer' }
const btnSmall: React.CSSProperties = { padding: '5px 12px', fontSize: 12, borderRadius: 6, border: '1px solid #ddd', background: '#fff', color: '#333', cursor: 'pointer' }
const centerFlex: React.CSSProperties = { position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }
const spinner: React.CSSProperties = { width: 28, height: 28, border: '2px solid #e0e0e0', borderTopColor: '#333', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }
