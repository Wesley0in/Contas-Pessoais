import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { spreadsheetId, sheetName, serviceAccountJson } = await req.json();

    if (!spreadsheetId || !serviceAccountJson) {
      return new Response(
        JSON.stringify({ error: "Missing spreadsheetId or serviceAccountJson" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let serviceAccount;
    try {
      serviceAccount = JSON.parse(serviceAccountJson);
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get access token
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

    // Try to read cell A2 to verify connection
    const testRange = `${sheetName || "Balanço Geral"}!A2`;
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(testRange)}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!res.ok) {
      if (res.status === 403) {
        throw new Error("Permissão Negada: Você esqueceu de compartilhar a planilha com o e-mail da Service Account como 'Editor'?");
      }
      if (res.status === 404) {
        throw new Error("Planilha não encontrada: Verifique se o ID ou o Link da planilha estão corretos.");
      }
      throw new Error(`Erro na API do Google [${res.status}]: ${await res.text()}`);
    }

    const data = await res.json();

    return new Response(
      JSON.stringify({ success: true, cellValue: data.values?.[0]?.[0] ?? "(vazio)" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Test sheets error:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
