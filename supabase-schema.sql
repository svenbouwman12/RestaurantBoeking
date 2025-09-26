-- Table reservation system database schema for Supabase

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tables table
CREATE TABLE tables (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    seats INTEGER NOT NULL CHECK (seats > 0),
    position_x INTEGER DEFAULT 0,
    position_y INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Reservations table
CREATE TABLE reservations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    table_id UUID REFERENCES tables(id) ON DELETE CASCADE,
    customer_name VARCHAR(100) NOT NULL,
    customer_email VARCHAR(255),
    customer_phone VARCHAR(20),
    guests INTEGER NOT NULL CHECK (guests > 0),
    date DATE NOT NULL,
    time TIME NOT NULL,
    duration_hours INTEGER DEFAULT 2 CHECK (duration_hours > 0),
    buffer_minutes INTEGER DEFAULT 15 CHECK (buffer_minutes >= 0),
    status VARCHAR(20) DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'arrived', 'in_progress', 'completed', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Orders table
CREATE TABLE orders (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    reservation_id UUID REFERENCES reservations(id) ON DELETE CASCADE,
    item_name VARCHAR(100) NOT NULL,
    item_type VARCHAR(20) DEFAULT 'food' CHECK (item_type IN ('food', 'drink', 'dessert')),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    price DECIMAL(10,2) DEFAULT 0.00,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'preparing', 'ready', 'served', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_reservations_date ON reservations(date);
CREATE INDEX idx_reservations_table_id ON reservations(table_id);
CREATE INDEX idx_reservations_status ON reservations(status);
CREATE INDEX idx_orders_reservation_id ON orders(reservation_id);
CREATE INDEX idx_orders_status ON orders(status);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_tables_updated_at BEFORE UPDATE ON tables
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reservations_updated_at BEFORE UPDATE ON reservations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample tables
INSERT INTO tables (name, seats, position_x, position_y) VALUES
('Table 1', 2, 100, 100),
('Table 2', 4, 200, 100),
('Table 3', 2, 300, 100),
('Table 4', 6, 100, 200),
('Table 5', 4, 200, 200),
('Table 6', 2, 300, 200),
('Table 7', 8, 100, 300),
('Table 8', 4, 200, 300),
('Table 9', 2, 300, 300);

-- Insert sample reservations
INSERT INTO reservations (table_id, customer_name, customer_email, customer_phone, guests, date, time, status, notes) VALUES
((SELECT id FROM tables WHERE name = 'Table 1'), 'John Doe', 'john@example.com', '+1234567890', 2, CURRENT_DATE, '19:00:00', 'confirmed', 'Anniversary dinner'),
((SELECT id FROM tables WHERE name = 'Table 2'), 'Jane Smith', 'jane@example.com', '+1234567891', 4, CURRENT_DATE, '20:30:00', 'arrived', 'Birthday party'),
((SELECT id FROM tables WHERE name = 'Table 3'), 'Bob Johnson', 'bob@example.com', '+1234567892', 2, CURRENT_DATE + INTERVAL '1 day', '18:00:00', 'pending', 'Business dinner');

-- Insert sample orders
INSERT INTO orders (reservation_id, item_name, item_type, quantity, price, status) VALUES
((SELECT id FROM reservations WHERE customer_name = 'John Doe'), 'Grilled Salmon', 'food', 2, 28.00, 'served'),
((SELECT id FROM reservations WHERE customer_name = 'John Doe'), 'House Wine', 'drink', 1, 12.00, 'served'),
((SELECT id FROM reservations WHERE customer_name = 'Jane Smith'), 'Caesar Salad', 'food', 4, 15.00, 'preparing'),
((SELECT id FROM reservations WHERE customer_name = 'Jane Smith'), 'Sparkling Water', 'drink', 4, 4.00, 'served');

-- Enable Row Level Security (RLS)
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (adjust based on your security needs)
CREATE POLICY "Allow all operations on tables" ON tables FOR ALL USING (true);
CREATE POLICY "Allow all operations on reservations" ON reservations FOR ALL USING (true);
CREATE POLICY "Allow all operations on orders" ON orders FOR ALL USING (true);

-- Grant necessary permissions
GRANT ALL ON tables TO anon, authenticated;
GRANT ALL ON reservations TO anon, authenticated;
GRANT ALL ON orders TO anon, authenticated;
