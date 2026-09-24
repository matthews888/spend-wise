import InfoPage from "../_components/info-page";

export const metadata = { title: "Privacy policy | SpendWise" };
export default function Page() { return <InfoPage title="Privacy policy" intro="How the current SpendWise app handles your bank statements and spending data." sections={[
  { heading: "Your statements stay in your browser", paragraphs: ["The current app reads PDF and CSV statement files on your device. It does not require your bank login or upload the statement files to a SpendWise server.", "Parsed transactions and statement names are saved in this browser’s local storage so your analysis is available when you return on the same browser and device. Anyone with access to that browser profile may be able to see that data."] },
  { heading: "What your data is used for", paragraphs: ["SpendWise uses the transactions you provide to show spending totals, categories and recurring payments. Your statement data is not needed to browse the public website."] },
  { heading: "Your controls", paragraphs: ["You can delete your imported data in the app’s Settings. Clearing this site’s browser storage also removes the saved analysis. Deleting browser data cannot remove copies of the original statement files that remain on your device."] },
  { heading: "Website operation and questions", paragraphs: ["The website host may process standard connection information needed to deliver the pages, such as IP addresses and request logs. For privacy questions or requests, use the contact route below. Please do not include account numbers or statement files in a public support request."] },
]} />; }
