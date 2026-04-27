import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
  weight: ["400", "600", "700"],
})

export const metadata: Metadata = {
  title: "True Deal - Don't trust. Make a Deal.",
  description: "App de acordos digitais com stake. Árbitro neutro automatizado entre pessoas.",
  generator: "v0.app",
  other: {
    "talentapp:project_verification": "1c84902ccdc25a7b437dc5cf23888002ab57bc03a45ff13a6f0119b7e37b1fc9d24e41342ae817cf4fd92283a7ec97972fc68d2a72203c754b5b5f9ebbfe73df",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${inter.variable} antialiased`}>
      <body className="font-sans">{children}</body>
    </html>
  )
}
