"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Shield, ScrollText, Lock, X } from "lucide-react";

const TERMS_VERSION = "1.0";
const STORAGE_KEY = "tos_agreed";

// ─── 利用規約 ──────────────────────────────────────────────────────
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

// ─── プライバシーポリシー ─────────────────────────────────────────────
const PRIVACY_SECTIONS = [
  {
    title: null,
    body: `ダツ皿アキ（以下、「当社」といいます）は、当社が提供するサービス「マクロ飯ビルダー」（以下、「本サービス」といいます）における、ユーザーの個人情報の取扱いについて、以下のとおりプライバシーポリシー（以下、「本ポリシー」といいます）を定めます。`,
  },
  {
    title: "第1条（収集する情報）",
    body: `当社は、本サービスの提供にあたり、以下の情報を取得・収集します。\n\n1. アカウント情報：メールアドレス、パスワード（暗号化され保存されます）\n2. プロフィールおよび目標データ：目標体重、期間、予算、食事回数などの設定情報\n3. ヘルスケアおよび記録データ：体重、体脂肪率、食事履歴、トレーニング履歴、およびユーザーが入力した体調メモ（定性データ）\n4. 端末および利用状況データ：Cookie、ローカルストレージデータ、アクセスログ、端末情報`,
  },
  {
    title: "第2条（利用目的）",
    body: `当社は、収集した個人情報を以下の目的で利用します。\n\n1. 本サービスの提供、ログイン認証、およびユーザーデータのクラウド同期（バックアップ）のため\n2. AIを用いた最適なマクロ栄養素、食事メニュー、予算、および改善アドバイスの生成・提案のため\n3. 本サービスの利便性向上、不具合修正、および新機能開発のための統計的分析のため\n4. ユーザーからのお問い合わせに対応するため\n5. 利用規約等に違反する行為、または不正・不当な目的での利用を防止するため`,
  },
  {
    title: "第3条（外部サービスおよびAIの利用・越境移転について）",
    important: true,
    body: `本サービスは、機能の提供およびデータ管理のために以下の外部サービスを利用しており、必要な範囲でデータが送信・処理されます。\n\n1. データベースおよび認証基盤（Supabase等）\nユーザーのデータは、高いセキュリティ基準を満たすクラウドデータベースに安全に保存・管理されます。\n\n2. AI解析プロバイダー（Anthropic社等）\nAIコーチング機能やメニュー提案を提供するため、ユーザーの目標、記録データ、体調メモ等は、外部のAIプロバイダーのAPIに送信されます。ただし、API経由で送信されたデータは、当該プロバイダーにおけるAIモデルの学習（トレーニング）には一切使用されない設定で厳格に運用されています。\n\n3. 越境移転（外国へのデータ提供）\n前各号の外部サービス利用に伴い、ユーザーの個人データは日本国外のサーバー（米国等）に保存、または同国のAIプロバイダーに送信される場合があります。当社は、法令の定めに従い、当該移転先が個人情報の保護に関する相当の措置を講じていることを確認した上でデータの取り扱いを委託します。`,
  },
  {
    title: "第4条（第三者への提供）",
    body: `当社は、次に掲げる場合を除いて、あらかじめユーザーの同意を得ることなく、第三者に個人情報を提供することはありません。\n\n1. 法令に基づく場合\n2. 人の生命、身体または財産の保護のために必要がある場合であって、本人の同意を得ることが困難であるとき\n3. 本サービスの提供において、当社が利用目的の達成に必要な範囲内において個人情報の取扱いの全部または一部を委託する場合（第3条に定める外部サービスの利用を含みます）`,
  },
  {
    title: "第5条（安全管理措置）",
    body: `当社は、ユーザーの個人情報の漏えい、滅失またはき損の防止、その他の個人情報の安全管理のために、必要かつ適切なセキュリティ対策（アクセス制御、通信の暗号化等）を講じます。`,
  },
  {
    title: "第6条（個人情報の開示・訂正・削除）",
    body: `1. ユーザーは、本サービス内の設定画面より、自身の登録情報の確認および訂正を行うことができます。\n\n2. ユーザーがアカウントの削除（退会）を行った場合、当社は、当社のデータベースから当該ユーザーの個人情報および記録データを30日以内に完全に削除します。ただし、法令に基づき保存が義務付けられている情報については、当該法令で定められた期間、保存する場合があります。\n\n3. アカウント削除を行わない限り、ユーザーのデータはサービス提供のために保持されます。`,
  },
  {
    title: "第7条（Cookieおよびローカルストレージの利用）",
    body: `本サービスでは、ユーザーの利便性向上（ゲストモード時のデータ一時保存や、ログイン状態の維持など）を目的として、ブラウザのCookieおよびローカルストレージ機能を利用しています。ブラウザの設定によりこれらの機能を無効にすることは可能ですが、その場合、本サービスの一部機能が正常に利用できなくなる場合があります。`,
  },
  {
    title: "第8条（プライバシーポリシーの変更）",
    body: `当社は、法令の改正やサービス内容の変更等により、必要に応じて本ポリシーを変更することがあります。変更を行う場合は、変更後のプライバシーポリシーの施行時期および内容を本サービス内での掲示、またはその他の適切な方法によりユーザーに周知します。ただし、法令上ユーザーの同意が必要となるような内容の変更の場合は、当社所定の方法でユーザーの同意を得るものとします。`,
  },
  {
    title: "第9条（お問い合わせ窓口）",
    body: `本ポリシーに関するお問い合わせは、下記の窓口までお願いいたします。\n\n運営者：ダツ皿アキ\n連絡先：akiissamurai@gmail.com`,
  },
  {
    title: "附則",
    body: `2026年3月1日 制定・施行`,
  },
];

// ─── タブ定義 ──────────────────────────────────────────────────────
const TABS = [
  { id: "terms", label: "利用規約", icon: ScrollText, sections: TERMS_SECTIONS, heading: "マクロ飯ビルダー 利用規約 および 健康に関する免責事項" },
  { id: "privacy", label: "プライバシーポリシー", icon: Lock, sections: PRIVACY_SECTIONS, heading: "マクロ飯ビルダー プライバシーポリシー" },
];

// ─── セクション共通レンダラー ───────────────────────────────────────
function SectionRenderer({ sections, heading, scrollRef, onScroll }) {
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
        fontSize: 14,
        fontWeight: 700,
        color: "rgba(255,255,255,0.8)",
        margin: "0 0 16px",
        textAlign: "center",
      }}>
        {heading}
      </h2>
      {sections.map((sec, i) => (
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

// ─── タブ切替バー ──────────────────────────────────────────────────
function TabBar({ activeTab, onTabChange, readTabs }) {
  return (
    <div style={{
      display: "flex",
      gap: 4,
      padding: "0 20px",
      marginBottom: 12,
    }}>
      {TABS.map((tab) => {
        const active = activeTab === tab.id;
        const Icon = tab.icon;
        const isRead = readTabs?.has(tab.id);
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 5,
              padding: "9px 0",
              borderRadius: 10,
              border: active
                ? "1px solid rgba(34,197,94,0.3)"
                : "1px solid rgba(255,255,255,0.08)",
              background: active
                ? "rgba(34,197,94,0.1)"
                : "rgba(255,255,255,0.03)",
              color: active
                ? "#4ade80"
                : "rgba(255,255,255,0.4)",
              fontSize: 11,
              fontWeight: active ? 700 : 500,
              cursor: "pointer",
              transition: "all 0.2s ease",
              position: "relative",
            }}
          >
            <Icon size={13} strokeWidth={1.5} />
            {tab.label}
            {isRead && (
              <span style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "#22c55e",
                position: "absolute",
                top: 6,
                right: 8,
              }} />
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─── TermsGate: 初回同意用（layout.js から使用） ────────────────────
export default function TermsGate() {
  const [show, setShow] = useState(false);
  const [activeTab, setActiveTab] = useState("terms");
  const [readTabs, setReadTabs] = useState(new Set());
  const scrollRef = useRef(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      setShow(true);
    } else {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.version !== TERMS_VERSION) {
          setShow(true);
        }
      } catch {
        // 旧形式
      }
    }
  }, []);

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    if (scrollHeight - scrollTop - clientHeight < 60) {
      setReadTabs((prev) => {
        const next = new Set(prev);
        next.add(activeTab);
        return next;
      });
    }
  }, [activeTab]);

  // タブ切替時にスクロール位置リセット
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  };

  const canAgree = readTabs.has("terms") && readTabs.has("privacy");

  const handleAgree = () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: TERMS_VERSION, timestamp: new Date().toISOString() })
    );
    setShow(false);
  };

  if (!show) return null;

  const currentTab = TABS.find((t) => t.id === activeTab);

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
          padding: "24px 20px 14px",
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
            利用規約・プライバシーポリシー
          </h1>
          <p style={{
            fontSize: 12,
            color: "rgba(255,255,255,0.35)",
            margin: "0 0 14px",
          }}>
            両方をお読みいただき、同意の上でご利用ください
          </p>

          {/* タブ切替 */}
          <TabBar activeTab={activeTab} onTabChange={handleTabChange} readTabs={readTabs} />
        </div>

        {/* スクロール可能な本文 */}
        <SectionRenderer
          key={activeTab}
          sections={currentTab.sections}
          heading={currentTab.heading}
          scrollRef={scrollRef}
          onScroll={handleScroll}
        />

        {/* フッター */}
        <div style={{
          padding: "14px 20px 20px",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}>
          {/* 進捗インジケーター */}
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            fontSize: 11,
            color: "rgba(255,255,255,0.3)",
          }}>
            <span style={{ color: readTabs.has("terms") ? "#4ade80" : undefined }}>
              {readTabs.has("terms") ? "\u2713" : "\u25CB"} 利用規約
            </span>
            <span style={{ color: readTabs.has("privacy") ? "#4ade80" : undefined }}>
              {readTabs.has("privacy") ? "\u2713" : "\u25CB"} プライバシーポリシー
            </span>
          </div>

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
            {canAgree
              ? "同意して利用を開始する"
              : "両方の規約を最後までお読みください"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── LegalViewer: 閲覧用モーダル（設定画面から使用） ─────────────────
export function LegalViewer({ initialTab = "terms", onClose }) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const scrollRef = useRef(null);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  };

  const currentTab = TABS.find((t) => t.id === activeTab);

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
        }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 14,
          }}>
            <h1 style={{
              fontSize: 16,
              fontWeight: 700,
              color: "rgba(255,255,255,0.85)",
              margin: 0,
            }}>
              法的情報
            </h1>
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

          {/* タブ切替 */}
          <TabBar activeTab={activeTab} onTabChange={handleTabChange} />
        </div>

        {/* スクロール可能な本文 */}
        <SectionRenderer
          key={activeTab}
          sections={currentTab.sections}
          heading={currentTab.heading}
          scrollRef={scrollRef}
        />

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
