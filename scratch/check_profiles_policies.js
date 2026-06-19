const { Client } = require('pg');
const fs = require('fs');
const dns = require('dns');

if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder('ipv4first');
}

const host = 'db.bgaepltxhycmripzovan.supabase.co';
const port = 5432;
const user = 'postgres';
const database = 'postgres';
const password = 'Sivavini@2024';

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
        
        console.log("Fetching policies for public.profiles...");
        const res = await client.query(`
            SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
            FROM pg_policies 
            WHERE tablename = 'profiles';
        `);
        console.log("Policies:", JSON.stringify(res.rows, null, 2));
        
        await client.end();
    } catch (err) {
        console.error("Failed:", err.message);
    }
}

run();
