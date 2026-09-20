const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const N8N_URL = "https://eyggo70s.rpcld.net/webhook/ai-tutor";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    console.log("[sabi-proxy] Forwarding to n8n:", N8N_URL, "action:", body.action);

    const n8nRes = await fetch(N8N_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const n8nContentType = n8nRes.headers.get("content-type") || "";
    const n8nStatus = n8nRes.status;
    console.log("[sabi-proxy] n8n responded:", n8nStatus, n8nContentType);

    if (!n8nRes.ok) {
      let errBody = "";
      try { errBody = await n8nRes.text(); } catch { /* ignore */ }
      console.error("[sabi-proxy] n8n error:", n8nStatus, errBody.slice(0, 500));
      return new Response(JSON.stringify({
        error: `n8n returned status ${n8nStatus}`,
        body: errBody.slice(0, 1000),
      }), {
        status: n8nStatus,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Binary audio/image — read as base64 and pass through as JSON
    if (n8nContentType.startsWith("audio/") || n8nContentType.startsWith("image/")) {
      const buf = await n8nRes.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let binary = "";
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const b64 = btoa(binary);
      const dataUrl = n8nContentType.startsWith("audio/")
        ? `data:${n8nContentType};base64,${b64}`
        : `data:${n8nContentType};base64,${b64}`;
      return new Response(JSON.stringify({
        binary: true,
        content_type: n8nContentType,
        data_url: dataUrl,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Text/JSON — read and pass through
    const text = await n8nRes.text();
    if (!text || !text.trim()) {
      return new Response(JSON.stringify({ error: "n8n returned an empty response" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If it's JSON, parse and forward; otherwise send as plain text
    const looksLikeJson = text.trim().startsWith("{") || text.trim().startsWith("[");
    if (n8nContentType.includes("application/json") || looksLikeJson) {
      try {
        const parsed = JSON.parse(text);
        return new Response(JSON.stringify(parsed), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch {
        // Not valid JSON — send as plain text
      }
    }

    return new Response(JSON.stringify({ text }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[sabi-proxy] Error:", msg);
    return new Response(JSON.stringify({
      error: `Proxy error: ${msg}`,
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
