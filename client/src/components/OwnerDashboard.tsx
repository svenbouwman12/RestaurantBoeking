import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Utensils,
  Building
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { supabase } from '../lib/supabase';
import MenuManagement from './MenuManagement';
import TableManagement from './TableManagement';

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


const OwnerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
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

  // Show specific management views
  if (currentTab === 'menu') {
    return <MenuManagement onBack={() => setCurrentTab('dashboard')} />;
  }

  if (currentTab === 'tables') {
    return <TableManagement onBack={() => setCurrentTab('dashboard')} />;
  }

  return (
    <div className="container">
      <div className="card">
        <div className="card-header">
          <h1 className="card-title">Eigenaar Dashboard</h1>
          
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
              className="tab-btn"
              onClick={() => navigate('/settings')}
            >
              <Settings size={16} style={{ marginRight: '8px' }} />
              Instellingen
            </button>
          </div>
          
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

    </div>
  );
};

export default OwnerDashboard;
