export type { User, Session } from '@supabase/supabase-js';

export type Role = 'owner' | 'staff' | 'client' | 'unknown';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  created_at?: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  description: string;
  category: string;
  quantity: number;
  price: number;
  minimum_stock_threshold: number;
}

export type OrderStatus = 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';

export interface Order {
  id: string;
  client_id: string;
  status: OrderStatus;
  total_amount: number;
  shipping_address: string;
  created_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  item_id: string;
  quantity: number;
  unit_price: number;
  created_at: string;
}

export interface OrderItemWithName extends OrderItem {
  item_name: string;
}

export interface OrderWithItems extends Order {
  items: OrderItemWithName[];
  client_name?: string;
  client_email?: string;
}

export interface CartItem {
  item: InventoryItem;
  quantity: number;
}
