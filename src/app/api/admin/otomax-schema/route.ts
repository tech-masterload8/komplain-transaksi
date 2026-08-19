import { NextResponse } from "next/server";
import { inspectOtomaxSchema } from "@/lib/otomax";
import { requireStaff } from "@/lib/api-auth";
import { canManageUsers } from "@/lib/roles";

export async function GET() {
  const { user, error } = await requireStaff();
  if (error || !user) return error!;
  if (!canManageUsers(user.role)) {
    return NextResponse.json({ error: "Tidak memiliki akses" }, { status: 403 });
  }
  const info = await inspectOtomaxSchema();
  return NextResponse.json(info);
}
