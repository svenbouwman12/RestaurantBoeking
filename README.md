# Tafel Reserveren - Restaurant Table Reservation System

A full-stack table reservation system for restaurants built with React, Node.js, and Supabase. This system provides both customer-facing reservation functionality and a comprehensive owner dashboard for managing tables, reservations, and orders.

## Features

### Customer Features
- 📅 Calendar/time picker for date and time selection
- 👥 Number of guests input with automatic table filtering
- 📝 Optional special requests/notes
- ✅ Real-time reservation confirmation
- 📱 Mobile-friendly responsive design

### Owner Features
- 🎯 Visual table layout with color-coded status indicators
- 🖱️ Click-to-manage reservations and orders
- 📊 Real-time status updates (Available/Reserved/Occupied)
- 📋 Order management system (food, drinks, desserts)
- 🔍 Advanced filtering and search capabilities
- 📱 Mobile-optimized dashboard

### Technical Features
- ⚡ Real-time updates using Supabase Realtime
- 📧 SMS/Email notifications (configurable)
- 🔒 Secure API with proper validation
- 📱 Responsive design for all devices
- 🗄️ PostgreSQL database with proper relationships

## Tech Stack

- **Frontend**: React 18, TypeScript, React Router, Lucide React Icons
- **Backend**: Node.js, Express.js
- **Database**: Supabase (PostgreSQL)
- **Real-time**: Supabase Realtime
- **Notifications**: Twilio (SMS), Nodemailer (Email)
- **Styling**: CSS3 with responsive design

## Quick Start

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Supabase account
- Twilio account (optional, for SMS notifications)
- Email service (optional, for email notifications)

### 1. Clone and Install

```bash
# Install root dependencies
npm install

# Install client dependencies
cd client
npm install
cd ..
```

### 2. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to Settings > API to get your project URL and anon key
3. Run the SQL schema in your Supabase SQL editor:

```sql
-- Copy and paste the contents of supabase-schema.sql
```

### 3. Configure Environment Variables

Create `.env` file in the root directory:

```bash
# Supabase Configuration
SUPABASE_URL=your_supabase_url_here
SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# Twilio Configuration (optional)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number

# Email Configuration (optional)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password

# Server Configuration
PORT=3001
NODE_ENV=development
```

Create `.env` file in the client directory:

```bash
REACT_APP_SUPABASE_URL=your_supabase_url_here
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

### 4. Start the Application

```bash
# Start both frontend and backend
npm run dev

# Or start them separately:
# Backend only
npm run server

# Frontend only (in another terminal)
npm run client
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001

## Database Schema

### Tables

#### `tables`
- `id` (UUID, Primary Key)
- `name` (VARCHAR) - Table identifier (e.g., "Table 1")
- `seats` (INTEGER) - Number of seats
- `position_x` (INTEGER) - X position for visual layout
- `position_y` (INTEGER) - Y position for visual layout
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

#### `reservations`
- `id` (UUID, Primary Key)
- `table_id` (UUID, Foreign Key) - References tables.id
- `customer_name` (VARCHAR) - Customer's full name
- `customer_email` (VARCHAR) - Customer's email
- `customer_phone` (VARCHAR) - Customer's phone number
- `guests` (INTEGER) - Number of guests
- `date` (DATE) - Reservation date
- `time` (TIME) - Reservation time
- `status` (VARCHAR) - pending, confirmed, arrived, in_progress, completed, cancelled
- `notes` (TEXT) - Special requests or notes
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

#### `orders`
- `id` (UUID, Primary Key)
- `reservation_id` (UUID, Foreign Key) - References reservations.id
- `item_name` (VARCHAR) - Name of the item
- `item_type` (VARCHAR) - food, drink, dessert
- `quantity` (INTEGER) - Quantity ordered
- `price` (DECIMAL) - Item price
- `status` (VARCHAR) - pending, preparing, ready, served, cancelled
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

## API Endpoints

### Tables
- `GET /api/tables` - Get all tables
- `GET /api/tables/available` - Get available tables for date/time

### Reservations
- `GET /api/reservations` - Get all reservations (with filters)
- `POST /api/reservations` - Create new reservation
- `PATCH /api/reservations/:id` - Update reservation
- `DELETE /api/reservations/:id` - Delete reservation
- `GET /api/tables/:tableId/reservations` - Get reservations for specific table

### Orders
- `GET /api/reservations/:reservationId/orders` - Get orders for reservation
- `POST /api/orders` - Create new order
- `PATCH /api/orders/:id` - Update order
- `DELETE /api/orders/:id` - Delete order

## Usage Guide

### For Customers

1. **Make a Reservation**:
   - Select your preferred date and time
   - Choose the number of guests
   - Pick an available table
   - Fill in your contact information
   - Add any special requests
   - Submit your reservation

2. **Confirmation**:
   - You'll receive a confirmation message
   - SMS/Email notifications (if configured)
   - Reservation details are stored securely

### For Restaurant Owners

1. **Dashboard Overview**:
   - View all tables with real-time status
   - Green = Available, Yellow = Reserved, Red = Occupied
   - Click on any table to see details

2. **Managing Reservations**:
   - Click on a table to view reservation details
   - Update reservation status (arrived, in progress, etc.)
   - Add or modify customer information
   - Delete reservations if needed

3. **Order Management**:
   - Add orders for active reservations
   - Track order status (pending, preparing, ready, served)
   - Manage different item types (food, drinks, desserts)

4. **Filtering and Search**:
   - Filter reservations by status
   - Search by customer name or table
   - View reservations by date

## Real-time Features

The system uses Supabase Realtime to provide live updates:

- Table status changes are reflected immediately
- New reservations appear instantly
- Order updates are synchronized across all clients
- No page refresh needed for updates

## Notifications

### SMS Notifications (Twilio)
- Reservation confirmations
- Status updates
- Customizable message templates

### Email Notifications (SMTP)
- Reservation confirmations
- Status change notifications
- HTML email templates

## Customization

### Adding New Tables
1. Go to Supabase dashboard
2. Navigate to the `tables` table
3. Add new rows with appropriate `position_x` and `position_y` values
4. Tables will appear automatically in the dashboard

### Modifying Time Slots
Edit the `timeSlots` array in `CustomerReservation.tsx`:

```typescript
const timeSlots = [
  '17:00', '17:30', '18:00', '18:30', '19:00', '19:30',
  '20:00', '20:30', '21:00', '21:30', '22:00'
];
```

### Styling
- Modify `client/src/index.css` for global styles
- Update `client/src/App.css` for component-specific styles
- All styles are responsive and mobile-friendly

## Troubleshooting

### Common Issues

1. **Supabase Connection Error**:
   - Verify your environment variables
   - Check if your Supabase project is active
   - Ensure RLS policies are set correctly

2. **Real-time Notifications Not Working**:
   - Check Supabase Realtime is enabled
   - Verify your subscription is active
   - Check browser console for errors

3. **SMS/Email Not Sending**:
   - Verify Twilio/Email credentials
   - Check if services are properly configured
   - Review server logs for error messages

### Development Tips

- Use browser developer tools to debug API calls
- Check Supabase logs for database issues
- Monitor network requests in the Network tab
- Use React Developer Tools for component debugging

## Production Deployment

### Backend Deployment
- Deploy to platforms like Heroku, Railway, or DigitalOcean
- Set environment variables in your hosting platform
- Ensure CORS is configured for your frontend domain

### Frontend Deployment
- Build the React app: `npm run build`
- Deploy to Vercel, Netlify, or similar platforms
- Set environment variables for production

### Database
- Use Supabase production instance
- Configure proper RLS policies
- Set up database backups

## License

MIT License - feel free to use this project for your restaurant or modify it as needed.

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review the Supabase documentation
3. Check the React and Node.js documentation
4. Create an issue in the project repository

---

**Happy Reserving! 🍽️**
