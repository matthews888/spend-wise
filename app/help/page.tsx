import InfoPage from "../_components/info-page";

export const metadata = { title: "Help & FAQ | SpendWise" };
export default function Page() { return <InfoPage title="Help & FAQ" intro="Answers to common questions about importing and reviewing your spending." sections={[
  { heading: "How do I get started?", paragraphs: ["Open the app, select Upload, and choose a PDF or CSV bank statement. Review the transactions and categories after import."] },
  { heading: "Why do some totals look wrong?", paragraphs: ["A bank’s PDF layout, pending transactions, transfers and merchant labels can affect the analysis. Compare totals with the original statement and check for missing or duplicated transactions."] },
  { heading: "Where is my data saved?", paragraphs: ["The current app saves parsed transactions in the local storage of the browser you used. It will not automatically appear on another device. You can clear imported data in Settings."] },
  { heading: "Does SpendWise connect to my bank?", paragraphs: ["No. The current app analyses statements you choose and does not request bank login details."] },
]} />; }
