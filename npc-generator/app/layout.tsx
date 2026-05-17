import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'NPC 形象生成器',
  description: '输入剧情文本，自动识别NPC角色并生成形象图',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh">
      <head>
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { background: #f9f9f9; color: #1a1a1a; }
          @keyframes spin { to { transform: rotate(360deg); } }
          button:disabled { opacity: 0.5; cursor: not-allowed; }
        `}</style>
      </head>
      <body>{children}</body>
    </html>
  )
}
