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
      description: '新機能の実装や機能追加に最適化されたテンプレート。実装手順、技術スタック、テストケースなどを含みます。',
      icon: '🔨',
    },
    {
      type: 'BUGFIX' as const,
      title: 'バグ修正',
      description: 'バグ修正に最適化されたテンプレート。再現手順、原因分析、修正方針、検証方法などを含みます。',
      icon: '🐛',
    },
    {
      type: 'RESEARCH' as const,
      title: '調査・研究',
      description: '技術調査や分析に最適化されたテンプレート。調査目的、調査項目、参考情報などを含みます。',
      icon: '🔍',
    },
    {
      type: 'REVIEW' as const,
      title: 'レビュー',
      description: 'コードレビューやドキュメントレビューに最適化されたテンプレート。レビュー観点、チェックリストなどを含みます。',
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
        <h2 style={{ marginBottom: '1rem' }}>Task Pack テンプレート選択</h2>
        <p style={{ marginBottom: '2rem', color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
          AI協業に最適化されたフォーマットでタスク情報をパッケージ化します。用途に応じたテンプレートを選択してください。
        </p>

        <div style={{ display: 'grid', gap: '1rem', marginBottom: '2rem' }}>
          {templates.map((template) => (
            <button
              key={template.type}
              onClick={() => onGenerate(template.type, false)}
              disabled={isGenerating}
              style={{
                padding: '1.5rem',
                textAlign: 'left',
                backgroundColor: 'var(--color-bg-secondary)',
                border: '2px solid var(--color-border)',
                borderRadius: '8px',
                cursor: isGenerating ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                opacity: isGenerating ? 0.6 : 1,
              }}
              onMouseEnter={(e) => {
                if (!isGenerating) {
                  e.currentTarget.style.borderColor = 'var(--color-primary)'
                  e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)'
                }
              }}
              onMouseLeave={(e) => {
                if (!isGenerating) {
                  e.currentTarget.style.borderColor = 'var(--color-border)'
                  e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)'
                }
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '2rem', marginRight: '1rem' }}>{template.icon}</span>
                <h3 style={{ margin: 0 }}>{template.title}</h3>
              </div>
              <p style={{
                margin: 0,
                fontSize: '0.875rem',
                color: 'var(--color-text-secondary)',
                lineHeight: '1.6',
              }}>
                {template.description}
              </p>
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
