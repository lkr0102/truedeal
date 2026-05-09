import type React from "react"
import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { SolanaProvider } from "@/providers/SolanaProvider"

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
  weight: ["300", "400", "600", "700"],
})

export const viewport: Viewport = {
  themeColor: "#16A34A",
}

export const metadata: Metadata = {
  metadataBase: new URL("https://truedeal.app"),
  title: "TrueDeal — Performance Agreements On-Chain.",
  description: "Acordos de performance digitais com colateral auditável e liquidação automatizada.",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-icon.png",
  },
  openGraph: {
    title: "TrueDeal",
    description: "Don't trust. Verify Performance.",
    images: [{ url: "/brand/og-banner-1200x630.svg", width: 1200, height: 630 }],
    siteName: "TrueDeal",
  },
  twitter: {
    card: "summary_large_image",
    title: "TrueDeal",
    description: "Sovereign Performance Agreements.",
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
    <html lang="pt-BR" className={`${inter.variable} antialiased`}>
      <body className="font-sans">
        <SolanaProvider>{children}</SolanaProvider>
      </body>
    </html>
  )
}
