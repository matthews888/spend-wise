import InfoPage from "../_components/info-page";

export const metadata = { title: "Terms of use | SpendWise" };
export default function Page() { return <InfoPage title="Terms of use" intro="A short guide to using the current SpendWise app." sections={[
  { heading: "Using the app", paragraphs: ["Use SpendWise only with statements you are entitled to access. Review imported transactions and categories before relying on any totals; PDF layouts and merchant names can lead to extraction or categorisation errors."] },
  { heading: "Information, not financial advice", paragraphs: ["SpendWise shows spending patterns to help you review your own finances. It does not provide personal financial advice or make decisions for you. Confirm important figures against your bank records."] },
  { heading: "Availability and changes", paragraphs: ["Features and supported statement formats may change. The app can be unavailable during maintenance or technical issues. Your saved browser data may be lost if you clear site data, change devices or use private browsing."] },
]} />; }
