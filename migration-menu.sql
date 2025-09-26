-- Migration script to add menu functionality to existing database
-- Run this script in your Supabase SQL editor

-- Add menu items table if it doesn't exist
CREATE TABLE IF NOT EXISTS menu_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    price DECIMAL(10,2) NOT NULL CHECK (price > 0),
    category VARCHAR(50) NOT NULL,
    image_url TEXT,
    is_vegetarian BOOLEAN DEFAULT FALSE,
    is_spicy BOOLEAN DEFAULT FALSE,
    prep_time_minutes INTEGER DEFAULT 15 CHECK (prep_time_minutes > 0),
    allergens TEXT[] DEFAULT '{}',
    is_available BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert sample menu items (only if they don't exist)
INSERT INTO menu_items (name, description, price, category, is_vegetarian, is_spicy, prep_time_minutes, allergens, sort_order) 
SELECT * FROM (VALUES
-- Voorgerechten
('Hummus met Pita', 'Cremige hummus met verse pita brood en olijfolie', 8.50, 'Voorgerechten', TRUE, FALSE, 10, ARRAY['gluten', 'sesam'], 1),
('Falafel Mix', 'Krokante falafel balletjes met tahini saus', 9.50, 'Voorgerechten', TRUE, FALSE, 15, ARRAY['gluten', 'sesam'], 2),
('Baba Ganoush', 'Geroosterde aubergine dip met kruiden', 7.50, 'Voorgerechten', TRUE, FALSE, 12, ARRAY['sesam'], 3),
('Gemengde Salade', 'Verse groenten met feta en olijfolie dressing', 6.50, 'Voorgerechten', TRUE, FALSE, 8, ARRAY['melk'], 4),

-- Hoofdgerechten
('Lams Kebab', 'Malse lamsreepjes met rijst en groenten', 18.50, 'Hoofdgerechten', FALSE, FALSE, 25, ARRAY[]::text[], 1),
('Kip Shawarma', 'Gekruide kip met hummus en verse groenten', 16.50, 'Hoofdgerechten', FALSE, FALSE, 20, ARRAY['gluten', 'sesam'], 2),
('Vegetarische Moussaka', 'Lagen van aubergine, courgette en kaas', 15.50, 'Hoofdgerechten', TRUE, FALSE, 30, ARRAY['melk', 'eieren'], 3),
('Zalm met Couscous', 'Gegrilde zalm met kruidige couscous', 19.50, 'Hoofdgerechten', FALSE, FALSE, 22, ARRAY['vis'], 4),
('Lentil Curry', 'Pittige linzen curry met basmati rijst', 14.50, 'Hoofdgerechten', TRUE, TRUE, 18, ARRAY[]::text[], 5),

-- Desserts
('Baklava', 'Zoete noten pastei met honing', 6.50, 'Desserts', TRUE, FALSE, 5, ARRAY['gluten', 'noten'], 1),
('Tiramisu', 'Klassieke Italiaanse dessert', 7.50, 'Desserts', TRUE, FALSE, 8, ARRAY['melk', 'eieren', 'gluten'], 2),
('Fruit Salade', 'Verse seizoensfruit met munt', 5.50, 'Desserts', TRUE, FALSE, 5, ARRAY[]::text[], 3),
('Chocolate Mousse', 'Romige chocolade mousse', 6.50, 'Desserts', TRUE, FALSE, 6, ARRAY['melk', 'eieren'], 4),

-- Dranken
('Verse Muntthee', 'Warme muntthee met honing', 3.50, 'Dranken', TRUE, FALSE, 3, ARRAY[]::text[], 1),
('Turkse Koffie', 'Traditionele Turkse koffie', 4.50, 'Dranken', TRUE, FALSE, 5, ARRAY[]::text[], 2),
('Verse Sinaasappelsap', 'Vers geperst sinaasappelsap', 4.00, 'Dranken', TRUE, FALSE, 2, ARRAY[]::text[], 3),
('Rode Wijn (Huis)', 'Huiswijn per glas', 6.50, 'Dranken', TRUE, FALSE, 1, ARRAY['sulfieten'], 4),
('Bier (Lokaal)', 'Lokaal gebrouwen bier', 4.50, 'Dranken', TRUE, FALSE, 1, ARRAY['gluten'], 5),

-- Specials
('Chef Special', 'Dagelijks wisselend gerecht van de chef', 22.50, 'Specials', FALSE, FALSE, 35, ARRAY[]::text[], 1),
('Vegetarische Platter', 'Grote platter met diverse vegetarische gerechten', 17.50, 'Specials', TRUE, FALSE, 20, ARRAY['gluten', 'sesam', 'melk'], 2)
) AS new_items(name, description, price, category, is_vegetarian, is_spicy, prep_time_minutes, allergens, sort_order)
WHERE NOT EXISTS (
    SELECT 1 FROM menu_items 
    WHERE menu_items.name = new_items.name 
    AND menu_items.category = new_items.category
);

-- Create indexes for better performance if they don't exist
CREATE INDEX IF NOT EXISTS idx_menu_items_category ON menu_items(category);
CREATE INDEX IF NOT EXISTS idx_menu_items_available ON menu_items(is_available);
CREATE INDEX IF NOT EXISTS idx_menu_items_sort_order ON menu_items(sort_order);

-- Add updated_at trigger for menu_items if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_menu_items_updated_at') THEN
        CREATE TRIGGER update_menu_items_updated_at
            BEFORE UPDATE ON menu_items
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;
