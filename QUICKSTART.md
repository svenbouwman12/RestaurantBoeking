# 🚀 Quick Start Guide

Get your restaurant table reservation system up and running in 5 minutes!

## Prerequisites
- Node.js (v16+)
- A Supabase account (free at supabase.com)

## Step 1: Setup Supabase Database
1. Go to [supabase.com](https://supabase.com) and create a new project
2. In your Supabase dashboard, go to **SQL Editor**
3. Copy and paste the entire contents of `supabase-schema.sql`
4. Click **Run** to create all tables and sample data

## Step 2: Get Your Supabase Credentials
1. In Supabase dashboard, go to **Settings** → **API**
2. Copy your **Project URL** and **anon public** key

## Step 3: Configure Environment Variables
1. Copy `env.example` to `.env` in the root directory
2. Copy `client/env.example` to `client/.env`
3. Fill in your Supabase credentials:

**Root `.env`:**
```
SUPABASE_URL=your_project_url_here
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

**Client `.env`:**
```
REACT_APP_SUPABASE_URL=your_project_url_here
REACT_APP_SUPABASE_ANON_KEY=your_anon_key_here
```

## Step 4: Install and Run
```bash
# Install dependencies
npm run install-all

# Seed with demo data (optional)
npm run seed

# Start the application
npm run dev
```

## Step 5: Open Your Browser
- **Customer View**: http://localhost:3000
- **Owner Dashboard**: http://localhost:3000/owner

## 🎯 What You Can Do Now

### As a Customer:
- Make reservations with date/time picker
- Choose number of guests
- Select from available tables
- Add special requests
- Get instant confirmation

### As a Restaurant Owner:
- View visual table layout with color-coded status
- Click tables to manage reservations
- Add and track orders
- Update reservation status
- Filter and search reservations
- Real-time updates across all devices

## 🎨 Features Included

✅ **Customer Features**
- Calendar/time picker
- Guest count selection
- Table availability checking
- Special requests
- Mobile-responsive design

✅ **Owner Features**
- Visual table layout
- Click-to-manage reservations
- Order management system
- Status tracking
- Real-time updates
- Mobile dashboard

✅ **Technical Features**
- Supabase real-time database
- SMS/Email notifications (optional)
- RESTful API
- TypeScript support
- Responsive design

## 🔧 Optional: Enable Notifications

### SMS (Twilio)
Add to your `.env`:
```
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=your_phone_number
```

### Email (Gmail)
Add to your `.env`:
```
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
```

## 🎉 You're Ready!

Your restaurant table reservation system is now running! 

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Health Check**: http://localhost:3001/api/health

## 📚 Need Help?

- Check the full [README.md](README.md) for detailed documentation
- Review the API endpoints in the README
- Check browser console for any errors
- Verify your Supabase connection in the dashboard

**Happy Reserving! 🍽️**
