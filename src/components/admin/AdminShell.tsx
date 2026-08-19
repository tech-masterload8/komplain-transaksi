"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, LogOut, MessageSquareText, Ticket, Users } from "lucide-react";
import { canManageUsers, labelRole } from "@/lib/roles";

const NAV = [
  { href: "/admin", label: "Dasbor", icon: LayoutDashboard },
  { href: "/admin/tiket", label: "Tiket Komplain", icon: Ticket },
  { href: "/admin/shortcut", label: "Shortcut Pesan", icon: MessageSquareText },
  { href: "/admin/staf", label: "Pengguna", icon: Users, superadmin: true },
];

export default function AdminShell({
  children,
  name,
  role,
  username,
}: {
  children: React.ReactNode;
  name: string;
  role: string;
  username?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const items = NAV.filter((item) => !item.superadmin || canManageUsers(role));

  async function logout() {
    await fetch("/api/admin/auth/logout", { method: "POST" });
    router.replace("/admin/login");
  }

  return (
    <div className="flex min-h-dvh bg-slate-100 text-slate-900">
      <aside className="hidden w-64 flex-col bg-slate-950 text-white md:flex">
        <div className="border-b border-white/10 px-5 py-5">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Admin</p>
          <h1 className="mt-1 text-lg font-bold">Komplain Transaksi</h1>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {items.map((item) => {
            const active = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${
                  active ? "bg-white text-slate-950" : "text-slate-300 hover:bg-white/10"
                }`}
              >
                <Icon size={16} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-white/10 p-4">
          <p className="truncate text-sm font-medium">{name}</p>
          <p className="truncate text-xs text-slate-400">
            {username ? `${username} · ` : ""}
            {labelRole(role)}
          </p>
          <button
            type="button"
            onClick={logout}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-white/10 py-2 text-sm hover:bg-white/15"
          >
            <LogOut size={14} /> Keluar
          </button>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 md:hidden">
          <p className="font-bold">Admin Komplain</p>
          <button type="button" onClick={logout} className="text-sm text-slate-500">
            Keluar
          </button>
        </header>
        <div className="flex gap-2 overflow-x-auto border-b border-slate-200 bg-white px-3 py-2 md:hidden">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="shrink-0 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium"
            >
              {item.label}
            </Link>
          ))}
        </div>
        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
