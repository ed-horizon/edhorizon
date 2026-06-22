const { Client } = require('pg');
const client = new Client({
    host: 'aws-0-ap-south-1.pooler.supabase.com',
    port: 5432,
    user: 'postgres',
    password: 'Sivavini@2024',
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
});
client.connect()
    .then(() => {
        console.log("CONNECTED successfully!");
        client.end();
    })
    .catch(e => console.log("FAILED:", e.message));
