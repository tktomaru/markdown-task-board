export const priorityLabels: { [key: string]: string } = {
  P0: '緊急',
  P1: '今すぐ重要',
  P2: '計画内重要',
  P3: '余裕があれば',
  P4: 'いつか',
}

export const statusLabels: { [key: string]: string } = {
  open: '未着手',
  in_progress: '進行中',
  review: 'レビュー待ち',
  blocked: 'ブロック中',
  done: '完了',
  archived: 'アーカイブ',
}
