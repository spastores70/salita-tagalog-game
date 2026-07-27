import type { Metadata } from "next";
import { Baloo_2, Nunito_Sans } from "next/font/google";
import "./globals.css";

const baloo = Baloo_2({ variable: "--font-baloo", subsets: ["latin"], weight: ["700", "800"] });
const nunito = Nunito_Sans({ variable: "--font-nunito", subsets: ["latin"], weight: ["600", "700", "800", "900"] });

export const metadata: Metadata = {
  title: "SALITA — Larong Salitang Tagalog",
  description: "Pagdugtungin ang mga titik, buuin ang salitang Tagalog, at kumpletuhin ang crossword.",
  other: { "codex-preview": "development" },
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fil">
      <body className={`${baloo.variable} ${nunito.variable}`}>{children}</body>
    </html>
  );
}
