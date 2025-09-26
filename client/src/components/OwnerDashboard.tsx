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
  MessageSquare
} from 'lucide-react';
import axios from 'axios';
import { format, parseISO } from 'date-fns';

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
      const [tablesRes, reservationsRes] = await Promise.all([
        axios.get('/api/tables'),
        axios.get('/api/reservations', { params: { date: selectedDate } })
      ]);
      
      setTables(tablesRes.data);
      setReservations(reservationsRes.data);
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
      const response = await axios.get(`/api/reservations/${reservationId}/orders`);
      setOrders(response.data);
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
      await axios.patch(`/api/reservations/${reservationId}`, { status: newStatus });
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
      await axios.post('/api/reservations', newReservation);
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
      await axios.post('/api/orders', {
        ...newOrder,
        reservation_id: selectedReservation.id
      });
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
      await axios.delete(`/api/reservations/${reservationId}`);
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
          <h1 className="card-title">Owner Dashboard</h1>
          <div className="flex gap-2">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="form-input"
              style={{ width: 'auto' }}
            />
            <button 
              className="btn btn-primary"
              onClick={() => setShowReservationModal(true)}
            >
              <Plus size={20} style={{ marginRight: '8px' }} />
              Add Reservation
            </button>
          </div>
        </div>

        {error && <div className="error">{error}</div>}

        {/* Filters */}
        <div className="grid grid-2 mb-20">
          <div className="form-group">
            <label className="form-label">
              <Search size={20} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
              Search
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-input"
              placeholder="Search by customer name or table..."
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
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="arrived">Arrived</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        <div className="grid grid-2">
          {/* Table Layout */}
          <div className="card">
            <h3 className="card-title">Table Layout</h3>
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
                    <div>{table.seats} seats</div>
                    <div style={{ fontSize: '10px', textTransform: 'capitalize' }}>
                      {status}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="legend">
              <div className="legend-item">
                <div className="legend-color" style={{ backgroundColor: '#28a745' }}></div>
                <span>Available</span>
              </div>
              <div className="legend-item">
                <div className="legend-color" style={{ backgroundColor: '#ffc107' }}></div>
                <span>Reserved</span>
              </div>
              <div className="legend-item">
                <div className="legend-color" style={{ backgroundColor: '#dc3545' }}></div>
                <span>Occupied</span>
              </div>
            </div>
          </div>

          {/* Reservation Details */}
          <div className="card">
            <h3 className="card-title">Reservation Details</h3>
            {selectedReservation ? (
              <div>
                <div className="reservation-info">
                  <h4>{selectedReservation.customer_name}</h4>
                  <p><Users size={16} style={{ marginRight: '8px' }} />{selectedReservation.guests} guests</p>
                  <p><Calendar size={16} style={{ marginRight: '8px' }} />{format(parseISO(selectedReservation.date), 'MMM d, yyyy')}</p>
                  <p><Clock size={16} style={{ marginRight: '8px' }} />{selectedReservation.time}</p>
                  <p><Phone size={16} style={{ marginRight: '8px' }} />{selectedReservation.customer_phone || 'N/A'}</p>
                  <p><Mail size={16} style={{ marginRight: '8px' }} />{selectedReservation.customer_email || 'N/A'}</p>
                  {selectedReservation.notes && (
                    <p><MessageSquare size={16} style={{ marginRight: '8px' }} />{selectedReservation.notes}</p>
                  )}
                </div>

                <div className="status-controls">
                  <label className="form-label">Update Status:</label>
                  <select
                    value={selectedReservation.status}
                    onChange={(e) => handleStatusChange(selectedReservation.id, e.target.value)}
                    className="form-input"
                  >
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="arrived">Arrived</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                <div className="orders-section">
                  <div className="flex justify-between align-center">
                    <h4>Orders</h4>
                    <button 
                      className="btn btn-primary btn-sm"
                      onClick={() => setShowOrderModal(true)}
                    >
                      <Plus size={16} style={{ marginRight: '4px' }} />
                      Add Order
                    </button>
                  </div>
                  
                  {orders.length === 0 ? (
                    <p className="text-muted">No orders yet</p>
                  ) : (
                    <div className="orders-list">
                      {orders.map(order => (
                        <div key={order.id} className="order-item">
                          <div>
                            <strong>{order.item_name}</strong>
                            <span className="text-muted"> ({order.item_type})</span>
                          </div>
                          <div>
                            <span>Qty: {order.quantity}</span>
                            <span className="text-muted"> | ${order.price.toFixed(2)}</span>
                            <span className={`status-badge status-${order.status}`}>
                              {order.status}
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
                    Delete Reservation
                  </button>
                </div>
              </div>
            ) : selectedTable ? (
              <div>
                <h4>{selectedTable.name}</h4>
                <p>Seats: {selectedTable.seats}</p>
                <p className="text-success">Available</p>
                <button 
                  className="btn btn-primary"
                  onClick={() => {
                    setNewReservation(prev => ({ ...prev, table_id: selectedTable.id }));
                    setShowReservationModal(true);
                  }}
                >
                  <Plus size={16} style={{ marginRight: '8px' }} />
                  Create Reservation
                </button>
              </div>
            ) : (
              <p className="text-muted">Click on a table to view details</p>
            )}
          </div>
        </div>

        {/* Reservations List */}
        <div className="card mt-20">
          <h3 className="card-title">All Reservations ({filteredReservations.length})</h3>
          <div className="reservations-list">
            {filteredReservations.map(reservation => (
              <div key={reservation.id} className="reservation-item">
                <div className="reservation-main">
                  <h4>{reservation.customer_name}</h4>
                  <p>{reservation.tables.name} • {reservation.guests} guests</p>
                  <p>{format(parseISO(reservation.date), 'MMM d, yyyy')} at {reservation.time}</p>
                </div>
                <div className="reservation-status">
                  <span className={`status-badge status-${reservation.status}`}>
                    {reservation.status}
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
            <h3>Create New Reservation</h3>
            <form onSubmit={handleCreateReservation}>
              <div className="form-group">
                <label className="form-label">Table</label>
                <select
                  value={newReservation.table_id}
                  onChange={(e) => setNewReservation(prev => ({ ...prev, table_id: e.target.value }))}
                  className="form-input"
                  required
                >
                  <option value="">Select a table</option>
                  {tables.map(table => (
                    <option key={table.id} value={table.id}>
                      {table.name} ({table.seats} seats)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">Customer Name</label>
                  <input
                    type="text"
                    value={newReservation.customer_name}
                    onChange={(e) => setNewReservation(prev => ({ ...prev, customer_name: e.target.value }))}
                    className="form-input"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Guests</label>
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
                  <label className="form-label">Date</label>
                  <input
                    type="date"
                    value={newReservation.date}
                    onChange={(e) => setNewReservation(prev => ({ ...prev, date: e.target.value }))}
                    className="form-input"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Time</label>
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
                <label className="form-label">Email</label>
                <input
                  type="email"
                  value={newReservation.customer_email}
                  onChange={(e) => setNewReservation(prev => ({ ...prev, customer_email: e.target.value }))}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Phone</label>
                <input
                  type="tel"
                  value={newReservation.customer_phone}
                  onChange={(e) => setNewReservation(prev => ({ ...prev, customer_phone: e.target.value }))}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Notes</label>
                <textarea
                  value={newReservation.notes}
                  onChange={(e) => setNewReservation(prev => ({ ...prev, notes: e.target.value }))}
                  className="form-textarea"
                  rows={3}
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowReservationModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create Reservation
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
            <h3>Add Order for {selectedReservation.customer_name}</h3>
            <form onSubmit={handleCreateOrder}>
              <div className="form-group">
                <label className="form-label">Item Name</label>
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
                    <option value="food">Food</option>
                    <option value="drink">Drink</option>
                    <option value="dessert">Dessert</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Quantity</label>
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
                <label className="form-label">Price</label>
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
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Add Order
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
