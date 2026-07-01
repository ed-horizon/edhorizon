// Email sending utility using native fetch to keep dependencies minimal.
// Supports Resend API out of the box, falling back to local console logger.

export async function sendEmail(payload: { to: string; subject: string; html: string }) {
    const apiKey = process.env.RESEND_API_KEY;
    const fromAddress = process.env.EMAIL_FROM_ADDRESS || "reminders@edhorizon.app";

    if (apiKey) {
        try {
            const res = await fetch("https://api.resend.com/emails", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    from: `Ed Horizon <${fromAddress}>`,
                    to: [payload.to],
                    subject: payload.subject,
                    html: payload.html
                })
            });
            
            const data = await res.json();
            if (!res.ok) {
                console.error("Resend API returned an error:", data);
                return { success: false, error: data };
            }
            return { success: true, data };
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            console.error("Failed to send email via Resend:", err);
            return { success: false, error: errorMessage };
        }
    }
    
    if (process.env.NODE_ENV === "production") {
        console.error("RESEND_API_KEY is not configured; email was not sent.");
        return { success: false, error: "Email provider is not configured." };
    }

    console.log(`[MOCK EMAIL SENT] subject: ${payload.subject}`);
    return { success: true, mock: true };
}
