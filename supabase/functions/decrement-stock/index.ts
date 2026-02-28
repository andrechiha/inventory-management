// @ts-nocheck — this file runs on Supabase's Deno runtime, not Node.js
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Missing authorization" }, 401);
    }

    // Verify the user is authenticated
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL"),
      Deno.env.get("SUPABASE_ANON_KEY"),
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    // Service-role client to bypass RLS for stock updates
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL"),
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    );

    const { items } = await req.json();
    // items: [{ item_id: string, quantity: number }]

    if (!Array.isArray(items) || items.length === 0) {
      return jsonResponse({ error: "No items provided" }, 400);
    }

    for (const entry of items) {
      const { data: current } = await supabase
        .from("inventory_items")
        .select("quantity")
        .eq("id", entry.item_id)
        .single();

      if (current) {
        const newQty = Math.max(0, current.quantity - entry.quantity);
        await supabase
          .from("inventory_items")
          .update({ quantity: newQty })
          .eq("id", entry.item_id);
      }
    }

    return jsonResponse({ success: true });
  } catch (err) {
    console.error("decrement-stock error:", err);
    return jsonResponse({ error: String(err) }, 500);
  }
});

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
