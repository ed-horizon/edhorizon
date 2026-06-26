const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://bgaepltxhycmripzovan.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJnYWVwbHR4aHljbXJpcHpvdmFuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDExMTE4MCwiZXhwIjoyMDg1Njg3MTgwfQ.EJwpYBKvfNQZRa9mtsNqa-Nn7-IUP4uhSeqTNnm1kN0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkHomework() {
    console.log("Fetching homework assignments...");
    const { data, error } = await supabase
        .from('homework_assignments')
        .select('*')
        .limit(1);

    if (error) {
        console.error("Error fetching:", error);
        return;
    }

    if (data && data.length > 0) {
        console.log("Full record keys:", Object.keys(data[0]));
        console.log("Full record data:", data[0]);
    } else {
        console.log("No data found.");
    }
}

checkHomework();
