import React, { useState, useEffect, useCallback } from 'react';
import { 
  Calendar, 
  Clock, 
  Users, 
  Eye, 
  Trash2, 
  Plus, 
  Filter,
  Search,
  Phone,
  Mail,
  MessageSquare,
  Settings as SettingsIcon,
  Utensils,
  Building,
  ChefHat,
  X
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { supabase } from '../lib/supabase';
import MenuManagement from './MenuManagement';
import KitchenOrders from './KitchenOrders';
import TableManagement from './TableManagement';
import Settings from './Settings';
import PhoneOrders from './PhoneOrders';

interface Table {
  id: string;
  name: string;
  seats: number;
  position_x: number;
  position_y: number;
}

interface Reservation {
  id: string;
  table_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  guests: number;
  date: string;
  time: string;
  status: string;
  notes: string;
  tables: Table;
}

interface Order {
  id: string;
  reservation_id: string;
  table_id: string;
  status: string;
  total_amount: number;
  items: Array<{
    menu_item_id: string;
    quantity: number;
    notes?: string;
    price: number;
  }>;
  notes?: string;
  created_at: string;
}


const OwnerDashboard: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [tables, setTables] = useState<Table[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showReservationModal, setShowReservationModal] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // New reservation form
  const [newReservation, setNewReservation] = useState({
    table_id: '',
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    guests: 2,
    date: selectedDate,
    time: '19:00',
    notes: ''
  });

  // Order creation is now handled in the Phone Orders tab

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch tables
      const { data: tablesData, error: tablesError } = await supabase
        .from('tables')
        .select('*')
        .order('name');
      
      if (tablesError) throw tablesError;
      
      // Fetch reservations for selected date
      const { data: reservationsData, error: reservationsError } = await supabase
        .from('reservations')
        .select(`
          *,
          tables (
            id,
            name,
            seats
          )
        `)
        .eq('date', selectedDate)
        .order('time', { ascending: true });
      
      if (reservationsError) throw reservationsError;
      
      // Fetch orders for selected date
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          *,
          reservations!inner (
            date
          )
        `)
        .eq('reservations.date', selectedDate)
        .order('created_at', { ascending: false });
      
      if (ordersError) throw ordersError;
      
      // Fetch menu items
      const { data: menuItemsData, error: menuItemsError } = await supabase
        .from('menu_items')
        .select('*');
      
      if (menuItemsError) throw menuItemsError;
      
      setTables(tablesData);
      setReservations(reservationsData);
      setOrders(ordersData);
      setMenuItems(menuItemsData);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Error loading data');
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const fetchOrders = async (reservationId: string) => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('reservation_id', reservationId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      setOrders(data);
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

  const getTableStatus = (tableId: string): string => {
    const reservation = reservations.find(r => r.table_id === tableId);
    if (!reservation) return 'available';
    return reservation.status;
  };

  const getMenuItemName = (menuItemId: string): string => {
    const menuItem = menuItems.find(item => item.id === menuItemId);
    return menuItem ? menuItem.name : '';
  };

  const getTableTotalAmount = (tableId: string): number => {
    const tableOrders = orders.filter(order => order.table_id === tableId);
    return tableOrders.reduce((total, order) => total + order.total_amount, 0);
  };

  const getTableColor = (status: string): string => {
    switch (status) {
      case 'available': return '#28a745';
      case 'confirmed': return '#ffc107';
      case 'arrived': return '#dc3545';
      case 'in_progress': return '#dc3545';
      case 'completed': return '#6c757d';
      default: return '#6c757d';
    }
  };

  const handleTableClick = async (table: Table) => {
    setSelectedTable(table);
    const reservation = reservations.find(r => r.table_id === table.id);
    if (reservation) {
      setSelectedReservation(reservation);
      await fetchOrders(reservation.id);
    } else {
      setSelectedReservation(null);
      setOrders([]);
    }
  };

  const handleStatusChange = async (reservationId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('reservations')
        .update({ status: newStatus })
        .eq('id', reservationId);
      
      if (error) throw error;
      
      await fetchData();
      if (selectedReservation?.id === reservationId) {
        setSelectedReservation(prev => prev ? { ...prev, status: newStatus } : null);
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleCreateReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from('reservations')
        .insert([newReservation]);
      
      if (error) throw error;
      
      setShowReservationModal(false);
      setNewReservation({
        table_id: '',
        customer_name: '',
        customer_email: '',
        customer_phone: '',
        guests: 2,
        date: selectedDate,
        time: '19:00',
        notes: ''
      });
      await fetchData();
    } catch (error) {
      console.error('Error creating reservation:', error);
    }
  };

  // Order creation is now handled in the Phone Orders tab

  const handleDeleteReservation = async (reservationId: string) => {
    if (!window.confirm('Are you sure you want to delete this reservation?')) return;
    
    try {
      const { error } = await supabase
        .from('reservations')
        .delete()
        .eq('id', reservationId);
      
      if (error) throw error;
      
      await fetchData();
      if (selectedReservation?.id === reservationId) {
        setSelectedReservation(null);
        setOrders([]);
      }
    } catch (error) {
      console.error('Error deleting reservation:', error);
    }
  };

  const filteredReservations = reservations.filter(reservation => {
    const matchesStatus = statusFilter === 'all' || reservation.status === statusFilter;
    const matchesSearch = searchTerm === '' || 
      reservation.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reservation.tables.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  if (loading) {
    return (
      <div className="container">
        <div className="loading">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="dashboard-full-width">
      <div className="dashboard-header">
        <h1 className="dashboard-title">Eigenaar Dashboard</h1>
        
        {/* Tab Navigation */}
        <div className="dashboard-tabs">
            <button
              className={`tab-btn ${currentTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setCurrentTab('dashboard')}
            >
              <Calendar size={16} style={{ marginRight: '8px' }} />
              Dashboard
            </button>
            <button
              className={`tab-btn ${currentTab === 'menu' ? 'active' : ''}`}
              onClick={() => setCurrentTab('menu')}
            >
              <Utensils size={16} style={{ marginRight: '8px' }} />
              Menu Beheer
            </button>
            <button
              className={`tab-btn ${currentTab === 'tables' ? 'active' : ''}`}
              onClick={() => setCurrentTab('tables')}
            >
              <Building size={16} style={{ marginRight: '8px' }} />
              Tafel Beheer
            </button>
            <button
              className={`tab-btn ${currentTab === 'kitchen' ? 'active' : ''}`}
              onClick={() => setCurrentTab('kitchen')}
            >
              <ChefHat size={16} style={{ marginRight: '8px' }} />
              Keuken
            </button>
            <button
              className={`tab-btn ${currentTab === 'phone' ? 'active' : ''}`}
              onClick={() => setCurrentTab('phone')}
            >
              <Phone size={16} style={{ marginRight: '8px' }} />
              Bestelling Opnemen
            </button>
            <button
              className={`tab-btn ${currentTab === 'settings' ? 'active' : ''}`}
              onClick={() => setCurrentTab('settings')}
            >
              <SettingsIcon size={16} style={{ marginRight: '8px' }} />
              Instellingen
            </button>
          </div>
          
          {/* Dashboard Controls - Only show on dashboard tab */}
          {currentTab === 'dashboard' && (
            <div className="flex gap-4" style={{ alignItems: 'center', flexWrap: 'wrap', marginTop: '1rem' }}>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="form-input"
                style={{ width: 'auto', minWidth: '200px' }}
              />
              <button
                className="btn btn-primary"
                onClick={() => setShowReservationModal(true)}
              >
                <Plus size={20} style={{ marginRight: '8px' }} />
                Reservering Toevoegen
              </button>
            </div>
          )}
        </div>

        {error && <div className="error">{error}</div>}

        {/* Tab Content */}
        {currentTab === 'dashboard' && (
          <>
            {/* Filters */}
            <div className="grid grid-2 mb-20">
              <div className="form-group">
                <label className="form-label">
                  <Search size={20} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                  Zoeken
                </label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="form-input"
                  placeholder="Zoek op klantnaam of tafel..."
                />
              </div>
              <div className="form-group">
                <label className="form-label">
                  <Filter size={20} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                  Status Filter
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="form-input"
                >
                  <option value="all">Alle Statussen</option>
                  <option value="pending">In behandeling</option>
                  <option value="confirmed">Bevestigd</option>
                  <option value="arrived">Aangekomen</option>
                  <option value="in_progress">Bezig</option>
                  <option value="completed">Voltooid</option>
                  <option value="cancelled">Geannuleerd</option>
                </select>
              </div>
            </div>

        <div className="grid grid-2">
          {/* Table Layout */}
          <div className="card">
            <h3 className="card-title">Tafel Layout</h3>
            <div className="table-grid">
              {tables.map(table => {
                const status = getTableStatus(table.id);
                const color = getTableColor(status);
                const reservation = reservations.find(r => r.table_id === table.id);
                const tableOrders = orders.filter(o => o.table_id === table.id);
                const hasOrders = tableOrders.length > 0;
                
                return (
                  <div
                    key={table.id}
                    className="table-item"
                    style={{
                      backgroundColor: color,
                      color: 'white',
                      cursor: 'pointer',
                      position: 'absolute',
                      left: table.position_x,
                      top: table.position_y,
                      width: '80px',
                      height: '80px',
                      borderRadius: '50%',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                      transition: 'transform 0.2s ease',
                      border: hasOrders ? '3px solid #f59e0b' : 'none'
                    }}
                    onClick={() => handleTableClick(table)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'scale(1.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                  >
                    <div>{table.name}</div>
                    <div>{table.seats} plaatsen</div>
                    <div style={{ fontSize: '10px', textTransform: 'capitalize' }}>
                      {status === 'available' ? 'beschikbaar' : 
                       status === 'confirmed' ? 'gereserveerd' :
                       status === 'arrived' ? 'aangekomen' :
                       status === 'in_progress' ? 'bezig' :
                       status === 'completed' ? 'voltooid' :
                       status === 'cancelled' ? 'geannuleerd' : status}
                    </div>
                    {hasOrders && (
                      <div style={{ 
                        fontSize: '8px', 
                        marginTop: '2px',
                        backgroundColor: 'rgba(245, 158, 11, 0.9)',
                        padding: '1px 4px',
                        borderRadius: '8px'
                      }}>
                        {tableOrders.length} bestelling{tableOrders.length > 1 ? 'en' : ''}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="legend">
              <div className="legend-item">
                <div className="legend-color" style={{ backgroundColor: '#28a745' }}></div>
                <span>Beschikbaar</span>
              </div>
              <div className="legend-item">
                <div className="legend-color" style={{ backgroundColor: '#ffc107' }}></div>
                <span>Gereserveerd</span>
              </div>
              <div className="legend-item">
                <div className="legend-color" style={{ backgroundColor: '#dc3545' }}></div>
                <span>Bezet</span>
              </div>
            </div>
          </div>

          {/* Reservation Details */}
          <div className="card">
            <h3 className="card-title">Reservering Details</h3>
            {selectedReservation ? (
              <div>
                <div className="reservation-info">
                  <h4>{selectedReservation.customer_name}</h4>
                  <p><Users size={16} style={{ marginRight: '8px' }} />{selectedReservation.guests} gasten</p>
                  <p><Calendar size={16} style={{ marginRight: '8px' }} />{format(parseISO(selectedReservation.date), 'MMM d, yyyy')}</p>
                  <p><Clock size={16} style={{ marginRight: '8px' }} />{selectedReservation.time}</p>
                  <p><Phone size={16} style={{ marginRight: '8px' }} />{selectedReservation.customer_phone || 'N/A'}</p>
                  <p><Mail size={16} style={{ marginRight: '8px' }} />{selectedReservation.customer_email || 'N/A'}</p>
                  {selectedReservation.notes && (
                    <p><MessageSquare size={16} style={{ marginRight: '8px' }} />{selectedReservation.notes}</p>
                  )}
                </div>

                <div className="status-controls">
                  <label className="form-label">Status Bijwerken:</label>
                  <select
                    value={selectedReservation.status}
                    onChange={(e) => handleStatusChange(selectedReservation.id, e.target.value)}
                    className="form-input"
                  >
                    <option value="pending">In behandeling</option>
                    <option value="confirmed">Bevestigd</option>
                    <option value="arrived">Aangekomen</option>
                    <option value="in_progress">Bezig</option>
                    <option value="completed">Voltooid</option>
                    <option value="cancelled">Geannuleerd</option>
                  </select>
                </div>

                <div className="orders-section">
                  <div className="flex justify-between align-center">
                    <div>
                      <h4>Bestellingen</h4>
                      {selectedTable && (
                        <p className="total-amount">
                          <strong>Totaal te betalen: €{getTableTotalAmount(selectedTable.id).toFixed(2)}</strong>
                        </p>
                      )}
                    </div>
                    <button 
                      className="btn btn-primary btn-sm"
                      onClick={() => {
                        // Switch to phone orders tab with this table pre-selected
                        setCurrentTab('phone');
                      }}
                    >
                      <Plus size={16} style={{ marginRight: '8px' }} />
                      Bestelling Toevoegen
                    </button>
                  </div>
                  
                  {orders.length === 0 ? (
                    <p className="text-muted">Nog geen bestellingen</p>
                  ) : (
                    <div className="orders-list">
                      {orders.map(order => (
                        <div 
                          key={order.id} 
                          className="order-item clickable-order"
                          onClick={() => {
                            setSelectedOrder(order);
                            setShowOrderModal(true);
                          }}
                          style={{ cursor: 'pointer', padding: '0.75rem', border: '1px solid var(--neutral-200)', borderRadius: '8px', marginBottom: '0.5rem' }}
                        >
                          <div>
                            <strong>Order #{order.id.slice(-6)}</strong>
                            <span className="text-muted"> - €{order.total_amount.toFixed(2)}</span>
                          </div>
                          <div>
                            <span>{order.items.length} item{order.items.length > 1 ? 's' : ''}</span>
                            <span className="text-muted"> | Status: {order.status}</span>
                            <span className={`status-badge status-${order.status}`}>
                              {order.status === 'pending' ? 'in behandeling' :
                               order.status === 'preparing' ? 'wordt bereid' :
                               order.status === 'ready' ? 'klaar' :
                               order.status === 'served' ? 'geserveerd' :
                               order.status === 'cancelled' ? 'geannuleerd' : order.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="action-buttons">
                  <button 
                    className="btn btn-danger"
                    onClick={() => handleDeleteReservation(selectedReservation.id)}
                  >
                    <Trash2 size={16} style={{ marginRight: '8px' }} />
                    Reservering Verwijderen
                  </button>
                </div>
              </div>
            ) : selectedTable ? (
              <div>
                <h4>{selectedTable.name}</h4>
                <p>Plaatsen: {selectedTable.seats}</p>
                <p className="text-success">Beschikbaar</p>
                
                {/* Show orders for this table */}
                {orders.filter(o => o.table_id === selectedTable.id).length > 0 && (
                  <div style={{ marginTop: '1rem' }}>
                    <h5>Bestellingen:</h5>
                    {orders.filter(o => o.table_id === selectedTable.id).map(order => (
                      <div key={order.id} style={{ 
                        background: '#f8f9fa', 
                        padding: '0.75rem', 
                        borderRadius: '8px', 
                        marginBottom: '0.5rem',
                        border: '1px solid #e9ecef'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: '600' }}>Order #{order.id.slice(-6)}</span>
                          <span style={{ 
                            padding: '0.25rem 0.5rem', 
                            borderRadius: '4px', 
                            fontSize: '0.8rem',
                            backgroundColor: order.status === 'pending' ? '#fff3cd' : 
                                           order.status === 'confirmed' ? '#d1ecf1' :
                                           order.status === 'preparing' ? '#f8d7da' :
                                           order.status === 'ready' ? '#d4edda' : '#e2e3e5',
                            color: order.status === 'pending' ? '#856404' :
                                   order.status === 'confirmed' ? '#0c5460' :
                                   order.status === 'preparing' ? '#721c24' :
                                   order.status === 'ready' ? '#155724' : '#6c757d'
                          }}>
                            {order.status === 'pending' ? 'In behandeling' :
                             order.status === 'confirmed' ? 'Bevestigd' :
                             order.status === 'preparing' ? 'Bereiden' :
                             order.status === 'ready' ? 'Klaar' :
                             order.status === 'served' ? 'Geserveerd' : order.status}
                          </span>
                        </div>
                        <div style={{ marginTop: '0.5rem' }}>
                          <strong>€{order.total_amount.toFixed(2)}</strong>
                          <div style={{ fontSize: '0.9rem', color: '#6c757d', marginTop: '0.25rem' }}>
                            {order.items.length} item{order.items.length > 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                <button 
                  className="btn btn-primary"
                  onClick={() => {
                    setNewReservation(prev => ({ ...prev, table_id: selectedTable.id }));
                    setShowReservationModal(true);
                  }}
                >
                  <Plus size={16} style={{ marginRight: '8px' }} />
                  Reservering Maken
                </button>
              </div>
            ) : (
              <p className="text-muted">Klik op een tafel om details te bekijken</p>
            )}
          </div>
        </div>

        {/* Reservations List */}
        <div className="card mt-20">
          <h3 className="card-title">Alle Reserveringen ({filteredReservations.length})</h3>
          <div className="reservations-list">
            {filteredReservations.map(reservation => (
              <div key={reservation.id} className="reservation-item">
                <div className="reservation-main">
                  <h4>{reservation.customer_name}</h4>
                  <p>{reservation.tables.name} • {reservation.guests} gasten</p>
                  <p>{format(parseISO(reservation.date), 'MMM d, yyyy')} om {reservation.time}</p>
                </div>
                <div className="reservation-status">
                  <span className={`status-badge status-${reservation.status}`}>
                    {reservation.status === 'pending' ? 'In behandeling' :
                     reservation.status === 'confirmed' ? 'Bevestigd' :
                     reservation.status === 'arrived' ? 'Aangekomen' :
                     reservation.status === 'in_progress' ? 'Bezig' :
                     reservation.status === 'completed' ? 'Voltooid' :
                     reservation.status === 'cancelled' ? 'Geannuleerd' : reservation.status}
                  </span>
                </div>
                <div className="reservation-actions">
                  <button 
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      setSelectedTable(tables.find(t => t.id === reservation.table_id) || null);
                      setSelectedReservation(reservation);
                      fetchOrders(reservation.id);
                    }}
                  >
                    <Eye size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
          </>
        )}

        {/* Menu Management Tab */}
        {currentTab === 'menu' && (
          <div className="tab-content">
            <MenuManagement />
          </div>
        )}

        {/* Table Management Tab */}
        {currentTab === 'tables' && (
          <div className="tab-content">
            <TableManagement />
          </div>
        )}

        {/* Kitchen Tab */}
        {currentTab === 'kitchen' && (
          <div className="tab-content">
            <KitchenOrders />
          </div>
        )}

        {/* Phone Orders Tab */}
        {currentTab === 'phone' && (
          <div className="tab-content">
            <PhoneOrders />
          </div>
        )}

        {/* Settings Tab */}
        {currentTab === 'settings' && (
          <div className="tab-content">
            <Settings />
          </div>
        )}

        {/* Create Reservation Modal */}
        {showReservationModal && (
          <div className="modal-overlay">
            <div className="modal">
              <h3>Nieuwe Reservering Maken</h3>
            <form onSubmit={handleCreateReservation}>
              <div className="form-group">
                <label className="form-label">Tafel</label>
                <select
                  value={newReservation.table_id}
                  onChange={(e) => setNewReservation(prev => ({ ...prev, table_id: e.target.value }))}
                  className="form-input"
                  required
                >
                  <option value="">Selecteer een tafel</option>
                  {tables.map(table => (
                    <option key={table.id} value={table.id}>
                      {table.name} ({table.seats} plaatsen)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">Klantnaam</label>
                  <input
                    type="text"
                    value={newReservation.customer_name}
                    onChange={(e) => setNewReservation(prev => ({ ...prev, customer_name: e.target.value }))}
                    className="form-input"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Gasten</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={newReservation.guests}
                    onChange={(e) => setNewReservation(prev => ({ ...prev, guests: parseInt(e.target.value) }))}
                    className="form-input"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">Datum</label>
                  <input
                    type="date"
                    value={newReservation.date}
                    onChange={(e) => setNewReservation(prev => ({ ...prev, date: e.target.value }))}
                    className="form-input"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Tijd</label>
                  <input
                    type="time"
                    value={newReservation.time}
                    onChange={(e) => setNewReservation(prev => ({ ...prev, time: e.target.value }))}
                    className="form-input"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">E-mail</label>
                <input
                  type="email"
                  value={newReservation.customer_email}
                  onChange={(e) => setNewReservation(prev => ({ ...prev, customer_email: e.target.value }))}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Telefoon</label>
                <input
                  type="tel"
                  value={newReservation.customer_phone}
                  onChange={(e) => setNewReservation(prev => ({ ...prev, customer_phone: e.target.value }))}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Opmerkingen</label>
                <textarea
                  value={newReservation.notes}
                  onChange={(e) => setNewReservation(prev => ({ ...prev, notes: e.target.value }))}
                  className="form-textarea"
                  rows={3}
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowReservationModal(false)}>
                  Annuleren
                </button>
                <button type="submit" className="btn btn-primary">
                  Reservering Maken
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

        {/* Order Details Modal */}
        {showOrderModal && selectedOrder && (
          <div className="modal-overlay">
            <div className="modal">
              <div className="modal-header">
                <h3>Bestelling Details #{selectedOrder.id.slice(-6)}</h3>
                <button 
                  className="btn btn-icon" 
                  onClick={() => {
                    setShowOrderModal(false);
                    setSelectedOrder(null);
                  }}
                >
                  <X size={20} />
                </button>
              </div>
              <div className="modal-body">
                <div className="order-details-grid">
                  <div className="order-info-section">
                    <h4>Bestelling Info</h4>
                    <p><strong>Status:</strong> {selectedOrder.status}</p>
                    <p><strong>Totaal:</strong> €{selectedOrder.total_amount.toFixed(2)}</p>
                    <p><strong>Datum:</strong> {new Date(selectedOrder.created_at).toLocaleString('nl-NL')}</p>
                    {selectedOrder.notes && (
                      <p><strong>Opmerkingen:</strong> {selectedOrder.notes}</p>
                    )}
                  </div>
                  
                  <div className="order-items-section">
                    <h4>Items</h4>
                    <div className="order-items-list">
                      {selectedOrder.items.map((item, index) => (
                        <div key={index} className="order-item-detail">
                          <div className="item-info">
                            <span className="item-quantity">{item.quantity}x</span>
                            <span className="item-name">{getMenuItemName(item.menu_item_id) || `Item ${item.menu_item_id}`}</span>
                            {item.notes && <span className="item-notes">({item.notes})</span>}
                          </div>
                          <span className="item-price">€{(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-actions">
                <button 
                  className="btn btn-secondary" 
                  onClick={() => {
                    setShowOrderModal(false);
                    setSelectedOrder(null);
                  }}
                >
                  Sluiten
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Note: Order creation is now handled in the Phone Orders tab */}

    </div>
  );
};

export default OwnerDashboard;
