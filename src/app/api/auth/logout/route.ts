import { NextResponse } from "next/server";
import { signOut } from "@/app/api/auth/[...nextauth]/route";

export async function POST() {
  await signOut({ redirect: false });
  return NextResponse.json({ success: true }, { status: 200 });
}
