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
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) {
      return jsonResponse({ error: "OPENAI_API_KEY not configured" }, 500);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Missing authorization" }, 401);
    }

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL"),
      Deno.env.get("SUPABASE_ANON_KEY"),
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL"),
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    );

    const { role } = await req.json();

    let prompt;
    let dataContext;

    if (role === "client") {
      dataContext = await buildClientContext(supabase, user.id);
      prompt = `You are a smart shopping assistant for an inventory/e-commerce store.

Based on this customer's purchase history and the full product catalog, recommend 3-5 items. Rules:
- If they bought something before and it's back in stock, DEFINITELY recommend buying it again (they clearly like it).
- Also recommend items from the same category or that complement their past purchases.
- If something is out of stock, skip it.
- If they have no purchase history, recommend popular or best-value items.
- For each recommendation, explain briefly WHY.

${dataContext}

Respond ONLY with a valid JSON array. Each element:
- "item_name": string (exact name from catalog)
- "item_id": string (the id from catalog)
- "reason": string (1-2 sentence explanation)
- "price": number`;
    } else if (role === "owner") {
      dataContext = await buildOwnerContext(supabase);
      prompt = `You are a business intelligence assistant for an inventory store owner.

Based on the sales data and current stock levels, provide 5-8 recommendations split into TWO categories:

RESTOCK existing items:
- Items that sold well and need restocking (especially OUT OF STOCK or LOW STOCK)
- Items running low relative to demand

NEW PRODUCT IDEAS (this is very important):
- Based on what categories and products sell best, suggest NEW products the owner does NOT currently have in stock that would likely sell well.
- For example: if airpods sell a lot, suggest adding headphones or earbuds. If monitors sell well, suggest monitor stands or screen protectors. Think about related/complementary products.
- Be specific with product names, not just categories.

${dataContext}

Respond ONLY with a valid JSON array. Each element:
- "item_name": string (product name - either existing item OR new product idea)
- "reason": string (2-3 sentence business rationale with numbers if applicable)
- "priority": "high" | "medium" | "low"
- "current_stock": number | null (null for new product ideas)
- "type": "restock" | "new_product"`;
    } else {
      return jsonResponse({ error: "Invalid role" }, 400);
    }

    const aiResponse = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openaiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.7,
          max_tokens: 800,
        }),
      }
    );

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("OpenAI error:", errText);
      return jsonResponse({ error: "AI service error: " + errText }, 502);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content ?? "[]";

    let recommendations;
    try {
      const cleaned = content.replace(/```json\n?/g, "").replace(/```/g, "").trim();
      recommendations = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse AI response:", content);
      recommendations = [];
    }

    return jsonResponse({ recommendations, role });
  } catch (err) {
    console.error("Edge function error:", err);
    return jsonResponse({ error: String(err) }, 500);
  }
});

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function buildClientContext(supabase, userId) {
  // Run all queries in parallel for speed
  const [ordersRes, catalogRes] = await Promise.all([
    supabase.from("orders").select("id").eq("client_id", userId),
    supabase.from("inventory_items")
      .select("id, name, description, category, price, quantity")
      .order("name"),
  ]);

  const orders = ordersRes.data ?? [];
  const catalog = catalogRes.data ?? [];

  let purchaseHistory = "No previous purchases.";

  if (orders.length > 0) {
    const orderIds = orders.map((o) => o.id);

    const { data: orderItems } = await supabase
      .from("order_items")
      .select("item_id, quantity, unit_price")
      .in("order_id", orderIds);

    if (orderItems && orderItems.length > 0) {
      const itemMap = new Map(catalog.map((i) => [i.id, i]));

      const summary = orderItems.map((oi) => {
        const item = itemMap.get(oi.item_id);
        return `- ${item?.name ?? "Unknown"} (${item?.category ?? "?"}) x${oi.quantity} @ $${oi.unit_price}`;
      });
      purchaseHistory = `Customer's purchase history:\n${summary.join("\n")}`;
    }
  }

  const catalogStr = catalog
    .map((i) => {
      const stock = i.quantity <= 0 ? "OUT OF STOCK" : `${i.quantity} in stock`;
      return `- [${i.id}] ${i.name} (${i.category}) - $${i.price} - "${i.description}" - ${stock}`;
    })
    .join("\n");

  return `${purchaseHistory}\n\nFull catalog (only recommend in-stock items):\n${catalogStr}`;
}

async function buildOwnerContext(supabase) {
  // Run all queries in parallel for speed
  const [inventoryRes, ordersRes] = await Promise.all([
    supabase.from("inventory_items")
      .select("id, name, category, price, quantity, minimum_stock_threshold")
      .order("name"),
    supabase.from("orders").select("id, created_at, total_amount, status"),
  ]);

  const inventory = inventoryRes.data ?? [];
  const allOrders = ordersRes.data ?? [];

  let salesSummary = "No sales data yet.";

  if (allOrders.length > 0) {
    const orderIds = allOrders.map((o) => o.id);
    const { data: allOrderItems } = await supabase
      .from("order_items")
      .select("item_id, quantity, unit_price")
      .in("order_id", orderIds);

    if (allOrderItems && allOrderItems.length > 0) {
      const salesByItem = new Map();
      for (const oi of allOrderItems) {
        const prev = salesByItem.get(oi.item_id) ?? { qty: 0, revenue: 0 };
        salesByItem.set(oi.item_id, {
          qty: prev.qty + oi.quantity,
          revenue: prev.revenue + oi.quantity * oi.unit_price,
        });
      }

      const invMap = new Map(inventory.map((i) => [i.id, i]));

      const lines = [...salesByItem.entries()]
        .sort((a, b) => b[1].qty - a[1].qty)
        .map(([itemId, s]) => {
          const item = invMap.get(itemId);
          return `- ${item?.name ?? "Unknown"} (${item?.category ?? "?"}): ${s.qty} units sold, $${s.revenue.toFixed(2)} revenue`;
        });

      salesSummary = `Sales breakdown (by units sold):\n${lines.join("\n")}\n\nTotal orders: ${allOrders.length}`;
    }
  }

  const stockLines = inventory.map((i) => {
    const status =
      i.quantity <= 0
        ? "OUT OF STOCK"
        : i.quantity <= i.minimum_stock_threshold
        ? "LOW STOCK"
        : "OK";
    return `- ${i.name} (${i.category}): ${i.quantity} in stock (min: ${i.minimum_stock_threshold}) [${status}] @ $${i.price}`;
  });

  return `${salesSummary}\n\nCurrent inventory:\n${stockLines.join("\n")}`;
}
