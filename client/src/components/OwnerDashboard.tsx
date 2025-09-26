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
  Settings,
  Save,
  X
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { supabase } from '../lib/supabase';

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
  item_name: string;
  item_type: string;
  quantity: number;
  price: number;
  status: string;
}

interface RestaurantSetting {
  id: string;
  setting_key: string;
  setting_value: string;
  setting_type: 'string' | 'number' | 'boolean' | 'json';
  description: string;
}

interface OpeningHours {
  open: string;
  close: string;
  closed: boolean;
}

const OwnerDashboard: React.FC = () => {
  const [tables, setTables] = useState<Table[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [showReservationModal, setShowReservationModal] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // Settings state
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<RestaurantSetting[]>([]);
  const [openingHours, setOpeningHours] = useState<{[key: string]: OpeningHours}>({});
  const [defaultDuration, setDefaultDuration] = useState(2);
  const [defaultBuffer, setDefaultBuffer] = useState(15);
  const [maxAdvanceDays, setMaxAdvanceDays] = useState(30);
  const [minAdvanceHours, setMinAdvanceHours] = useState(2);

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

  // New order form
  const [newOrder, setNewOrder] = useState({
    item_name: '',
    item_type: 'food',
    quantity: 1,
    price: 0
  });

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
      
      setTables(tablesData);
      setReservations(reservationsData);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Error loading data');
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  const fetchSettings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('restaurant_settings')
        .select('*')
        .order('setting_key');
      
      if (error) throw error;
      
      setSettings(data);
      
      // Parse opening hours
      const hours: {[key: string]: OpeningHours} = {};
      data.forEach((setting: RestaurantSetting) => {
        if (setting.setting_key.startsWith('opening_hours_')) {
          const day = setting.setting_key.replace('opening_hours_', '');
          hours[day] = JSON.parse(setting.setting_value);
        } else if (setting.setting_key === 'default_reservation_duration') {
          setDefaultDuration(parseInt(setting.setting_value));
        } else if (setting.setting_key === 'default_buffer_minutes') {
          setDefaultBuffer(parseInt(setting.setting_value));
        } else if (setting.setting_key === 'max_advance_booking_days') {
          setMaxAdvanceDays(parseInt(setting.setting_value));
        } else if (setting.setting_key === 'min_advance_booking_hours') {
          setMinAdvanceHours(parseInt(setting.setting_value));
        }
      });
      
      setOpeningHours(hours);
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  }, []);

  const saveSettings = async () => {
    try {
      // Save opening hours
      for (const [day, hours] of Object.entries(openingHours)) {
        const { error } = await supabase
          .from('restaurant_settings')
          .update({ setting_value: JSON.stringify(hours) })
          .eq('setting_key', `opening_hours_${day}`);
        
        if (error) throw error;
      }
      
      // Save other settings
      const settingsToUpdate = [
        { key: 'default_reservation_duration', value: defaultDuration.toString() },
        { key: 'default_buffer_minutes', value: defaultBuffer.toString() },
        { key: 'max_advance_booking_days', value: maxAdvanceDays.toString() },
        { key: 'min_advance_booking_hours', value: minAdvanceHours.toString() }
      ];
      
      for (const setting of settingsToUpdate) {
        const { error } = await supabase
          .from('restaurant_settings')
          .update({ setting_value: setting.value })
          .eq('setting_key', setting.key);
        
        if (error) throw error;
      }
      
      setShowSettings(false);
      await fetchSettings();
    } catch (error) {
      console.error('Error saving settings:', error);
      setError('Error saving settings');
    }
  };

  useEffect(() => {
    fetchData();
    fetchSettings();
  }, [fetchData, fetchSettings]);

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

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReservation) return;
    
    try {
      const { error } = await supabase
        .from('orders')
        .insert([{
          ...newOrder,
          reservation_id: selectedReservation.id
        }]);
      
      if (error) throw error;
      
      setShowOrderModal(false);
      setNewOrder({
        item_name: '',
        item_type: 'food',
        quantity: 1,
        price: 0
      });
      await fetchOrders(selectedReservation.id);
    } catch (error) {
      console.error('Error creating order:', error);
    }
  };

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
    <div className="container">
      <div className="card">
        <div className="card-header">
          <h1 className="card-title">Eigenaar Dashboard</h1>
          <div className="flex gap-4" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
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
            <button 
              className="btn btn-secondary"
              onClick={() => setShowSettings(true)}
            >
              <Settings size={20} style={{ marginRight: '8px' }} />
              Instellingen
            </button>
          </div>
        </div>

        {error && <div className="error">{error}</div>}

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
                      transition: 'transform 0.2s ease'
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
                    <h4>Bestellingen</h4>
                    <button 
                      className="btn btn-primary btn-sm"
                      onClick={() => setShowOrderModal(true)}
                    >
                      <Plus size={16} style={{ marginRight: '4px' }} />
                      Bestelling Toevoegen
                    </button>
                  </div>
                  
                  {orders.length === 0 ? (
                    <p className="text-muted">Nog geen bestellingen</p>
                  ) : (
                    <div className="orders-list">
                      {orders.map(order => (
                        <div key={order.id} className="order-item">
                          <div>
                            <strong>{order.item_name}</strong>
                            <span className="text-muted"> ({order.item_type === 'food' ? 'eten' : order.item_type === 'drink' ? 'drank' : 'dessert'})</span>
                          </div>
                          <div>
                            <span>Aantal: {order.quantity}</span>
                            <span className="text-muted"> | €{order.price.toFixed(2)}</span>
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
      </div>

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

        {/* Create Order Modal */}
        {showOrderModal && selectedReservation && (
          <div className="modal-overlay">
            <div className="modal">
              <h3>Bestelling Toevoegen voor {selectedReservation.customer_name}</h3>
            <form onSubmit={handleCreateOrder}>
              <div className="form-group">
                <label className="form-label">Item Naam</label>
                <input
                  type="text"
                  value={newOrder.item_name}
                  onChange={(e) => setNewOrder(prev => ({ ...prev, item_name: e.target.value }))}
                  className="form-input"
                  required
                />
              </div>

              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">Item Type</label>
                  <select
                    value={newOrder.item_type}
                    onChange={(e) => setNewOrder(prev => ({ ...prev, item_type: e.target.value }))}
                    className="form-input"
                  >
                    <option value="food">Eten</option>
                    <option value="drink">Drank</option>
                    <option value="dessert">Dessert</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Aantal</label>
                  <input
                    type="number"
                    min="1"
                    value={newOrder.quantity}
                    onChange={(e) => setNewOrder(prev => ({ ...prev, quantity: parseInt(e.target.value) }))}
                    className="form-input"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Prijs</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={newOrder.price}
                  onChange={(e) => setNewOrder(prev => ({ ...prev, price: parseFloat(e.target.value) }))}
                  className="form-input"
                  required
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowOrderModal(false)}>
                  Annuleren
                </button>
                <button type="submit" className="btn btn-primary">
                  Bestelling Toevoegen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <h2 className="modal-title">
                <Settings size={24} style={{ marginRight: '8px' }} />
                Restaurant Instellingen
              </h2>
              <button 
                className="btn btn-icon" 
                onClick={() => setShowSettings(false)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              {/* Opening Hours Section */}
              <div className="card mb-20">
                <h3 className="card-title">Openingstijden</h3>
                <div className="grid grid-1">
                  {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(day => {
                    const dayNames = {
                      monday: 'Maandag',
                      tuesday: 'Dinsdag', 
                      wednesday: 'Woensdag',
                      thursday: 'Donderdag',
                      friday: 'Vrijdag',
                      saturday: 'Zaterdag',
                      sunday: 'Zondag'
                    };
                    const hours = openingHours[day] || { open: '17:00', close: '23:00', closed: false };
                    
                    return (
                      <div key={day} className="form-group">
                        <div className="flex" style={{ alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                          <div style={{ minWidth: '100px' }}>
                            <label className="form-label">{dayNames[day as keyof typeof dayNames]}</label>
                          </div>
                          <div className="flex" style={{ alignItems: 'center', gap: '0.5rem' }}>
                            <input
                              type="checkbox"
                              checked={!hours.closed}
                              onChange={(e) => {
                                setOpeningHours(prev => ({
                                  ...prev,
                                  [day]: { ...hours, closed: !e.target.checked }
                                }));
                              }}
                            />
                            <span>Open</span>
                          </div>
                          {!hours.closed && (
                            <>
                              <input
                                type="time"
                                value={hours.open}
                                onChange={(e) => {
                                  setOpeningHours(prev => ({
                                    ...prev,
                                    [day]: { ...hours, open: e.target.value }
                                  }));
                                }}
                                className="form-input"
                                style={{ width: '120px' }}
                              />
                              <span>tot</span>
                              <input
                                type="time"
                                value={hours.close}
                                onChange={(e) => {
                                  setOpeningHours(prev => ({
                                    ...prev,
                                    [day]: { ...hours, close: e.target.value }
                                  }));
                                }}
                                className="form-input"
                                style={{ width: '120px' }}
                              />
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Reservation Settings Section */}
              <div className="card mb-20">
                <h3 className="card-title">Reserveringsinstellingen</h3>
                <div className="grid grid-2">
                  <div className="form-group">
                    <label className="form-label">Standaard Reserveringsduur (uren)</label>
                    <input
                      type="number"
                      min="1"
                      max="8"
                      value={defaultDuration}
                      onChange={(e) => setDefaultDuration(parseInt(e.target.value))}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Bufferperiode (minuten)</label>
                    <input
                      type="number"
                      min="0"
                      max="60"
                      value={defaultBuffer}
                      onChange={(e) => setDefaultBuffer(parseInt(e.target.value))}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Maximaal vooruit reserveren (dagen)</label>
                    <input
                      type="number"
                      min="1"
                      max="365"
                      value={maxAdvanceDays}
                      onChange={(e) => setMaxAdvanceDays(parseInt(e.target.value))}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Minimaal vooruit reserveren (uren)</label>
                    <input
                      type="number"
                      min="0"
                      max="168"
                      value={minAdvanceHours}
                      onChange={(e) => setMinAdvanceHours(parseInt(e.target.value))}
                      className="form-input"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-actions">
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => setShowSettings(false)}
              >
                Annuleren
              </button>
              <button 
                type="button" 
                className="btn btn-primary" 
                onClick={saveSettings}
              >
                <Save size={20} style={{ marginRight: '8px' }} />
                Instellingen Opslaan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OwnerDashboard;
