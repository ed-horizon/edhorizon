import { NextResponse } from "next/server";
import { executeFinalizeClassSession } from "@/lib/attendance-finalize";

export async function POST(req: Request) {
    try {
        const body = await req.json().catch(() => null);
        if (!body || typeof body !== 'object') {
            return NextResponse.json({ success: false, error: "Invalid JSON payload" }, { status: 400 });
        }

        const result = await executeFinalizeClassSession(body);
        if (!result.success) {
            return NextResponse.json({ success: false, error: result.error }, { status: 400 });
        }

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error("API attendance/finalize error:", err);
        return NextResponse.json(
            { success: false, error: err?.message || "An unexpected error occurred" },
            { status: 500 }
        );
    }
}
