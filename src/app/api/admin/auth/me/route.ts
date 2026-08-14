import { NextResponse } from "next/server";
import { currentAdmin } from "@/lib/current-user";

export async function GET() {
  const user = await currentAdmin();
  if (!user) return NextResponse.json({ user: null }, { status: 401 });
  return NextResponse.json({ user });
}
