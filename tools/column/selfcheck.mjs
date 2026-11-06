// 公開ボタンの動作確認の判定（approval-comment.mjs が使う）。テストしやすいよう分けてある。
// 自動公開（column-auto-publish.yml）が確認メールより先にマージすると、確認画面は「この記事は公開済みです」になる。
// それは公開ボタンの故障ではなく、もう公開が済んだということなので、失敗にしない（2026-11-02 PR #106 の誤った「失敗」の再発防止）。
export function judgeSelfCheck(status, html) {
  const text = String(html || '');
  if (status === 200 && text.includes('このコラムを公開しますか')) return 'ok';
  if (status === 200 && text.includes('公開済み')) return 'already-published';
  return 'ng';
}
