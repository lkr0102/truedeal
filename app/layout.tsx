import type React from "react"
import type { Metadata, Viewport } from "next"
import { DM_Sans, DM_Mono } from "next/font/google"
import "./globals.css"
import { SolanaProvider } from "@/providers/SolanaProvider"

const dmSans = DM_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-dm-sans",
  weight: ["300", "400", "500", "600", "700", "800"],
})

const dmMono = DM_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-dm-mono",
  weight: ["300", "400", "500"],
})

export const viewport: Viewport = {
  themeColor: "#16A34A",
}

export const metadata: Metadata = {
  metadataBase: new URL("https://truedeal.app"),
  title: "True Deal — Set your goals. Honor your word. Get paid for it.",
  description: "Acordos digitais com stake e verificação automática. Árbitro neutro entre pessoas.",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-icon.png",
  },
  openGraph: {
    title: "True Deal",
    description: "Set your goals. Honor your word. Get paid for it.",
    images: [{ url: "/brand/og-banner-1200x630.svg", width: 1200, height: 630 }],
    siteName: "True Deal",
  },
  twitter: {
    card: "summary_large_image",
    title: "True Deal",
    description: "Set your goals. Honor your word. Get paid for it.",
    images: ["/brand/og-banner-1200x630.svg"],
  },
  other: {
    "talentapp:project_verification":
      "1c84902ccdc25a7b437dc5cf23888002ab57bc03a45ff13a6f0119b7e37b1fc9d24e41342ae817cf4fd92283a7ec97972fc68d2a72203c754b5b5f9ebbfe73df",
  },
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={`${dmSans.variable} ${dmMono.variable} antialiased`}>
      <body style={{ fontFamily: "var(--font-dm-sans, 'DM Sans', sans-serif)" }}>
        <SolanaProvider>{children}</SolanaProvider>
      </body>
    </html>
  )
}
