"use client";

import { useState, useEffect, useRef } from "react";
import { Shield, ScrollText, X } from "lucide-react";

const TERMS_VERSION = "1.0";
const STORAGE_KEY = "tos_agreed";

// ─── 規約本文 ─────────────────────────────────────────────────────
const TERMS_SECTIONS = [
  {
    title: null,
    body: `この利用規約（以下、「本規約」といいます）は、ダツ皿アキ（以下、「当社」といいます）が提供するサービス「マクロ飯ビルダー」（以下、「本サービス」といいます）の利用条件を定めるものです。ユーザーの皆様（以下、「ユーザー」といいます）には、本規約に従って本サービスをご利用いただきます。\n\n※本サービスをご利用になる前に、以下の「第2条（健康に関する免責事項）」を必ずお読みいただき、同意の上でご利用ください。`,
  },
  {
    title: "第1条（本サービスの内容とAIの特性）",
    body: `1. 本サービスは、ユーザーが設定した目標（体重、期限、予算など）に基づき、人工知能（AI）アルゴリズムを用いてカロリー、マクロ栄養素（PFCバランス）、および食事メニューや買い物リストの提案・ナビゲーションを行うヘルスケアサポートツールです。\n\n2. ユーザーは、AIによる提案が統計的・一般的なデータに基づく推計であり、常に完全な正確性や目標達成を保証するものではないことを理解し、了承するものとします。\n\n3. 本サービスは、機能の提供にあたり、ユーザーが入力したデータの一部を外部のAIプロバイダー（Anthropic社等）のAPIに送信して処理します。なお、送信されたデータはAPIプロバイダーによるAIモデルの学習には使用されない設定で運用されます。`,
  },
  {
    title: "第2条（健康に関する免責事項）※最重要項目",
    important: true,
    body: `本サービスは、健康管理およびフィットネスのサポートを目的としたものであり、医療行為、医療的アドバイス、診断、治療、または病気の予防を提供するものではありません。以下の免責事項に同意できない場合、本サービスの利用を直ちに中止してください。\n\n1. 医療専門家への相談義務：\n本サービスが提供するカロリー制限、マクロ栄養素の調整、食事・トレーニング提案などの実行は、ユーザー自身の自己責任において行われるものとします。基礎疾患のある方、服薬中の方、妊娠中・授乳中の方、摂食障害の既往歴がある方、および未成年者は、本サービスの提案を実行する前に、必ず医師または管理栄養士等の専門家にご相談ください。また、ユーザーが未成年者の場合、本サービスの利用にあたり、必ず親権者等の法定代理人の同意を得た上でご利用ください。未成年者が本サービスを利用した場合、法定代理人の同意を得ているものとみなします。\n\n2. 体調不良時の利用中止：\nダイエットやトレーニング中にめまい、疲労、痛み、その他少しでも体調に異常を感じた場合は、直ちに本サービスの提案の実行を中止し、医療機関を受診してください。\n\n3. 結果の不保証：\n人間の代謝や体重変動には個人差があります。本サービスのAIが提案する目標達成ペースやアジャスト機能に従った場合でも、特定の体重減少、筋肉増加、または健康状態の改善を保証するものではありません。\n\n4. 健康被害に対する免責：\n本サービスが提供した情報やAIの提案に依拠してユーザーが行動した結果、健康上の被害、疾病の悪化、負傷、または精神的苦痛が生じた場合でも、当社は法令で認められる最大限の範囲において一切の責任を負いません。`,
  },
  {
    title: "第3条（予算・買い物に関する免責事項）",
    body: `本サービスの「予算最適化」機能により提案される食材の価格や買い物リストは、一般的な市場価格の推計に基づいています。実際の店舗での販売価格、在庫状況、または物価変動により、提案された予算内で食材が購入できない場合であっても、当社はその差額や経済的損失について一切の責任を負いません。`,
  },
  {
    title: "第4条（禁止事項およびシステムの制限）",
    body: `1. ユーザーは、本サービスの利用にあたり、以下の行為をしてはなりません。\n  (1) 極端な低カロリー設定や、健康を害する恐れのある非現実的な目標・期限を意図的に設定し、AIに危険な提案を強要する行為\n  (2) 本サービスの提供する情報（AIの提案内容を含む）を、医療的な診断や治療の代替として第三者に提供・助言する行為\n  (3) 当社、他のユーザー、または第三者のサーバー、ネットワーク機能等を破壊したり、妨害したりする行為\n  (4) その他、当社が不適切と判断する行為\n\n2. 当社は、ユーザーの健康と安全を保護するため、極端な低カロリー設定や非現実的な目標等、健康を害する恐れのあると判断した入力やリクエストに対しては、システムの判断によりサービスの提供を制限、拒否、または警告を発する場合があります。`,
  },
  {
    title: "第5条（サービス提供の停止・中断）",
    body: `当社は、以下のいずれかの事由があると判断した場合、ユーザーに事前に通知することなく本サービスの全部または一部の提供を停止または中断することができるものとします。\n\n1. 本サービスにかかるコンピュータシステムの保守点検または更新を行う場合\n2. 地震、落雷、火災、停電、天災などの不可抗力により、本サービスの提供が困難となった場合\n3. 利用している外部APIやクラウドサービスに障害が発生した場合`,
  },
  {
    title: "第6条（損害賠償の制限）",
    body: `消費者契約法の適用その他の理由により、前条までの免責条項にかかわらず当社がユーザーに対して損害賠償責任を負う場合であっても、当社の賠償責任は、直接かつ通常の損害に限定され、その上限額は、当該ユーザーが過去3ヶ月間に本サービスに対して支払った利用料金の総額（無料ユーザーの場合は1,000円）を超えないものとします。ただし、当社に故意または重過失がある場合、およびユーザーの生命または身体に生じた損害については、この限りではありません。`,
  },
  {
    title: "第7条（利用規約の変更）",
    body: `当社は、必要と判断した場合には、民法第548条の4の規定に基づき、本規約を変更することができるものとします。本規約を変更する場合、当社はあらかじめ本サービス内での掲示、またはその他の適切な方法により、変更内容および効力発生時期をユーザーに周知します。変更の効力発生後、本サービスの利用を開始した場合には、当該ユーザーは変更後の規約に同意したものとみなします。`,
  },
  {
    title: "第8条（個人情報の取り扱い）",
    body: `当社は、本サービスの利用に伴い取得するユーザーの情報（体重、目標、その他のヘルスケア情報を含みます）について、当社が別途定める「プライバシーポリシー」に従い適切に取り扱います。ユーザーは、本サービスを利用するにあたり、当該プライバシーポリシーに同意するものとします。`,
  },
  {
    title: "第9条（準拠法・管轄裁判所）",
    body: `本規約の解釈にあたっては、日本法を準拠法とします。本サービスに関して紛争が生じた場合には、当社の所在地を管轄する地方裁判所を第一審の専属的合意管轄裁判所とします。`,
  },
];

// ─── 規約テキスト共通レンダー ──────────────────────────────────────
function TermsContent({ scrollRef, onScroll }) {
  return (
    <div
      ref={scrollRef}
      onScroll={onScroll}
      style={{
        flex: 1,
        overflowY: "auto",
        padding: "0 20px 20px",
        WebkitOverflowScrolling: "touch",
      }}
    >
      <h2 style={{
        fontSize: 15,
        fontWeight: 700,
        color: "rgba(255,255,255,0.85)",
        margin: "0 0 16px",
        textAlign: "center",
      }}>
        マクロ飯ビルダー 利用規約 および 健康に関する免責事項
      </h2>

      {TERMS_SECTIONS.map((sec, i) => (
        <div key={i} style={{ marginBottom: 20 }}>
          {sec.title && (
            <h3 style={{
              fontSize: 13,
              fontWeight: 700,
              color: sec.important ? "#f59e0b" : "rgba(255,255,255,0.7)",
              margin: "0 0 8px",
              ...(sec.important ? {
                padding: "6px 10px",
                background: "rgba(245,158,11,0.1)",
                border: "1px solid rgba(245,158,11,0.2)",
                borderRadius: 8,
              } : {}),
            }}>
              {sec.title}
            </h3>
          )}
          <p style={{
            fontSize: 12,
            lineHeight: 1.8,
            color: "rgba(255,255,255,0.5)",
            margin: 0,
            whiteSpace: "pre-wrap",
          }}>
            {sec.body}
          </p>
        </div>
      ))}
    </div>
  );
}

// ─── TermsGate: 初回同意用（layout.js から使用） ────────────────────
export default function TermsGate() {
  const [show, setShow] = useState(false);
  const [canAgree, setCanAgree] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      setShow(true);
    } else {
      // バージョンチェック（将来の規約更新対応）
      try {
        const parsed = JSON.parse(stored);
        if (parsed.version !== TERMS_VERSION) {
          setShow(true);
        }
      } catch {
        // 旧形式 → 再同意不要（初期バージョン）
      }
    }
  }, []);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    // 末尾近くまでスクロールしたら同意ボタン有効化
    if (scrollHeight - scrollTop - clientHeight < 60) {
      setCanAgree(true);
    }
  };

  const handleAgree = () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: TERMS_VERSION, timestamp: new Date().toISOString() })
    );
    setShow(false);
  };

  if (!show) return null;

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      zIndex: 99999,
      background: "rgba(0,0,0,0.85)",
      backdropFilter: "blur(10px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 16,
    }}>
      <div style={{
        width: "100%",
        maxWidth: 480,
        maxHeight: "90vh",
        background: "linear-gradient(170deg, #111318 0%, #0d1117 100%)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 24,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}>
        {/* ヘッダー */}
        <div style={{
          padding: "24px 20px 16px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          textAlign: "center",
        }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: 14,
            background: "rgba(34,197,94,0.1)",
            border: "1px solid rgba(34,197,94,0.2)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 12,
          }}>
            <Shield size={22} color="#22c55e" strokeWidth={1.5} />
          </div>
          <h1 style={{
            fontSize: 17,
            fontWeight: 700,
            color: "rgba(255,255,255,0.9)",
            margin: "0 0 4px",
          }}>
            利用規約への同意
          </h1>
          <p style={{
            fontSize: 12,
            color: "rgba(255,255,255,0.35)",
            margin: 0,
          }}>
            サービスをご利用いただくには、以下の規約への同意が必要です
          </p>
        </div>

        {/* スクロール可能な規約本文 */}
        <TermsContent scrollRef={scrollRef} onScroll={handleScroll} />

        {/* フッター */}
        <div style={{
          padding: "16px 20px 20px",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}>
          {!canAgree && (
            <p style={{
              fontSize: 11,
              color: "rgba(255,255,255,0.3)",
              textAlign: "center",
              margin: 0,
            }}>
              最後までスクロールしてお読みください
            </p>
          )}
          <button
            onClick={handleAgree}
            disabled={!canAgree}
            style={{
              width: "100%",
              padding: "14px 0",
              borderRadius: 14,
              border: "none",
              fontSize: 15,
              fontWeight: 700,
              letterSpacing: 0.5,
              cursor: canAgree ? "pointer" : "not-allowed",
              color: "#fff",
              background: canAgree
                ? "linear-gradient(135deg, #22c55e, #16a34a)"
                : "rgba(255,255,255,0.08)",
              boxShadow: canAgree ? "0 4px 20px rgba(34,197,94,0.3)" : "none",
              transition: "all 0.3s ease",
            }}
          >
            {canAgree ? "同意して利用を開始する" : "規約を最後までお読みください"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── TermsViewer: 閲覧用モーダル（設定画面から使用） ─────────────────
export function TermsViewer({ onClose }) {
  const scrollRef = useRef(null);

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      zIndex: 99999,
      background: "rgba(0,0,0,0.85)",
      backdropFilter: "blur(10px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 16,
    }}>
      <div style={{
        width: "100%",
        maxWidth: 480,
        maxHeight: "90vh",
        background: "linear-gradient(170deg, #111318 0%, #0d1117 100%)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 24,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}>
        {/* ヘッダー */}
        <div style={{
          padding: "20px 20px 14px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <ScrollText size={18} color="rgba(255,255,255,0.5)" strokeWidth={1.5} />
            <h1 style={{
              fontSize: 16,
              fontWeight: 700,
              color: "rgba(255,255,255,0.85)",
              margin: 0,
            }}>
              利用規約
            </h1>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.1)",
              background: "rgba(255,255,255,0.05)",
              color: "rgba(255,255,255,0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* スクロール可能な規約本文 */}
        <TermsContent scrollRef={scrollRef} />

        {/* フッター */}
        <div style={{
          padding: "12px 20px 16px",
          borderTop: "1px solid rgba(255,255,255,0.06)",
        }}>
          <button
            onClick={onClose}
            style={{
              width: "100%",
              padding: "12px 0",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.1)",
              background: "rgba(255,255,255,0.05)",
              color: "rgba(255,255,255,0.6)",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
