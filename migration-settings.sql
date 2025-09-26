-- Migration script to add restaurant settings table
-- Run this instead of the full schema if tables already exist

-- Create restaurant settings table
CREATE TABLE IF NOT EXISTS restaurant_settings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    setting_key VARCHAR(50) UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    setting_type VARCHAR(20) DEFAULT 'string' CHECK (setting_type IN ('string', 'number', 'boolean', 'json')),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_restaurant_settings_key ON restaurant_settings(setting_key);

-- Insert default settings (only if they don't exist)
INSERT INTO restaurant_settings (setting_key, setting_value, setting_type, description) VALUES
('restaurant_name', 'Zaytun Restaurant', 'string', 'Naam van het restaurant'),
('opening_hours_monday', '{"open": "17:00", "close": "23:00", "closed": false}', 'json', 'Openingstijden maandag'),
('opening_hours_tuesday', '{"open": "17:00", "close": "23:00", "closed": false}', 'json', 'Openingstijden dinsdag'),
('opening_hours_wednesday', '{"open": "17:00", "close": "23:00", "closed": false}', 'json', 'Openingstijden woensdag'),
('opening_hours_thursday', '{"open": "17:00", "close": "23:00", "closed": false}', 'json', 'Openingstijden donderdag'),
('opening_hours_friday', '{"open": "17:00", "close": "23:00", "closed": false}', 'json', 'Openingstijden vrijdag'),
('opening_hours_saturday', '{"open": "17:00", "close": "23:00", "closed": false}', 'json', 'Openingstijden zaterdag'),
('opening_hours_sunday', '{"open": "17:00", "close": "23:00", "closed": true}', 'json', 'Openingstijden zondag'),
('default_reservation_duration', '2', 'number', 'Standaard reserveringsduur in uren'),
('default_buffer_minutes', '15', 'number', 'Standaard bufferperiode in minuten'),
('max_advance_booking_days', '30', 'number', 'Maximaal aantal dagen vooruit reserveren'),
('min_advance_booking_hours', '2', 'number', 'Minimaal aantal uren vooruit reserveren')
ON CONFLICT (setting_key) DO NOTHING;

-- Add new columns to existing reservations table if they don't exist
DO $$ 
BEGIN
    -- Add duration_hours column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'reservations' AND column_name = 'duration_hours') THEN
        ALTER TABLE reservations ADD COLUMN duration_hours INTEGER DEFAULT 2 CHECK (duration_hours > 0);
    END IF;
    
    -- Add buffer_minutes column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'reservations' AND column_name = 'buffer_minutes') THEN
        ALTER TABLE reservations ADD COLUMN buffer_minutes INTEGER DEFAULT 15 CHECK (buffer_minutes >= 0);
    END IF;
END $$;
