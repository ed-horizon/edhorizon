const { Client } = require('pg');
const dns = require('dns');
if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder('ipv4first');
}

const host = 'db.bgaepltxhycmripzovan.supabase.co';
const port = 5432;
const user = 'postgres';
const database = 'postgres';
const password = process.argv[2];

if (!password) {
    console.error("Error: Please provide the database password as a command line argument.");
    console.error("Usage: node scratch/fix_operations_policies.js <YOUR_DATABASE_PASSWORD>");
    process.exit(1);
}

async function run() {
    console.log("Connecting to Supabase database...");
    const client = new Client({
        host,
        port,
        user,
        password,
        database,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log("Connected successfully!");
        
        console.log("Updating reschedule_requests RLS policies...");
        await client.query(`
            DROP POLICY IF EXISTS "Users can view reschedule_requests associated with them" ON public.reschedule_requests;
            DROP POLICY IF EXISTS "Teachers and Admins can update reschedule_requests" ON public.reschedule_requests;

            CREATE POLICY "Users can view reschedule_requests associated with them"
                ON public.reschedule_requests FOR SELECT
                USING (auth.uid() = student_id OR auth.uid() = teacher_id OR EXISTS (
                    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin', 'hr', 'operations')
                ));

            CREATE POLICY "Teachers and Admins can update reschedule_requests"
                ON public.reschedule_requests FOR UPDATE
                USING (auth.uid() = teacher_id OR EXISTS (
                    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin', 'hr', 'operations')
                ));
        `);
        console.log("RLS policies updated successfully!");
        
        console.log("Reloading PostgREST schema cache...");
        await client.query("NOTIFY pgrst, 'reload schema';");
        
        await client.end();
        console.log("Finished successfully!");
    } catch (err) {
        console.error("Failed:", err.message);
        process.exit(1);
    }
}

run();
