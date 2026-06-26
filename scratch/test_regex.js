const desc = `Attachment File:\nhttps://supabase.storage/materials/9c0a3ff3-e6e5-4db8-8074-160d458a06ac_1782455059085_hw.jpg`;
const match = desc.match(/Attachment File:\s*(https?:\/\/\S+)/i);
console.log("Match output:", match);
if (match) {
    const cleanDesc = desc.replace(/Attachment File:\s*https?:\/\/\S+/i, '').trim();
    console.log("Cleaned description:", JSON.stringify(cleanDesc));
    console.log("Attachment URL:", match[1]);
} else {
    console.log("No match found!");
}
