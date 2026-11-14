import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SHARECHECK — Your neighbours’ bills are the evidence.",
  description:
    "Check whether your building applies its shared utility formula consistently. A transparent, privacy-conscious hackathon demo.",
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
