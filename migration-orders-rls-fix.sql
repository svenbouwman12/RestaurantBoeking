-- Fix RLS policies for orders table
-- This script updates the RLS policies to allow public access

-- Drop existing policies
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON orders;
DROP POLICY IF EXISTS "Allow public read access" ON orders;

-- Create new policies that allow public access
CREATE POLICY "Allow public access to orders" ON orders
  FOR ALL USING (true);

-- Grant necessary permissions
GRANT ALL ON orders TO anon, authenticated;
