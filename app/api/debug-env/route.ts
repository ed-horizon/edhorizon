import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'not-set';
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'not-set';
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'not-set';

    let connOk = false;
    let connError = null;
    let profilesCount = null;

    try {
        const client = createClient(supabaseUrl, anonKey);
        const { data, error, count } = await client
            .from('profiles')
            .select('*', { count: 'exact', head: true });
            
        if (error) {
            connError = error.message;
        } else {
            connOk = true;
            profilesCount = count;
        }
    } catch (e: any) {
        connError = e.message;
    }

    return NextResponse.json({
        supabaseUrl,
        anonKeyLength: anonKey.length,
        anonKeyPrefix: anonKey.substring(0, 15) + '...',
        serviceKeyLength: serviceKey.length,
        serviceKeyPrefix: serviceKey.substring(0, 15) + '...',
        connOk,
        connError,
        profilesCount,
    });
}
