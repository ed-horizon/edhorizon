import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSignedDownloadUrl } from "@/lib/r2";

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const { id } = await context.params;
    if (!id) {
        return NextResponse.json({ error: "Missing material ID" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : supabase;

    const { data: material, error } = await admin
        .from('batch_learning_content')
        .select('id, batch_id, title, content_url')
        .eq('id', id)
        .single();

    if (error || !material || !material.content_url) {
        return NextResponse.json({ error: "Material not found" }, { status: 404 });
    }

    const url = material.content_url;
    if (url.startsWith("http://") || url.startsWith("https://")) {
        return NextResponse.redirect(url);
    }

    try {
        const { data: metadata } = await admin
            .from("file_metadata")
            .select("original_filename")
            .eq("r2_key", url)
            .maybeSingle();

        const downloadName = metadata?.original_filename || `${material.title}.pdf`;
        const signedUrl = await getSignedDownloadUrl(url, downloadName);
        return NextResponse.redirect(signedUrl);
    } catch (err: any) {
        console.error("Batch material download error:", err);
        return NextResponse.json({ error: "Failed to generate download link" }, { status: 500 });
    }
}
