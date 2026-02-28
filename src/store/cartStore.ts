import { create } from 'zustand';
import type { InventoryItem, CartItem } from '@/types';

interface CartState {
  items: CartItem[];
  shippingAddress: string;

  addItem: (item: InventoryItem, qty?: number) => void;
  removeItem: (itemId: string) => void;
  updateQty: (itemId: string, qty: number) => void;
  setShippingAddress: (address: string) => void;
  clearCart: () => void;
  totalAmount: () => number;
  totalCount: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  shippingAddress: '',

  addItem: (item, qty = 1) => {
    const existing = get().items.find((c) => c.item.id === item.id);
    if (existing) {
      set({
        items: get().items.map((c) =>
          c.item.id === item.id ? { ...c, quantity: c.quantity + qty } : c,
        ),
      });
    } else {
      set({ items: [...get().items, { item, quantity: qty }] });
    }
  },

  removeItem: (itemId) => {
    set({ items: get().items.filter((c) => c.item.id !== itemId) });
  },

  updateQty: (itemId, qty) => {
    if (qty <= 0) {
      get().removeItem(itemId);
      return;
    }
    set({
      items: get().items.map((c) =>
        c.item.id === itemId ? { ...c, quantity: qty } : c,
      ),
    });
  },

  setShippingAddress: (address) => set({ shippingAddress: address }),

  clearCart: () => set({ items: [], shippingAddress: '' }),

  totalAmount: () =>
    get().items.reduce((sum, c) => sum + c.item.price * c.quantity, 0),

  totalCount: () =>
    get().items.reduce((sum, c) => sum + c.quantity, 0),
}));
