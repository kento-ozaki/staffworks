## AppShell.tsx の変更点（手動で2箇所変更してください）

変更箇所は2か所、どちらも同じ変更です：

  旧: minWidth: "20rem"
  新: minWidth: "320px"

────────────────────────────────────────
【変更箇所 1】Content Shell（main タグ内の div）

  <div style={{ width: "100%", maxWidth: "47.9375rem", minWidth: "320px", margin: "0 auto" }}>
    {children}
  </div>

────────────────────────────────────────
【変更箇所 2】ボトムナビ ピル型コンテナ（nav タグ内の div）

  <div
    style={{
      width: "100%",
      maxWidth: "47.9375rem",
      minWidth: "320px",   // ← ここ
      ...
    }}
  >

────────────────────────────────────────
変更理由：
globals.css で html の font-size を 16px 固定にしたため
「20rem = 320px」は通常環境では同値ですが、
px で明示することでブラウザのユーザースタイルシートに
よる font-size の上書きの影響を受けなくなります。
