"use client";

import Link from "next/link";
import { useEffect } from "react";

const scrollKey = "spendwise-footer-scroll";
const returnKey = "spendwise-return-to-footer";

export function FooterInfoLink({ href, children }: { href: string; children: React.ReactNode }) {
  return <Link href={href} onClick={() => sessionStorage.setItem(scrollKey, String(window.scrollY))}>{children}</Link>;
}

export function BackToFooter() {
  return <button className="back-to-footer" type="button" onClick={() => {
    sessionStorage.setItem(returnKey, "1");
    window.location.assign("/#site-footer");
  }} aria-label="Back to footer"><span aria-hidden="true">←</span> Back to footer</button>;
}

export function RestoreFooterPosition() {
  useEffect(() => {
    if (sessionStorage.getItem(returnKey) !== "1") return;
    sessionStorage.removeItem(returnKey);
    const savedY = Number(sessionStorage.getItem(scrollKey));
    if (!Number.isFinite(savedY)) return;
    const frame = requestAnimationFrame(() => window.scrollTo({ top: savedY, behavior: "instant" }));
    return () => cancelAnimationFrame(frame);
  }, []);
  return null;
}
