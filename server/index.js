const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');
const twilio = require('twilio');
const nodemailer = require('nodemailer');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Initialize Twilio client
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Initialize email transporter
const emailTransporter = nodemailer.createTransporter({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Helper function to send SMS
async function sendSMS(phoneNumber, message) {
  try {
    if (!process.env.TWILIO_ACCOUNT_SID) {
      console.log('SMS not configured, skipping:', message);
      return;
    }
    
    await twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phoneNumber
    });
    console.log('SMS sent successfully');
  } catch (error) {
    console.error('Error sending SMS:', error);
  }
}

// Helper function to send email
async function sendEmail(email, subject, message) {
  try {
    if (!process.env.EMAIL_USER) {
      console.log('Email not configured, skipping:', message);
      return;
    }
    
    await emailTransporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: subject,
      text: message
    });
    console.log('Email sent successfully');
  } catch (error) {
    console.error('Error sending email:', error);
  }
}

// Routes

// Get all tables
app.get('/api/tables', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('tables')
      .select('*')
      .order('name');
    
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all reservations
app.get('/api/reservations', async (req, res) => {
  try {
    const { date, status } = req.query;
    let query = supabase
      .from('reservations')
      .select(`
        *,
        tables (
          id,
          name,
          seats
        )
      `)
      .order('date', { ascending: true })
      .order('time', { ascending: true });
    
    if (date) {
      query = query.eq('date', date);
    }
    
    if (status) {
      query = query.eq('status', status);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get reservations for a specific table
app.get('/api/tables/:tableId/reservations', async (req, res) => {
  try {
    const { tableId } = req.params;
    const { date } = req.query;
    
    let query = supabase
      .from('reservations')
      .select('*')
      .eq('table_id', tableId)
      .order('date', { ascending: true })
      .order('time', { ascending: true });
    
    if (date) {
      query = query.eq('date', date);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Configuration for reservation duration and buffer
const RESERVATION_DURATION_HOURS = 2; // Standard reservation duration
const BUFFER_MINUTES = 15; // Buffer time before and after reservation

// Helper function to check time overlap
function hasTimeOverlap(startTime1, endTime1, startTime2, endTime2) {
  return startTime1 < endTime2 && startTime2 < endTime1;
}

// Helper function to add minutes to time string
function addMinutesToTime(timeStr, minutes) {
  const [hours, mins] = timeStr.split(':').map(Number);
  const totalMinutes = hours * 60 + mins + minutes;
  const newHours = Math.floor(totalMinutes / 60);
  const newMins = totalMinutes % 60;
  return `${newHours.toString().padStart(2, '0')}:${newMins.toString().padStart(2, '0')}`;
}

// Create a new reservation
app.post('/api/reservations', async (req, res) => {
  try {
    const { table_id, customer_name, customer_email, customer_phone, guests, date, time, notes } = req.body;
    
    // Validate required fields
    if (!table_id || !customer_name || !guests || !date || !time) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Calculate reservation time slots with buffer
    const bufferStartTime = addMinutesToTime(time, -BUFFER_MINUTES);
    const reservationEndTime = addMinutesToTime(time, RESERVATION_DURATION_HOURS * 60);
    const bufferEndTime = addMinutesToTime(reservationEndTime, BUFFER_MINUTES);
    
    // Check if table is available at the requested time (with overlap check)
    const { data: existingReservations, error: checkError } = await supabase
      .from('reservations')
      .select('time, status, duration_hours, buffer_minutes')
      .eq('table_id', table_id)
      .eq('date', date)
      .in('status', ['confirmed', 'arrived', 'in_progress']);
    
    if (checkError) throw checkError;
    
    // Check for time overlaps
    for (const existingReservation of existingReservations) {
      const existingTime = existingReservation.time;
      const existingDuration = existingReservation.duration_hours || RESERVATION_DURATION_HOURS;
      const existingBuffer = existingReservation.buffer_minutes || BUFFER_MINUTES;
      
      const existingBufferStart = addMinutesToTime(existingTime, -existingBuffer);
      const existingReservationEnd = addMinutesToTime(existingTime, existingDuration * 60);
      const existingBufferEnd = addMinutesToTime(existingReservationEnd, existingBuffer);
      
      if (hasTimeOverlap(bufferStartTime, bufferEndTime, existingBufferStart, existingBufferEnd)) {
        return res.status(400).json({ 
          error: `Tafel is niet beschikbaar van ${bufferStartTime} tot ${bufferEndTime}. Er is al een reservering van ${existingTime} tot ${existingReservationEnd}.` 
        });
      }
    }
    
    // Create reservation
    const { data, error } = await supabase
      .from('reservations')
      .insert([{
        table_id,
        customer_name,
        customer_email,
        customer_phone,
        guests,
        date,
        time,
        duration_hours: RESERVATION_DURATION_HOURS,
        buffer_minutes: BUFFER_MINUTES,
        notes,
        status: 'confirmed'
      }])
      .select(`
        *,
        tables (
          id,
          name,
          seats
        )
      `)
      .single();
    
    if (error) throw error;
    
    // Send confirmation notifications
    if (customer_phone) {
      await sendSMS(customer_phone, `Reservation confirmed for ${guests} guests at ${time} on ${date}. Thank you!`);
    }
    
    if (customer_email) {
      await sendEmail(
        customer_email,
        'Reservation Confirmation',
        `Your reservation has been confirmed for ${guests} guests at ${time} on ${date}. We look forward to serving you!`
      );
    }
    
    res.status(201).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update reservation status
app.patch('/api/reservations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, customer_name, customer_email, customer_phone, guests, date, time, notes } = req.body;
    
    const updateData = {};
    if (status !== undefined) updateData.status = status;
    if (customer_name !== undefined) updateData.customer_name = customer_name;
    if (customer_email !== undefined) updateData.customer_email = customer_email;
    if (customer_phone !== undefined) updateData.customer_phone = customer_phone;
    if (guests !== undefined) updateData.guests = guests;
    if (date !== undefined) updateData.date = date;
    if (time !== undefined) updateData.time = time;
    if (notes !== undefined) updateData.notes = notes;
    
    const { data, error } = await supabase
      .from('reservations')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        tables (
          id,
          name,
          seats
        )
      `)
      .single();
    
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete reservation
app.delete('/api/reservations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { error } = await supabase
      .from('reservations')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    res.json({ message: 'Reservation deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get orders for a reservation
app.get('/api/reservations/:reservationId/orders', async (req, res) => {
  try {
    const { reservationId } = req.params;
    
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('reservation_id', reservationId)
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create a new order
app.post('/api/orders', async (req, res) => {
  try {
    const { reservation_id, item_name, item_type, quantity, price } = req.body;
    
    if (!reservation_id || !item_name || !quantity) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const { data, error } = await supabase
      .from('orders')
      .insert([{
        reservation_id,
        item_name,
        item_type: item_type || 'food',
        quantity,
        price: price || 0.00,
        status: 'confirmed'
      }])
      .select()
      .single();
    
    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update order status
app.patch('/api/orders/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, quantity, price } = req.body;
    
    const updateData = {};
    if (status !== undefined) updateData.status = status;
    if (quantity !== undefined) updateData.quantity = quantity;
    if (price !== undefined) updateData.price = price;
    
    const { data, error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete order
app.delete('/api/orders/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { error } = await supabase
      .from('orders')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    res.json({ message: 'Order deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get available tables for a specific date and time
app.get('/api/tables/available', async (req, res) => {
  try {
    const { date, time } = req.query;
    
    if (!date || !time) {
      return res.status(400).json({ error: 'Date and time are required' });
    }
    
    // Get all tables
    const { data: allTables, error: tablesError } = await supabase
      .from('tables')
      .select('*');
    
    if (tablesError) throw tablesError;
    
    // Calculate time slots with buffer for overlap check
    const bufferStartTime = addMinutesToTime(time, -BUFFER_MINUTES);
    const reservationEndTime = addMinutesToTime(time, RESERVATION_DURATION_HOURS * 60);
    const bufferEndTime = addMinutesToTime(reservationEndTime, BUFFER_MINUTES);
    
    // Get all reservations for the date
    const { data: allReservations, error: reservationsError } = await supabase
      .from('reservations')
      .select('table_id, time, status, duration_hours, buffer_minutes')
      .eq('date', date)
      .in('status', ['confirmed', 'arrived', 'in_progress']);
    
    if (reservationsError) throw reservationsError;
    
    // Check each table for availability
    const availableTables = allTables.filter(table => {
      const tableReservations = allReservations.filter(r => r.table_id === table.id);
      
      // Check if any reservation overlaps with the requested time
      for (const reservation of tableReservations) {
        const existingTime = reservation.time;
        const existingDuration = reservation.duration_hours || RESERVATION_DURATION_HOURS;
        const existingBuffer = reservation.buffer_minutes || BUFFER_MINUTES;
        
        const existingBufferStart = addMinutesToTime(existingTime, -existingBuffer);
        const existingReservationEnd = addMinutesToTime(existingTime, existingDuration * 60);
        const existingBufferEnd = addMinutesToTime(existingReservationEnd, existingBuffer);
        
        if (hasTimeOverlap(bufferStartTime, bufferEndTime, existingBufferStart, existingBufferEnd)) {
          return false; // Table is not available
        }
      }
      
      return true; // Table is available
    });
    
    res.json(availableTables);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});
