const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const demoData = {
  tables: [
    { name: 'Table 1', seats: 2, position_x: 100, position_y: 100 },
    { name: 'Table 2', seats: 4, position_x: 200, position_y: 100 },
    { name: 'Table 3', seats: 2, position_x: 300, position_y: 100 },
    { name: 'Table 4', seats: 6, position_x: 100, position_y: 200 },
    { name: 'Table 5', seats: 4, position_x: 200, position_y: 200 },
    { name: 'Table 6', seats: 2, position_x: 300, position_y: 200 },
    { name: 'Table 7', seats: 8, position_x: 100, position_y: 300 },
    { name: 'Table 8', seats: 4, position_x: 200, position_y: 300 },
    { name: 'Table 9', seats: 2, position_x: 300, position_y: 300 },
  ],
  reservations: [
    {
      customer_name: 'John Doe',
      customer_email: 'john@example.com',
      customer_phone: '+1234567890',
      guests: 2,
      date: new Date().toISOString().split('T')[0],
      time: '19:00:00',
      status: 'confirmed',
      notes: 'Anniversary dinner'
    },
    {
      customer_name: 'Jane Smith',
      customer_email: 'jane@example.com',
      customer_phone: '+1234567891',
      guests: 4,
      date: new Date().toISOString().split('T')[0],
      time: '20:30:00',
      status: 'arrived',
      notes: 'Birthday party'
    },
    {
      customer_name: 'Bob Johnson',
      customer_email: 'bob@example.com',
      customer_phone: '+1234567892',
      guests: 2,
      date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      time: '18:00:00',
      status: 'pending',
      notes: 'Business dinner'
    },
    {
      customer_name: 'Alice Brown',
      customer_email: 'alice@example.com',
      customer_phone: '+1234567893',
      guests: 6,
      date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      time: '19:30:00',
      status: 'confirmed',
      notes: 'Family gathering'
    }
  ],
  orders: [
    {
      item_name: 'Grilled Salmon',
      item_type: 'food',
      quantity: 2,
      price: 28.00,
      status: 'served'
    },
    {
      item_name: 'House Wine',
      item_type: 'drink',
      quantity: 1,
      price: 12.00,
      status: 'served'
    },
    {
      item_name: 'Caesar Salad',
      item_type: 'food',
      quantity: 4,
      price: 15.00,
      status: 'preparing'
    },
    {
      item_name: 'Sparkling Water',
      item_type: 'drink',
      quantity: 4,
      price: 4.00,
      status: 'served'
    }
  ]
};

async function seedDatabase() {
  try {
    console.log('🌱 Seeding database with demo data...');

    // Clear existing data
    console.log('🧹 Clearing existing data...');
    await supabase.from('orders').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('reservations').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('tables').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // Insert tables
    console.log('📋 Inserting tables...');
    const { data: tables, error: tablesError } = await supabase
      .from('tables')
      .insert(demoData.tables)
      .select();

    if (tablesError) throw tablesError;
    console.log(`✅ Inserted ${tables.length} tables`);

    // Insert reservations
    console.log('📅 Inserting reservations...');
    const reservationsWithTableIds = demoData.reservations.map((reservation, index) => ({
      ...reservation,
      table_id: tables[index % tables.length].id
    }));

    const { data: reservations, error: reservationsError } = await supabase
      .from('reservations')
      .insert(reservationsWithTableIds)
      .select();

    if (reservationsError) throw reservationsError;
    console.log(`✅ Inserted ${reservations.length} reservations`);

    // Insert orders
    console.log('🍽️ Inserting orders...');
    const ordersWithReservationIds = demoData.orders.map((order, index) => ({
      ...order,
      reservation_id: reservations[index % reservations.length].id
    }));

    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .insert(ordersWithReservationIds)
      .select();

    if (ordersError) throw ordersError;
    console.log(`✅ Inserted ${orders.length} orders`);

    console.log('');
    console.log('🎉 Database seeded successfully!');
    console.log('');
    console.log('Demo data includes:');
    console.log(`- ${tables.length} tables with different seating capacities`);
    console.log(`- ${reservations.length} sample reservations`);
    console.log(`- ${orders.length} sample orders`);
    console.log('');
    console.log('You can now start the application and see the demo data in action!');
    console.log('Run: npm run dev');

  } catch (error) {
    console.error('❌ Error seeding database:', error.message);
    process.exit(1);
  }
}

// Check if environment variables are set
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase environment variables.');
  console.error('Please make sure .env file exists with:');
  console.error('- SUPABASE_URL');
  console.error('- SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

seedDatabase();
