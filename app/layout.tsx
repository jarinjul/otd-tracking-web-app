import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Navbar } from "@/components/layout/Navbar"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "⚡ Nexus Hub",
  description: "Pre-Dev & Executive Hub — Portfolio Management Platform",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.className} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("nexus-theme");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`,
          }}
        />
      </head>
      <body className="min-h-screen flex flex-col bg-surface">
        <Navbar />
        <main className="flex-1 flex flex-col">
          {children}
        </main>
      </body>
    </html>
  )
}
