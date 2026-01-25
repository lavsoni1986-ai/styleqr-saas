import { NextRequest, NextResponse } from "next/server";

/**
 * Menu API Root Route
 * 
 * Note: This route is not used for actual API endpoints.
 * The actual endpoints are:
 * - POST /api/menus/categories - Create category (in categories/route.ts)
 * - GET /api/menus/categories - List categories (in categories/route.ts)
 * - POST /api/menus/items - Create menu item (in items/route.ts)
 * - GET /api/menus/items - List menu items (in items/route.ts)
 * 
 * This file exists to satisfy Next.js route structure requirements.
 */

export const dynamic = "force-dynamic";

/**
 * GET /api/menus
 * Returns method not allowed - use /api/menus/categories or /api/menus/items
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  return NextResponse.json(
    { error: "Method not allowed. Use /api/menus/categories or /api/menus/items" },
    { status: 405 }
  );
}

/**
 * POST /api/menus
 * Returns method not allowed - use /api/menus/categories or /api/menus/items
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  return NextResponse.json(
    { error: "Method not allowed. Use /api/menus/categories or /api/menus/items" },
    { status: 405 }
  );
}

