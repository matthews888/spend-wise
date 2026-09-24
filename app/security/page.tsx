import InfoPage from "../_components/info-page";

export const metadata = { title: "Security | SpendWise" };
export default function Page() { return <InfoPage title="Security" intro="A practical overview of how to use SpendWise safely." sections={[
  { heading: "No bank connection", paragraphs: ["SpendWise does not ask for your online banking password. In the current app, statements are read in your browser and files are not uploaded to a SpendWise server."] },
  { heading: "Storage on your device", paragraphs: ["Imported transactions are saved in this browser’s local storage. Use a trusted device, keep its screen lock enabled and avoid importing statements on a shared computer. You can remove saved data from Settings or by clearing this site’s browser storage."] },
  { heading: "Report a concern", paragraphs: ["If you find a security issue, use the contact page to find the current support channel. Do not post bank details, statement files, passwords or exploit details in a public issue."] },
]} />; }
