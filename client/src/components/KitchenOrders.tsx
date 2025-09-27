import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { 
  ChefHat, 
  Clock, 
  Users, 
  MapPin, 
  Check, 
  Eye, 
  Filter,
  RefreshCw,
  AlertCircle,
  X
} from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { nl } from 'date-fns/locale';

interface OrderItem {
  menu_item_id: string;
  quantity: number;
  notes?: string;
  price: number;
  name: string;
}

interface Order {
  id: string;
  reservation_id: string;
  table_id: string;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'served' | 'cancelled';
  total_amount: number;
  items: OrderItem[];
  notes?: string;
  created_at: string;
  tables: {
    name: string;
  };
  reservations: {
    customer_name: string;
    guests: number;
  };
}

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  prep_time_minutes?: number;
}

interface Table {
  id: string;
  name: string;
  seats: number;
}

interface Reservation {
  id: string;
  customer_name: string;
  guests: number;
  date: string;
  time: string;
  status: string;
}

const KitchenOrders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isAutoRefreshing, setIsAutoRefreshing] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Fetch all data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch orders - oldest first (first ordered should be prepared first)
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          *,
          tables (name),
          reservations (customer_name, guests)
        `)
        .order('created_at', { ascending: true });

      if (ordersError) throw ordersError;

      // Fetch menu items
      const { data: menuData, error: menuError } = await supabase
        .from('menu_items')
        .select('*');

      if (menuError) throw menuError;

      // Fetch tables
      const { data: tablesData, error: tablesError } = await supabase
        .from('tables')
        .select('*');

      if (tablesError) throw tablesError;

      // Fetch today's reservations
      const today = new Date().toISOString().split('T')[0];
      const { data: reservationsData, error: reservationsError } = await supabase
        .from('reservations')
        .select('*')
        .eq('date', today);

      if (reservationsError) throw reservationsError;

      setOrders(ordersData || []);
      setMenuItems(menuData || []);
      setTables(tablesData || []);
      setReservations(reservationsData || []);
      
      // Mark initial load as complete
      if (isInitialLoad) {
        setIsInitialLoad(false);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Error loading data');
    } finally {
      setLoading(false);
    }
  }, [isInitialLoad]);

  useEffect(() => {
    fetchData();
    
    // Auto-refresh every 5 seconds
    const interval = setInterval(() => {
      console.log('Auto-refreshing kitchen orders...');
      setIsAutoRefreshing(true);
      fetchData().finally(() => {
        setIsAutoRefreshing(false);
      });
    }, 5000);

    // Real-time updates via Supabase
    const channel = supabase
      .channel('kitchen_orders_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, payload => {
        console.log('Real-time change received:', payload);
        fetchData();
      })
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [fetchData]);

  // Get menu item details
  const getMenuItem = (id: string): MenuItem | undefined => {
    return menuItems.find(item => item.id === id);
  };

  // Get table details
  const getTable = (id: string): Table | undefined => {
    return tables.find(table => table.id === id);
  };

  // Get reservation details
  const getReservation = (reservationId: string): Reservation | undefined => {
    return reservations.find(res => res.id === reservationId);
  };

  // Filter orders by status
  const getFilteredOrders = (): Order[] => {
    if (statusFilter === 'all') {
      return orders.filter(order => order.status !== 'served' && order.status !== 'cancelled');
    }
    return orders.filter(order => order.status === statusFilter);
  };

  // Sort orders by priority - oldest first (first ordered should be prepared first)
  const sortedOrders = getFilteredOrders().sort((a, b) => {
    // First, prioritize by status (preparing orders first)
    if (a.status === 'preparing' && b.status !== 'preparing') return -1;
    if (b.status === 'preparing' && a.status !== 'preparing') return 1;
    
    // Then, sort by creation time (oldest first - FIFO)
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });

  // Handle status update
  const handleStatusUpdate = async (orderId: string, newStatus: Order['status']) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) throw error;

      setSuccess(`Bestelling ${newStatus === 'ready' ? 'als klaar gemarkeerd' : 'status bijgewerkt'}!`);
      setShowConfirmModal(false);
      setSelectedOrder(null);
      
      // Refresh data
      await fetchData();
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error updating order status:', error);
      setError('Error updating order status');
    }
  };

  // Get estimated prep time
  const getEstimatedPrepTime = (order: Order): number => {
    return order.items.reduce((total, item) => {
      const menuItem = getMenuItem(item.menu_item_id);
      return total + (menuItem?.prep_time_minutes || 0) * item.quantity;
    }, 0);
  };

  return (
    <div className="kitchen-full-width">
      {/* Header */}
      <div className="kitchen-header">
        <div className="container">
          <div className="flex" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
            <h1 className="kitchen-title">
              <ChefHat size={24} style={{ marginRight: '12px', verticalAlign: 'middle' }} />
              Keuken Overzicht
              {isInitialLoad && (
                <span className="loading-indicator">
                  <RefreshCw size={14} style={{ marginLeft: '8px', animation: 'spin 1s linear infinite', opacity: 0.5 }} />
                </span>
              )}
              {isAutoRefreshing && !isInitialLoad && (
                <span className="auto-refresh-indicator">
                  <RefreshCw size={14} style={{ marginLeft: '8px', animation: 'spin 1s linear infinite', opacity: 0.6 }} />
                </span>
              )}
            </h1>
            <button 
              className="btn btn-secondary" 
              onClick={fetchData}
              disabled={loading}
            >
              <RefreshCw size={16} style={{ marginRight: '8px' }} />
              Ververs
            </button>
          </div>
        </div>
      </div>

      {/* Status Filter */}
      <div className="kitchen-filter-section">
        <div className="container">
          {error && <div className="error">{error}</div>}
          {success && <div className="success">{success}</div>}

          {/* Status Filter */}
          <div className="status-filter">
            <div className="filter-label">
              <Filter size={16} style={{ marginRight: '8px' }} />
              Status Filter:
            </div>
            <div className="filter-buttons">
              <button
                className={`filter-btn ${statusFilter === 'all' ? 'active' : ''}`}
                onClick={() => setStatusFilter('all')}
              >
                Alle ({orders.filter(o => o.status !== 'served' && o.status !== 'cancelled').length})
              </button>
              <button
                className={`filter-btn ${statusFilter === 'pending' ? 'active' : ''}`}
                onClick={() => setStatusFilter('pending')}
              >
                Wachtend ({orders.filter(o => o.status === 'pending').length})
              </button>
              <button
                className={`filter-btn ${statusFilter === 'confirmed' ? 'active' : ''}`}
                onClick={() => setStatusFilter('confirmed')}
              >
                Bevestigd ({orders.filter(o => o.status === 'confirmed').length})
              </button>
              <button
                className={`filter-btn ${statusFilter === 'preparing' ? 'active' : ''}`}
                onClick={() => setStatusFilter('preparing')}
              >
                Bereiden ({orders.filter(o => o.status === 'preparing').length})
              </button>
              <button
                className={`filter-btn ${statusFilter === 'ready' ? 'active' : ''}`}
                onClick={() => setStatusFilter('ready')}
              >
                Klaar ({orders.filter(o => o.status === 'ready').length})
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Orders List - Full Width */}
      <div className="kitchen-orders-full">
        <div className="kitchen-orders">
            {sortedOrders.length === 0 && !isInitialLoad ? (
              <div className="empty-state">
                <ChefHat size={48} style={{ color: 'var(--neutral-400)', marginBottom: '1rem' }} />
                <h3>Geen bestellingen</h3>
                <p>Er zijn momenteel geen bestellingen in de keuken.</p>
              </div>
            ) : sortedOrders.length > 0 ? (
              sortedOrders.map(order => {
                const table = getTable(order.table_id);
                const reservation = getReservation(order.reservation_id);
                const estimatedTime = getEstimatedPrepTime(order);
                const orderTime = new Date(order.created_at);

                return (
                  <div key={order.id} className={`order-card ${order.status}`}>
                    <div className="order-header">
                      <div className="order-info">
                        <h3>Bestelling #{order.id.slice(-6)}</h3>
                        <div className="order-meta">
                          <span className={`status-badge ${order.status}`}>
                            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                          </span>
                          <span className="time-ago">
                            <Clock size={14} style={{ marginRight: '4px' }} />
                            {formatDistanceToNow(orderTime, { addSuffix: true, locale: nl })}
                          </span>
                        </div>
                      </div>
                      <div className="order-actions">
                        {order.status === 'confirmed' && (
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => handleStatusUpdate(order.id, 'preparing')}
                          >
                            <ChefHat size={16} style={{ marginRight: '8px' }} />
                            Start Bereiden
                          </button>
                        )}
                        {order.status === 'preparing' && (
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleStatusUpdate(order.id, 'ready')}
                          >
                            <Check size={16} style={{ marginRight: '8px' }} />
                            Klaar
                          </button>
                        )}
                        {order.status === 'ready' && (
                          <span className="ready-indicator">
                            <AlertCircle size={16} style={{ marginRight: '8px' }} />
                            Klaar om te serveren!
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="order-details">
                      <div className="table-info">
                        <MapPin size={16} style={{ marginRight: '8px' }} />
                        Tafel: {table?.name || 'Onbekend'} ({reservation?.customer_name || 'Walk-in'} - {reservation?.guests || '?'} pers.)
                      </div>
                      <div className="order-items">
                        {order.items.map((item, index) => (
                          <div key={index} className="order-item">
                            <div className="item-info">
                              <span className="quantity">{item.quantity}x</span>
                              <span className="item-name">{item.name}</span>
                              {item.notes && <span className="item-notes">({item.notes})</span>}
                            </div>
                            <span className="item-price">€{(item.price * item.quantity).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                      {order.notes && (
                        <div className="order-notes">
                          <strong>Opmerkingen:</strong> {order.notes}
                        </div>
                      )}
                    </div>

                    <div className="order-footer">
                      <div className="estimated-time">
                        <Clock size={14} style={{ marginRight: '4px' }} />
                        Geschatte bereidingstijd: {estimatedTime} min
                      </div>
                      <div className="total-amount">
                        <strong>Totaal: €{order.total_amount.toFixed(2)}</strong>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : isInitialLoad ? (
              <div className="empty-state">
                <ChefHat size={48} style={{ color: 'var(--neutral-300)', marginBottom: '1rem' }} />
                <h3>Bestellingen laden...</h3>
                <p>Even geduld, de keuken wordt geladen.</p>
              </div>
            ) : null}
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && selectedOrder && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Bestelling Afhandelen</h3>
              <button 
                className="btn btn-icon" 
                onClick={() => {
                  setShowConfirmModal(false);
                  setSelectedOrder(null);
                }}
              >
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <p>Wil je bestelling #{selectedOrder.id.slice(-6)} markeren als geserveerd?</p>
              <div className="order-summary">
                <strong>Tafel:</strong> {getTable(selectedOrder.table_id)?.name || 'Onbekend'}<br/>
                <strong>Totaal:</strong> €{selectedOrder.total_amount.toFixed(2)}<br/>
                <strong>Items:</strong> {selectedOrder.items.length} artikelen
              </div>
            </div>
            <div className="modal-actions">
              <button 
                className="btn btn-secondary" 
                onClick={() => {
                  setShowConfirmModal(false);
                  setSelectedOrder(null);
                }}
              >
                Annuleren
              </button>
              <button 
                className="btn btn-success" 
                onClick={() => handleStatusUpdate(selectedOrder.id, 'served')}
              >
                <Check size={16} style={{ marginRight: '8px' }} />
                Markeer als Geserveerd
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KitchenOrders;