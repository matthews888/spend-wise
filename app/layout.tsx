import "./globals.css";
export const metadata = {
  title: "SpendWise — See where your money really goes",
  description: "Upload bank statements, understand subscriptions and find avoidable spending.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#050706",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
