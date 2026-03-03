"use client";

import Link from "next/link";
import { trackEvent } from "@/lib/trackEvent";
import type { ComponentProps } from "react";

type Props = ComponentProps<typeof Link> & {
  /** 送信するイベント名 */
  event: string;
};

/**
 * クリック時にイベントを送信する Link コンポーネント。
 * サーバーコンポーネントから使える小さな Client Component。
 */
export default function TrackedLink({ event, onClick, ...props }: Props) {
  function handleClick(e: React.MouseEvent<HTMLAnchorElement>) {
    trackEvent(event);
    onClick?.(e);
  }

  return <Link onClick={handleClick} {...props} />;
}
