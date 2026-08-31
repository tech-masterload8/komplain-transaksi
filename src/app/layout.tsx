import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { AgentProvider } from "@/components/customer/AgentContext";
import { currentUser } from "@/lib/current-user";
import { toAgentProfile } from "@/lib/agent-profile";
import { signSession } from "@/lib/session";

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
  const user = await currentUser();
  const token = user ? await signSession(user) : null;

  return (
    <html lang="id">
      <body className={`${sans.variable} antialiased`}>
        <AgentProvider user={toAgentProfile(user)} token={token}>
          {children}
        </AgentProvider>
      </body>
    </html>
  );
}
