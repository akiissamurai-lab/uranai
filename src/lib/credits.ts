import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

export class InsufficientCreditsError extends Error {
  constructor(public readonly credits: number) {
    super("insufficient_credits");
  }
}

/**
 * クレジットを事前確保（reserve）し、FortuneRequestをpendingで作成。
 * トランザクション内で残高チェック→減算→記録を一括実行。
 *
 * 失敗時は refundCredit() で返還する。
 */
export async function reserveCreditAndCreateRequest(
  userId: string,
  requestData: {
    inputHash: string;
    inputJson: unknown;
    mode: string;
    parentId?: string;
  },
) {
  return prisma.$transaction(async (tx) => {
    // 1. 残高チェック
    const wallet = await tx.creditWallet.findUnique({
      where: { userId },
    });

    if (!wallet || wallet.credits < 1) {
      throw new InsufficientCreditsError(wallet?.credits ?? 0);
    }

    // 2. FortuneRequest 作成（pending）
    const fortune = await tx.fortuneRequest.create({
      data: {
        userId,
        inputHash: requestData.inputHash,
        inputJson: requestData.inputJson as Prisma.InputJsonValue,
        mode: requestData.mode,
        status: "pending",
        parentId: requestData.parentId,
      },
    });

    // 3. クレジット減算
    await tx.creditWallet.update({
      where: { userId },
      data: { credits: { decrement: 1 } },
    });

    // 4. 取引記録
    await tx.creditTransaction.create({
      data: {
        userId,
        delta: -1,
        reason: "consume",
        refId: fortune.id,
      },
    });

    return fortune;
  });
}

/**
 * 生成失敗時のクレジット返還。
 * 冪等性: 同一 refId の refund が既に存在すれば何もしない。
 */
export async function refundCredit(
  userId: string,
  fortuneRequestId: string,
) {
  // 冪等チェック
  const existing = await prisma.creditTransaction.findFirst({
    where: {
      userId,
      refId: fortuneRequestId,
      reason: "refund",
    },
  });
  if (existing) return; // 既に返還済み

  await prisma.$transaction(async (tx) => {
    await tx.creditWallet.update({
      where: { userId },
      data: { credits: { increment: 1 } },
    });

    await tx.creditTransaction.create({
      data: {
        userId,
        delta: 1,
        reason: "refund",
        refId: fortuneRequestId,
      },
    });

    await tx.fortuneRequest.update({
      where: { id: fortuneRequestId },
      data: { status: "failed" },
    });
  });
}

/**
 * 月次クレジット付与（サブスク更新時）。
 * 冪等性: reason に月キーを含め、同一月の重複付与を防ぐ。
 */
export async function grantMonthlyCredits(
  userId: string,
  monthKey: string, // "2026-03"
  amount: number,
) {
  const reason = `sub_grant:${monthKey}`;

  const existing = await prisma.creditTransaction.findFirst({
    where: { userId, reason },
  });
  if (existing) return; // 今月分は付与済み

  await prisma.$transaction(async (tx) => {
    await tx.creditWallet.upsert({
      where: { userId },
      update: { credits: { increment: amount } },
      create: { userId, credits: amount },
    });

    await tx.creditTransaction.create({
      data: { userId, delta: amount, reason },
    });
  });
}
