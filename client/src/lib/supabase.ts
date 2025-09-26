import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'your_supabase_url_here';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'your_supabase_anon_key_here';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Realtime subscriptions
export const subscribeToReservations = (callback: (payload: any) => void) => {
  return supabase
    .channel('reservations')
    .on('postgres_changes', 
      { 
        event: '*', 
        schema: 'public', 
        table: 'reservations' 
      }, 
      callback
    )
    .subscribe();
};

export const subscribeToOrders = (callback: (payload: any) => void) => {
  return supabase
    .channel('orders')
    .on('postgres_changes', 
      { 
        event: '*', 
        schema: 'public', 
        table: 'orders' 
      }, 
      callback
    )
    .subscribe();
};

export const subscribeToTables = (callback: (payload: any) => void) => {
  return supabase
    .channel('tables')
    .on('postgres_changes', 
      { 
        event: '*', 
        schema: 'public', 
        table: 'tables' 
      }, 
      callback
    )
    .subscribe();
};
