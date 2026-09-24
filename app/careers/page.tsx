import InfoPage from "../_components/info-page";

export const metadata = { title: "Careers | SpendWise" };
export default function Page() { return <InfoPage title="Careers" intro="Interested in helping people understand their spending?" sections={[
  { heading: "Open roles", paragraphs: ["There are no roles listed here at the moment. Check back for future opportunities."] },
  { heading: "Get in touch", paragraphs: ["Visit the contact page for the current way to reach the SpendWise team. Please do not share sensitive financial information when enquiring."] },
]} />; }
