require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testGoogle() {
  const { data: studioInfo } = await supabase
    .from("studio_info")
    .select("id, google_oauth")
    .limit(1)
    .single();

  console.log("Has google_oauth:", !!studioInfo?.google_oauth);
  if (!studioInfo?.google_oauth) {
    console.log("No Google OAuth found.");
    return;
  }
  
  try {
    const crypto = require("crypto");
    // decrypt
    const ENCRYPTION_KEY = process.env.SETTINGS_ENCRYPTION_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    const key = crypto.createHash('sha256').update(ENCRYPTION_KEY).digest('base64').substring(0, 32);
    const textParts = studioInfo.google_oauth.split(':');
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    const authData = JSON.parse(decrypted.toString());
    
    console.log("Token scopes:", authData.scope);
    
    // Fetch google
    const GOOGLE_CALENDAR_API = "https://www.googleapis.com/calendar/v3/calendars/primary/events";
    const url = new URL(GOOGLE_CALENDAR_API);
    url.searchParams.append("timeMin", "2026-05-01T00:00:00Z");
    url.searchParams.append("timeMax", "2026-05-31T23:59:59Z");
    url.searchParams.append("singleEvents", "true");
    
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${authData.access_token}` }
    });
    
    console.log("Google API status:", res.status);
    if (!res.ok) {
      console.log("Error:", await res.text());
    } else {
      const data = await res.json();
      console.log("Found items:", data.items?.length);
      console.log(data.items.slice(0, 2).map(i => i.summary + " " + (i.start.date || i.start.dateTime)));
    }
  } catch (e) {
    console.error("Error:", e);
  }
}

testGoogle();
