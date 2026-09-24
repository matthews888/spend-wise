import Link from "next/link";

export type Section = { heading: string; paragraphs: string[] };

export default function InfoPage({ title, intro, sections }: { title: string; intro: string; sections: Section[] }) {
  return <main className="info-page"><header className="info-header"><Link className="landing-logo" href="/">Spend<span>Wise</span><i>.</i></Link><Link href="/">Back to home ↗</Link></header><div className="info-content"><span className="section-label">SPENDWISE</span><h1>{title}</h1><p className="info-intro">{intro}</p>{sections.map(section => <section key={section.heading}><h2>{section.heading}</h2>{section.paragraphs.map(p => <p key={p}>{p}</p>)}</section>)}<p className="info-support">Need help? <Link href="/contact">Contact us</Link>.</p></div><footer className="info-footer"><Link href="/privacy">Privacy policy</Link><Link href="/terms">Terms of use</Link><Link href="/security">Security</Link><Link href="/help">Help &amp; FAQ</Link><Link href="/">Home</Link></footer></main>;
}
