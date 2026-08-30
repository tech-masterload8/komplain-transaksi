import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { AgentProvider } from "@/components/customer/AgentContext";
import { currentUser } from "@/lib/current-user";
import { toAgentProfile } from "@/lib/agent-profile";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const sans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Komplain Transaksi",
  description: "Laporan komplain transaksi reseller",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const agent = toAgentProfile(await currentUser());

  return (
    <html lang="id">
      <body className={`${sans.variable} antialiased`}>
        <AgentProvider user={agent}>{children}</AgentProvider>
      </body>
    </html>
  );
}
