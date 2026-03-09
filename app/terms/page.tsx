"use client"

import { useMemo } from "react"
import { useRouter } from "next/navigation"

function LogoHeader() {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? ""
  const logoSrc = useMemo(() => `${basePath}/logo.svg`, [basePath])

  return (
    <div
      style={{
        height: 60,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <img
        src={logoSrc}
        alt="STAFFWORKS"
        width={220}
        height={44}
        style={{ height: 44, width: "auto", display: "block" }}
      />
    </div>
  )
}

const TERMS_TEXT = `
本利用規約（以下「本規約」）は、
【個人開発】SPARK STUDIO（以下「当方」）が提供する「STAFFWORKS」（以下「本サービス」）の利用条件を定めるものです。本サービスは、管理者（第2条）によって登録・招待された者のみが利用できます。

第1条（適用）
１．本規約は、本サービスの提供条件および当方と利用者との間の権利義務関係を定めます。

２．当方が本サービス上で提示するガイドライン等は本規約の一部を構成します。

第2条（定義）
本規約において、以下の用語は次の意味を有します。

「管理者」：本サービスの運用管理者として、本サービスのアカウント登録・権限設定・削除等を行う者をいいます。

「リーダー」：管理者により付与される権限区分の一つであり、アカウント登録・削除等の権限は持たない一方で、管理者が許可する範囲で、シフト等の業務データの登録・編集等を行える利用者をいいます。

「スタッフ」：管理者により登録され、本サービスを利用する利用者（リーダーを含みます）。

「利用者」：管理者、リーダー、スタッフの総称

「ユーザー情報」：氏名、権限区分等、登録される情報

「業務データ」：シフト、タスク等、本サービス上で作成・保存・送信されるデータ

第3条（利用登録）
１．本サービスは招待制であり、管理者が登録した者のみが利用できます。

２．アカウントの作成、権限付与、変更、削除は、管理者のみが行えます。リーダーおよびスタッフはこれらを行えません。

３．当方は、登録内容に虚偽等がある場合、その他当方が不適切と判断する場合、利用登録の承認拒否または利用停止等の措置を行うことができます。

第4条（権限区分と操作範囲）
１．利用者の権限区分は、原則として「管理者」「リーダー」「スタッフ」とします。

２．リーダーは管理者が管理する範囲で、業務データの作成、登録、編集、閲覧等を行うことができます。

３．リーダーおよびスタッフは以下の操作を行うことはできません。
　・アカウントの登録、編集、削除
　・権限区分の付与、変更
　・アプリ設定等、管理者専用の管理機能

４．権限の詳細は、当方が提供する機能の範囲内で管理者が設定し、利用者はその設定に従うものとします。

第5条（管理者の責任）
１．管理者はスタッフの登録、権限設定、運用管理を適切に行う責任を負います。

２．管理者は、リーダーおよびスタッフの本規約を周知し、遵守させるように努めるものとします。

３．リーダーまたはスタッフの行為に起因して損害が生じた場合、管理者は当方に対してその損害を賠償する責任を負うことがあります（当方に故意または重過失がある場合を除きます）。

第6条（アカウント管理）
１．利用者は自己の責任でアカウント情報を管理し、第三者に利用させてはなりません。

２．不正利用を発見した場合、利用者は速やかに管理者および当方へ通知するものとします。

３．利用者の管理不備により生じた損害について、当方は故意または重過失がある場合を除き責任を負いません。

第7条（利用料・課金）
１．本サービスに利用料が発生する場合、支払い義務は管理者とします。

２．料金、支払い方法等は当方が別途定めます。

第8条（禁止事項）
利用者は以下の行為をしてはなりません。
１．法令または公序良俗に反する行為
２．虚偽情報の登録、なりすまし
３．本サービスの運営妨害（過剰アクセス、脆弱性検索、リバースエンジニアリング等）
４．不正アクセス、またはこれを試みる行為
５．第三者への権利侵害（著作権、商標権、プライバシー等）
６．反社会的勢力への利益供与または関与
７．当方が不適切と判断する行為

第9条（業務データの取り扱い・権利帰属）
１．業務データの権利は、原則として管理者（または正当な権利者）に帰属します。
２．当方は、本サービス提供・維持・改善等に必要な範囲で業務データを取り扱います。
３．当方は、個人・組織が特定されないよう統計化、匿名化した情報を品質向上等の目的で利用できます。

第10条（個人情報）
１．当方は個人情報をプライバシーポリシーに従い取り扱います。
２．管理者は、リーダーおよびスタッフの個人情報を登録する場合、本人への説明、同意取得等、適用法令上必要な手続きを行う責任を負います。

第11条（知的財産権）
本サービスに関する知的財産権は当方または正当な権利者に帰属し、利用は許諾範囲を超える利用（複製、改変、配布、リバースエンジニアリング等）をしてはなりません。

第12条（サービスの変更・停止）
当方は必要に応じ本サービスの内容変更、提供の中断・停止を行うことができます。

第13条（利用停止・登録抹消）
当方は、利用者が本規約に違反した場合等に、事前通知なく利用停止・登録抹消等の措置を行うことができます。

第14条（退会・アカウント削除）
１．スタッフ（リーダーを含む）の利用停止・削除は、原則として管理者が行います。
２．退会・削除に伴い業務データが削除される場合があります。削除の範囲・タイミング・復元可否は当方の定めに従います。

第15条（免責・責任制限）
当方は本サービスの完全性等を保証せず、当方に故意または重過失がある場合を除き損害賠償責任を負いません。

第16条（規約の変更）
当方は必要に応じ本規約を変更でき、変更後に利用者が利用した場合、変更に同意したものとみなします。

第17条（準拠法・管轄）
本規約は日本法に準拠し、当方所在地を管轄する裁判所を第一の専属的合意管轄裁判所とします。
`

export default function TermsPage() {
  const router = useRouter()

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#006284",
        overflow: "hidden",
        display: "flex",
        justifyContent: "center",
        padding: "100px 32px 100px", // login と同じ（横32px）
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: "100%",
          minWidth: 320,
          maxWidth: 768,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 16,
        }}
      >
        {/* ★上部ロゴ（高さ固定で、ログイン画面と同じ位置/高さ） */}
        <LogoHeader />

        <div
          style={{
            width: "100%",
            background: "#fff",
            borderRadius: 30,
            boxShadow: "0 0 30px rgba(0,0,0,0.30)",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={{ padding: "18px 20px 10px", textAlign: "center" }}>
            <div
              style={{
                fontFamily: '"Noto Sans JP", sans-serif',
                fontWeight: 700,
                fontSize: 18,
                color: "#1C1C1C",
              }}
            >
              利用規約
            </div>
            <div
              style={{
                marginTop: 4,
                fontFamily: '"Noto Sans JP", sans-serif',
                fontWeight: 400,
                fontSize: 12,
                color: "#1C1C1C",
              }}
            >
              最終更新：2026年3月4日
            </div>
          </div>

          <div
            style={{
              padding: "0 20px 16px",
              overflowY: "auto",
              WebkitOverflowScrolling: "touch",
              maxHeight: "65vh",
            }}
          >
            <pre
              style={{
                margin: 0,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                fontFamily: '"Noto Sans JP", sans-serif',
                fontSize: 14,
                lineHeight: 1.75,
                color: "#1C1C1C",
              }}
            >
              {TERMS_TEXT}
            </pre>
          </div>

          <div
            style={{
              padding: 16,
              display: "flex",
              justifyContent: "center",
              borderTop: "1px solid #eee",
            }}
          >
            <button
              type="button"
              onClick={() => router.back()}
              style={{
                width: 200,
                height: 36,
                borderRadius: 18,
                border: "1px solid #006284",
                background: "#006284",
                color: "#fff",
                fontFamily: '"Noto Sans JP", sans-serif',
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              閉じる
            </button>
          </div>
        </div>

        <div
          style={{
            width: "min(320px, 100%)",
            textAlign: "center",
            color: "#fff",
            fontSize: 11,
            fontFamily: '"Noto Sans JP", sans-serif',
            fontWeight: 500,
            textShadow: "0px 3px 3px rgba(0,0,0,0.25)",
          }}
        >
          © 2026 Spark Studio All Rights Reserved.
        </div>
      </div>
    </div>
  )
}