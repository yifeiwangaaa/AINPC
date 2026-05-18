'use client'
import { useState } from 'react'

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

function downloadAllImages(npc: NPCWithImages) {
  npc.images.forEach((img, i) => {
    setTimeout(() => {
      const a = document.createElement('a')
      a.href = img
      a.download = `${npc.name}_${i + 1}.png`
      a.click()
    }, i * 300)
  })
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
  const [notionStatus, setNotionStatus] = useState('')
  const [exporting, setExporting] = useState(false)

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
    setNpcs(prev => prev.map((n, i) => i === idx ? { ...n, loading: true, images: [] } : n))
    for (let i = 0; i < 4; i++) {
      try {
        const res = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: npc.image_prompt, negative_prompt: npc.negative_prompt, model, style, aspect_ratio: ratio }),
        })
        const data = await res.json()
        if (data.image) {
          setNpcs(prev => prev.map((n, j) => j === idx ? { ...n, images: [...n.images, data.image] } : n))
        }
      } catch { /* continue */ }
    }
    setNpcs(prev => prev.map((n, i) => i === idx ? { ...n, loading: false } : n))
  }

  async function generateAll() {
    for (let i = 0; i < npcs.length; i++) await generateForNPC(i)
  }

  function toggleSelect(idx: number) {
    setNpcs(prev => prev.map((n, i) => i === idx ? { ...n, selected: !n.selected } : n))
  }

  function selectAll() {
    const allSelected = npcs.every(n => n.selected)
    setNpcs(prev => prev.map(n => ({ ...n, selected: !allSelected })))
  }


  async function exportToExcel() {
    const selected = npcs.filter(n => n.selected && n.images.length > 0)
    if (!selected.length) return
    setExporting(true)
    setNotionStatus("生成表格中...")
    try {
      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ npcs: selected }),
      })
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "npc_characters.xls"
      a.click()
      URL.revokeObjectURL(url)
      setNotionStatus("✓ 表格已下载")
    } catch {
      setNotionStatus("导出失败")
    } finally {
      setExporting(false)
    }
  }

  async function exportToNotion() {
    const selected = npcs.filter(n => n.selected)
    if (!selected.length) return
    setExporting(true)
    setNotionStatus('导入中...')
    try {
      const res = await fetch('/api/notion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ npcs: selected, databaseId: DATABASE_ID, projectName }),
      })
      const data = await res.json()
      if (data.errors?.length) {
        setNotionStatus(`完成，${data.results.length} 个成功，${data.errors.length} 个失败`)
      } else {
        setNotionStatus(`✓ 成功导入 ${data.results.length} 个角色到 Notion`)
      }
      // Also download images
      selected.forEach((npc, ni) => {
        npc.images.forEach((img, ii) => {
          setTimeout(() => {
            const a = document.createElement('a')
            a.href = img
            a.download = `${npc.name}_${ii + 1}.png`
            a.click()
          }, (ni * 4 + ii) * 300)
        })
      })
    } catch {
      setNotionStatus('导入失败，请检查 Notion API Key')
    } finally {
      setExporting(false)
    }
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
          <button onClick={generateAll} style={btnSecondary}>全部生图 ({npcs.length} 个角色)</button>
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
                disabled={selectedCount === 0 || exporting}
                style={{ ...btnSmall, background: selectedCount > 0 ? "#1a1a1a" : "#ccc", color: "#fff", borderColor: "transparent" }}
              >
                {exporting ? "生成中..." : `导出 Excel (${selectedCount})`}
              </button>

              <button
                onClick={exportToNotion}
                disabled={selectedCount === 0 || exporting}
                style={{ ...btnSmall, background: selectedCount > 0 ? '#1a1a1a' : '#ccc', color: '#fff', borderColor: 'transparent' }}
              >
                {exporting ? '导入中...' : `导出到 Notion (${selectedCount})`}
              </button>
            </div>
          </div>
          {notionStatus && (
            <p style={{ fontSize: 13, color: notionStatus.includes('✓') ? '#27500A' : '#555', marginBottom: 12, background: notionStatus.includes('✓') ? '#EAF3DE' : '#f5f5f5', padding: '8px 12px', borderRadius: 6 }}>
              {notionStatus}
            </p>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
            {npcs.map((npc, idx) => (
              <div
                key={idx}
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
                      <button onClick={e => { e.stopPropagation(); generateForNPC(idx) }} style={btnPrimary}>生成图像</button>
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
                        <button onClick={e => { e.stopPropagation(); generateForNPC(idx) }} style={{ ...btnSmall, fontSize: 11 }}>重新生成</button>
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
