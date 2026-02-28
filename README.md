# Inventory Management System

A full-stack inventory and e-commerce platform with role-based access control and AI-powered recommendations, built with React, TypeScript, and Supabase.

## What It Does

The app serves three user roles — **Owner**, **Staff**, and **Client** — each with tailored functionality:

- **Owners** manage inventory (add, edit, delete products), view all orders, update order statuses, track revenue and transactions, and access a dashboard with analytics like total inventory value, low-stock alerts, and order stats.
- **Staff** can view inventory, manage orders, and access the dashboard.
- **Clients** browse a product catalog, add items to a cart, place orders with a shipping address, track their order history, and receive personalized product recommendations.

Core features include real-time stock management (stock is automatically decremented on order placement), search and filtering across all list views, and a responsive sidebar-based layout.

## How AI Is Used

The app integrates **OpenAI's GPT-4o-mini** model through Supabase Edge Functions to power two recommendation features:

- **Client recommendations** — The system analyzes a client's purchase history and suggests products they might be interested in, along with reasoning for each suggestion.
- **Owner recommendations** — The system reviews sales data and current inventory levels to suggest restocking priorities and potential new product ideas to help owners make better business decisions.

Recommendations are generated on-demand via the `recommend-items` Edge Function, which builds a structured prompt from the user's data, sends it to OpenAI, and returns the results as JSON.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, TypeScript, Vite |
| State Management | Zustand |
| Routing | React Router DOM |
| Backend & Auth | Supabase (PostgreSQL, Auth, Edge Functions) |
| AI | OpenAI GPT-4o-mini |

## How to Use

1. **Sign up or log in** — Create an account with your email and password. New users are assigned the **Client** role by default.

2. **As a Client:**
   - Browse available products in the **Shop** page.
   - Use the search bar to find specific items.
   - Add products to your **Cart** and adjust quantities.
   - Enter a shipping address and place your order at checkout.
   - Track your orders and their status on the **My Orders** page.
   - Visit the **Recommendations** page to get AI-powered product suggestions based on your purchase history.

3. **As an Owner:**
   - View the **Dashboard** for a quick overview of inventory stats, order counts, and revenue.
   - Go to **Manage Inventory** to add new products, edit details (name, category, price, quantity), or delete items.
   - Use the **Orders** page to view all customer orders and update their status (pending, confirmed, shipped, delivered, or cancelled).
   - Check the **Transactions** page for a financial overview of revenue.
   - Visit **Recommendations** to get AI-driven restocking suggestions and new product ideas based on sales data.

4. **As Staff:**
   - Access the **Dashboard** and **Orders** pages to help manage day-to-day operations.
   - View inventory details on the **Inventory** page.

## Getting Started

1. Clone the repo and install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env` file with your Supabase and OpenAI credentials:
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```
