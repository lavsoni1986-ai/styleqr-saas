import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, getUserRestaurant } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * POST /api/printer/print
 * Send print data to network printer
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const restaurant = await getUserRestaurant(user.id);
    if (!restaurant) {
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { type, printer, port, data } = body as {
      type: "receipt" | "kot";
      printer?: string;
      port?: number;
      data: string;
    };

    if (!type || !data) {
      return NextResponse.json({ error: "type and data are required" }, { status: 400 });
    }

    // For network printers, we would typically use socket connection
    // TODO: Implement actual network printer socket connection
    // const socket = new Socket();
    // socket.connect(port, printer);
    // socket.write(data);
    // socket.end();

    return NextResponse.json(
      { success: true, message: "Print job queued" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Printer API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
