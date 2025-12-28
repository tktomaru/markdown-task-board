interface TaskPackModalProps {
  isOpen: boolean
  onClose: () => void
  onGenerate: (template: 'IMPLEMENT' | 'BUGFIX' | 'RESEARCH' | 'REVIEW', includeRelated: boolean) => void
  isGenerating: boolean
}

export default function TaskPackModal({ isOpen, onClose, onGenerate, isGenerating }: TaskPackModalProps) {
  if (!isOpen) return null

  const templates = [
    {
      type: 'IMPLEMENT' as const,
      title: '実装タスク',
      description: '新機能の実装や機能追加に最適化',
      details: '実装手順、技術スタック、テストケースなどを含みます',
      icon: '🔨',
    },
    {
      type: 'BUGFIX' as const,
      title: 'バグ修正',
      description: 'バグ修正に最適化',
      details: '再現手順、原因分析、修正方針、検証方法などを含みます',
      icon: '🐛',
    },
    {
      type: 'RESEARCH' as const,
      title: '調査・研究',
      description: '技術調査や分析に最適化',
      details: '調査目的、調査項目、参考情報などを含みます',
      icon: '🔍',
    },
    {
      type: 'REVIEW' as const,
      title: 'レビュー',
      description: 'コードレビューやドキュメントレビューに最適化',
      details: 'レビュー観点、チェックリストなどを含みます',
      icon: '👀',
    },
  ]

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'var(--color-bg)',
          borderRadius: '8px',
          padding: '2rem',
          maxWidth: '700px',
          width: '90%',
          maxHeight: '90vh',
          overflow: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{
          marginBottom: '0.75rem',
          fontSize: '1.5rem',
          fontWeight: '700',
        }}>
          📦 Task Pack テンプレート選択
        </h2>
        <p style={{
          marginBottom: '2rem',
          color: 'var(--color-text-secondary)',
          fontSize: '0.9375rem',
          lineHeight: '1.6',
        }}>
          AI協業に最適化されたフォーマットでタスク情報をパッケージ化します。<br />
          用途に応じたテンプレートを選択してください。
        </p>

        <div style={{ display: 'grid', gap: '1.25rem', marginBottom: '2rem' }}>
          {templates.map((template) => (
            <button
              key={template.type}
              onClick={() => onGenerate(template.type, false)}
              disabled={isGenerating}
              style={{
                padding: '1.5rem 1.75rem',
                textAlign: 'left',
                backgroundColor: 'var(--color-bg-secondary)',
                border: '2px solid var(--color-border)',
                borderRadius: '10px',
                cursor: isGenerating ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                opacity: isGenerating ? 0.6 : 1,
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              }}
              onMouseEnter={(e) => {
                if (!isGenerating) {
                  e.currentTarget.style.borderColor = 'var(--color-primary)'
                  e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)'
                  e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.15)'
                  e.currentTarget.style.transform = 'translateY(-2px)'
                }
              }}
              onMouseLeave={(e) => {
                if (!isGenerating) {
                  e.currentTarget.style.borderColor = 'var(--color-border)'
                  e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)'
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)'
                  e.currentTarget.style.transform = 'translateY(0)'
                }
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                <span style={{ fontSize: '2.5rem', lineHeight: 1, flexShrink: 0 }}>{template.icon}</span>
                <div style={{ flex: 1 }}>
                  <h3 style={{
                    margin: 0,
                    marginBottom: '0.5rem',
                    fontSize: '1.125rem',
                    fontWeight: '600',
                    color: 'var(--color-text)',
                  }}>
                    {template.title}
                  </h3>
                  <p style={{
                    margin: 0,
                    marginBottom: '0.5rem',
                    fontSize: '0.9375rem',
                    color: 'var(--color-text)',
                    lineHeight: '1.5',
                    fontWeight: '500',
                  }}>
                    {template.description}
                  </p>
                  <p style={{
                    margin: 0,
                    fontSize: '0.8125rem',
                    color: 'var(--color-text-tertiary)',
                    lineHeight: '1.6',
                  }}>
                    {template.details}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            disabled={isGenerating}
            style={{
              backgroundColor: 'transparent',
              color: 'var(--color-text)',
              padding: '0.75rem 1.5rem',
              fontSize: '1rem',
              fontWeight: '600',
              borderRadius: '6px',
              border: '1px solid var(--color-border)',
              cursor: isGenerating ? 'not-allowed' : 'pointer',
              opacity: isGenerating ? 0.6 : 1,
            }}
          >
            キャンセル
          </button>
        </div>
      </div>
    </div>
  )
}
