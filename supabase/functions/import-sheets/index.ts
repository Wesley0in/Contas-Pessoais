import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SHEET_MAP: Record<string, { row: number; type: string }> = {
  salary_liz:          { row: 4,  type: 'income' },
  salary_wesley:       { row: 5,  type: 'income' },
  pension_liz:         { row: 6,  type: 'income' },
  benefits:            { row: 7,  type: 'income' },
  extra_income_wesley: { row: 8,  type: 'income' },
  credit_card:         { row: 12, type: 'expense' },
  macbook:             { row: 13, type: 'expense' },
  rent:                { row: 14, type: 'expense' },
  condo:               { row: 15, type: 'expense' },
  transport:           { row: 16, type: 'expense' },
  electricity:         { row: 17, type: 'expense' },
  phone:               { row: 18, type: 'expense' },
  storage:             { row: 19, type: 'expense' },
  pet:                 { row: 20, type: 'expense' },
  therapy:             { row: 21, type: 'expense' },
  streaming:           { row: 22, type: 'expense' },
};

async function getAccessToken(serviceAccount: { client_email: string; private_key: string }): Promise<string> {
  const header = btoa(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const now = Math.floor(Date.now() / 1000);
  const claimSet = btoa(JSON.stringify({
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/spreadsheets.readonly",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  }));

  const pemContents = serviceAccount.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\n/g, "");

  const binaryKey = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));

  const key = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signatureInput = new TextEncoder().encode(`${header}.${claimSet}`);
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, signatureInput);
  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const jwt = `${header}.${claimSet}.${signatureB64}`;

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  if (!tokenResponse.ok) {
    throw new Error(`Token exchange failed: ${await tokenResponse.text()}`);
  }

  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: settings } = await supabase.from("settings").select("*").limit(1).single();
    if (!settings?.spreadsheet_id || !settings?.service_account_json) {
      throw new Error("Settings not configured");
    }

    let serviceAccount;
    try {
      serviceAccount = JSON.parse(settings.service_account_json);
    } catch {
      throw new Error("Invalid service account JSON");
    }

    const accessToken = await getAccessToken(serviceAccount);
    const spreadsheetId = settings.spreadsheet_id;
    const sheetName = settings.sheet_name;
    const referenceYear = settings.reference_year;

    // Read ranges B4:M22
    // We'll read everything at once for efficiency
    const range = `${sheetName}!B4:M22`;
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      throw new Error(`Sheets API error: ${await res.text()}`);
    }

    const sheetData = await res.json();
    const rows = sheetData.values || [];

    // Map the rows to categories
    // Rows 4-8 are indices 0-4 in the fetched range (starting B4)
    // Rows 12-22 are indices 8-18 (since B4 is index 0, B5 is 1, ..., B11 is 7, B12 is 8)
    
    const transactionsToInsert: any[] = [];
    
    Object.entries(SHEET_MAP).forEach(([category, info]) => {
      const rowIndex = info.row - 4; // Because range starts at row 4
      const rowValues = rows[rowIndex] || [];
      
      rowValues.forEach((val: string, colIndex: number) => {
        const amount = parseFloat(val.replace(/[R$\s]/g, '').replace(',', '.'));
        if (!isNaN(amount) && amount > 0) {
          transactionsToInsert.push({
            type: info.type,
            category,
            amount,
            month: colIndex + 1, // B=1, C=2...
            year: referenceYear,
            sync_status: 'synced',
            description: 'Importado da Planilha',
          });
        }
      });
    });

    if (transactionsToInsert.length > 0) {
      // Clear existing data for the reference year to avoid duplicates
      // AS REQUESTED: "A recomendação é substituir"
      await supabase.from("transactions").delete().eq("year", referenceYear);

      // Insert new data
      const { error: insertError } = await supabase.from("transactions").insert(transactionsToInsert);
      if (insertError) throw insertError;
    }

    return new Response(
      JSON.stringify({ success: true, count: transactionsToInsert.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
