import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { error } = await supabase
            .from('staff_shifts')
            .update({ clock_out: new Date().toISOString() })
            .eq('profile_id', user.id)
            .is('clock_out', null);

        if (error) {
            console.error("API clock-out error:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error("API clock-out exception:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
