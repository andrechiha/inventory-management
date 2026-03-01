import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { useInventoryStore } from '@/store/inventoryStore';
import type { CartItem, OrderWithItems, OrderStatus } from '@/types';

interface OrderState {
  orders: OrderWithItems[];
  loading: boolean;
  error: string | null;

  placeOrder: (items: CartItem[], shippingAddress: string, clientId: string) => Promise<boolean>;
  fetchMyOrders: (clientId: string) => Promise<void>;
  fetchAllOrders: () => Promise<void>;
  updateStatus: (orderId: string, status: OrderStatus) => Promise<boolean>;
}

export const useOrderStore = create<OrderState>((set, get) => ({
  orders: [],
  loading: false,
  error: null,

  placeOrder: async (items, shippingAddress, clientId) => {
    set({ error: null });

    const totalAmount = items.reduce((sum, c) => sum + c.item.price * c.quantity, 0);

    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .insert({
        client_id: clientId,
        status: 'pending',
        total_amount: totalAmount,
        shipping_address: shippingAddress,
      })
      .select('id')
      .single();

    if (orderErr || !order) {
      set({ error: orderErr?.message ?? 'Failed to create order' });
      return false;
    }

    const orderItems = items.map((c) => ({
      order_id: order.id,
      item_id: c.item.id,
      quantity: c.quantity,
      unit_price: c.item.price,
    }));

    const { error: itemsErr } = await supabase
      .from('order_items')
      .insert(orderItems);

    if (itemsErr) {
      set({ error: itemsErr.message });
      return false;
    }

    // Refresh inventory so the shop UI shows updated stock
    useInventoryStore.getState().fetch();

    return true;
  },

  fetchMyOrders: async (clientId) => {
    set({ loading: true, error: null });

    const { data: orders, error: ordersErr } = await supabase
      .from('orders')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });

    if (ordersErr) {
      set({ loading: false, error: ordersErr.message });
      return;
    }

    const enriched = await enrichOrders(orders ?? []);
    set({ orders: enriched, loading: false });
  },

  fetchAllOrders: async () => {
    set({ loading: true, error: null });

    const { data: orders, error: ordersErr } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (ordersErr) {
      set({ loading: false, error: ordersErr.message });
      return;
    }

    const enriched = await enrichOrders(orders ?? []);

    const clientIds = [...new Set(enriched.map((o) => o.client_id))];
    if (clientIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', clientIds);

      if (profiles) {
        const profileMap = new Map(profiles.map((p) => [p.id, p]));
        for (const order of enriched) {
          const p = profileMap.get(order.client_id);
          if (p) {
            order.client_name = (p.full_name && p.full_name.trim()) ? p.full_name : p.email;
            order.client_email = p.email;
          }
        }
      }
    }

    set({ orders: enriched, loading: false });
  },

  updateStatus: async (orderId, status) => {
    set({ error: null });
    const { error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', orderId);

    if (error) {
      set({ error: error.message });
      return false;
    }

    set({
      orders: get().orders.map((o) =>
        o.id === orderId ? { ...o, status } : o,
      ),
    });
    return true;
  },
}));

async function enrichOrders(orders: Record<string, unknown>[]): Promise<OrderWithItems[]> {
  if (orders.length === 0) return [];

  const orderIds = orders.map((o) => o.id as string);

  const { data: allItems } = await supabase
    .from('order_items')
    .select('*')
    .in('order_id', orderIds);

  const itemIds = [...new Set((allItems ?? []).map((i) => i.item_id as string))];
  let itemNameMap = new Map<string, string>();

  if (itemIds.length > 0) {
    const { data: inventoryItems } = await supabase
      .from('inventory_items')
      .select('id, name')
      .in('id', itemIds);

    if (inventoryItems) {
      itemNameMap = new Map(inventoryItems.map((i) => [i.id, i.name]));
    }
  }

  return orders.map((o) => {
    const items = (allItems ?? [])
      .filter((i) => i.order_id === o.id)
      .map((i) => ({
        ...i,
        item_name: itemNameMap.get(i.item_id as string) ?? 'Unknown item',
      }));

    return { ...o, items } as OrderWithItems;
  });
}
