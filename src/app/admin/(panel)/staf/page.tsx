"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatDateTime } from "@/lib/format";
import { canManageUsers, labelRole } from "@/lib/roles";
import { apiUrl } from "@/lib/paths";

type Staff = { id: string; username: string; name: string; role: string; created_at: string };

export default function AdminStaffPage() {
  const router = useRouter();
  const [items, setItems] = useState<Staff[]>([]);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("cs");
  const [error, setError] = useState("");

  async function load() {
    const [staff, auth] = await Promise.all([
      fetch(apiUrl("/api/admin/staff")).then((res) => res.json()),
      fetch(apiUrl("/api/admin/auth/me")).then((res) => res.json()),
    ]);
    if (!canManageUsers(auth.user?.role)) {
      router.replace("/admin");
      return;
    }
    setItems(staff.items || []);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function add(event: FormEvent) {
    event.preventDefault();
    setError("");
    const res = await fetch(apiUrl("/api/admin/staff"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, username, password, role }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Gagal menyimpan");
      return;
    }
    setName("");
    setUsername("");
    setPassword("");
    await load();
  }

  async function remove(item: Staff) {
    if (!confirm(`Hapus pengguna ${item.username}?`)) return;
    const res = await fetch(apiUrl(`/api/admin/staff/${item.id}`), { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Gagal menghapus");
      return;
    }
    await load();
  }

  return (
    <div>
      <h1 className="text-3xl font-extrabold">Pengguna admin</h1>
      <p className="mt-1 text-slate-500">
        Super admin dapat menambah, mengubah peran, dan menghapus akun staf.
      </p>

      <form onSubmit={add} className="mt-6 grid gap-3 rounded-3xl bg-white p-5 shadow-sm md:grid-cols-5">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nama"
          className="rounded-2xl border border-slate-200 px-4 py-3 outline-none"
        />
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Username"
          autoComplete="off"
          className="rounded-2xl border border-slate-200 px-4 py-3 outline-none"
        />
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          type="password"
          autoComplete="new-password"
          className="rounded-2xl border border-slate-200 px-4 py-3 outline-none"
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="rounded-2xl border border-slate-200 px-3 outline-none"
        >
          <option value="cs">CS</option>
          <option value="admin">Admin</option>
          <option value="superadmin">Super Admin</option>
        </select>
        <button type="submit" className="rounded-2xl bg-slate-950 px-4 font-semibold text-white">
          Simpan
        </button>
        {error ? <p className="md:col-span-5 text-sm text-red-500">{error}</p> : null}
      </form>

      <div className="mt-5 overflow-hidden rounded-3xl bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3">Nama</th>
              <th className="px-4 py-3">Username</th>
              <th className="px-4 py-3">Peran</th>
              <th className="px-4 py-3">Dibuat</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-medium">{item.name}</td>
                <td className="px-4 py-3">{item.username}</td>
                <td className="px-4 py-3">{labelRole(item.role)}</td>
                <td className="px-4 py-3 text-slate-500">{formatDateTime(item.created_at)}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => remove(item)}
                    className="text-sm font-semibold text-red-600"
                  >
                    Hapus
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
