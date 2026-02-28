import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { InventoryItem } from '@/types';

interface InventoryState {
  items: InventoryItem[];
  loading: boolean;
  error: string | null;

  fetch: () => Promise<void>;
  add: (item: Omit<InventoryItem, 'id'>) => Promise<boolean>;
  update: (id: string, fields: Partial<Omit<InventoryItem, 'id'>>) => Promise<boolean>;
  remove: (id: string) => Promise<boolean>;
}

export const useInventoryStore = create<InventoryState>((set, get) => ({
  items: [],
  loading: false,
  error: null,

  fetch: async () => {
    set({ loading: true, error: null });
    const { data, error } = await supabase
      .from('inventory_items')
      .select('*')
      .order('name');

    if (error) {
      set({ loading: false, error: error.message });
      return;
    }

    set({ items: (data ?? []) as InventoryItem[], loading: false });
  },

  add: async (item) => {
    set({ error: null });
    const { error } = await supabase.from('inventory_items').insert(item);
    if (error) {
      set({ error: error.message });
      return false;
    }
    await get().fetch();
    return true;
  },

  update: async (id, fields) => {
    set({ error: null });
    const { error } = await supabase
      .from('inventory_items')
      .update(fields)
      .eq('id', id);

    if (error) {
      set({ error: error.message });
      return false;
    }
    await get().fetch();
    return true;
  },

  remove: async (id) => {
    set({ error: null });
    const { error } = await supabase
      .from('inventory_items')
      .delete()
      .eq('id', id);

    if (error) {
      set({ error: error.message });
      return false;
    }
    set({ items: get().items.filter((i) => i.id !== id) });
    return true;
  },
}));
