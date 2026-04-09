import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

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

const MONTH_TO_COL: Record<number, string> = {
  2: 'B', 3: 'C', 4: 'D', 5: 'E', 6: 'F',
  7: 'G', 8: 'H', 9: 'I', 10: 'J', 11: 'K', 12: 'L',
};

async function getAccessToken(serviceAccount: { client_email: string; private_key: string }): Promise<string> {
  const header = btoa(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const now = Math.floor(Date.now() / 1000);
  const claimSet = btoa(JSON.stringify({
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/spreadsheets",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  }));

  // Import private key
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

async function readCell(accessToken: string, spreadsheetId: string, range: string): Promise<number> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Read cell failed [${res.status}]: ${await res.text()}`);
  const data = await res.json();
  return parseFloat(data.values?.[0]?.[0] ?? "0") || 0;
}

async function writeCell(accessToken: string, spreadsheetId: string, range: string, value: number): Promise<void> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ values: [[value]] }),
  });
  if (!res.ok) throw new Error(`Write cell failed [${res.status}]: ${await res.text()}`);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { transactionId, operation, amount, category, month, year, oldAmount, oldCategory, oldMonth, oldYear } = body;

    // Get settings from DB
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: settings } = await supabase.from("settings").select("*").limit(1).single();
    if (!settings?.spreadsheet_id || !settings?.service_account_json) {
      // No settings configured, mark as error
      if (transactionId) {
        await supabase.from("transactions").update({
          sync_status: "error",
          sync_error: "Google Planilhas não configurado",
        }).eq("id", transactionId);
      }
      return new Response(JSON.stringify({ error: "Settings not configured" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let serviceAccount;
    try {
      serviceAccount = JSON.parse(settings.service_account_json);
    } catch {
      throw new Error("Invalid service account JSON");
    }

    const accessToken = await getAccessToken(serviceAccount);

    // Get transaction from DB if needed
    let tx: any = null;
    if (transactionId && operation !== "subtract") {
      const { data } = await supabase.from("transactions").select("*").eq("id", transactionId).single();
      tx = data;
    }

    const sheetName = settings.sheet_name;
    const spreadsheetId = settings.spreadsheet_id;

    if (operation === "add" && tx) {
      const map = SHEET_MAP[tx.category];
      const col = MONTH_TO_COL[tx.month];
      if (!map || !col) throw new Error("Invalid category or month");

      const cellRef = `${sheetName}!${col}${map.row}`;
      const currentValue = await readCell(accessToken, spreadsheetId, cellRef);
      await writeCell(accessToken, spreadsheetId, cellRef, currentValue + Number(tx.amount));

      await supabase.from("transactions").update({ sync_status: "synced", sync_error: null }).eq("id", transactionId);

    } else if (operation === "subtract") {
      const cat = category;
      const m = month;
      const map = SHEET_MAP[cat];
      const col = MONTH_TO_COL[m];
      if (!map || !col) throw new Error("Invalid category or month");

      const cellRef = `${sheetName}!${col}${map.row}`;
      const currentValue = await readCell(accessToken, spreadsheetId, cellRef);
      await writeCell(accessToken, spreadsheetId, cellRef, Math.max(0, currentValue - Number(amount)));

    } else if (operation === "edit" && tx) {
      // Subtract old value
      const oldMap = SHEET_MAP[oldCategory];
      const oldCol = MONTH_TO_COL[oldMonth];
      if (oldMap && oldCol) {
        const oldCellRef = `${sheetName}!${oldCol}${oldMap.row}`;
        const oldCurrentValue = await readCell(accessToken, spreadsheetId, oldCellRef);
        await writeCell(accessToken, spreadsheetId, oldCellRef, Math.max(0, oldCurrentValue - Number(oldAmount)));
      }

      // Add new value
      const newMap = SHEET_MAP[tx.category];
      const newCol = MONTH_TO_COL[tx.month];
      if (newMap && newCol) {
        const newCellRef = `${sheetName}!${newCol}${newMap.row}`;
        const newCurrentValue = await readCell(accessToken, spreadsheetId, newCellRef);
        await writeCell(accessToken, spreadsheetId, newCellRef, newCurrentValue + Number(tx.amount));
      }

      await supabase.from("transactions").update({ sync_status: "synced", sync_error: null }).eq("id", transactionId);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Sync error:", message);

    // Try to mark transaction as error
    try {
      const body = await req.clone().json().catch(() => ({}));
      if (body.transactionId) {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseKey);
        await supabase.from("transactions").update({
          sync_status: "error",
          sync_error: message,
        }).eq("id", body.transactionId);
      }
    } catch {}

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
