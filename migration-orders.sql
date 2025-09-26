-- Migration script to add orders table for phone orders
-- This script safely adds the orders table without affecting existing data

-- Create orders table if it doesn't exist
CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reservation_id UUID REFERENCES reservations(id) ON DELETE CASCADE,
  table_id UUID REFERENCES tables(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'preparing', 'ready', 'served', 'cancelled')),
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on reservation_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_orders_reservation_id ON orders(reservation_id);

-- Create index on table_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_orders_table_id ON orders(table_id);

-- Create index on status for filtering
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);

-- Enable Row Level Security
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for orders
-- Allow all operations for authenticated users (restaurant staff)
CREATE POLICY "Allow all operations for authenticated users" ON orders
  FOR ALL USING (auth.role() = 'authenticated');

-- Allow public read access (for customer viewing their orders)
CREATE POLICY "Allow public read access" ON orders
  FOR SELECT USING (true);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add some sample orders for testing (only if no orders exist)
INSERT INTO orders (reservation_id, table_id, status, total_amount, items, notes)
SELECT 
  r.id,
  r.table_id,
  'confirmed',
  45.50,
  '[
    {
      "menu_item_id": "1",
      "quantity": 2,
      "notes": "Medium rare",
      "price": 18.50
    },
    {
      "menu_item_id": "2", 
      "quantity": 1,
      "notes": "Extra cheese",
      "price": 8.50
    }
  ]'::jsonb,
  'Telefoon bestelling - klant vraagt om rekening'
FROM reservations r
WHERE r.status = 'confirmed'
  AND r.date = CURRENT_DATE
  AND NOT EXISTS (SELECT 1 FROM orders WHERE reservation_id = r.id)
LIMIT 2;

-- Add another sample order
INSERT INTO orders (reservation_id, table_id, status, total_amount, items, notes)
SELECT 
  r.id,
  r.table_id,
  'preparing',
  32.00,
  '[
    {
      "menu_item_id": "3",
      "quantity": 1,
      "notes": "No onions",
      "price": 15.00
    },
    {
      "menu_item_id": "4",
      "quantity": 2,
      "notes": "Extra spicy",
      "price": 8.50
    }
  ]'::jsonb,
  'Telefoon bestelling - bereiden'
FROM reservations r
WHERE r.status = 'confirmed'
  AND r.date = CURRENT_DATE
  AND NOT EXISTS (SELECT 1 FROM orders WHERE reservation_id = r.id)
LIMIT 1;
