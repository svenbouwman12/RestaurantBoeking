import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Phone, Users, Clock, Search, Plus, Minus, Check, X, ArrowLeft, ShoppingCart } from 'lucide-react';

interface Table {
  id: string;
  name: string;
  capacity: number;
  status: 'available' | 'occupied' | 'reserved';
}

interface Reservation {
  id: string;
  customer_name: string;
  customer_phone: string;
  guests: number;
  date: string;
  time: string;
  status: string;
  table_id: string;
  created_at: string;
}

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  allergens: string[];
}

interface OrderItem {
  menu_item: MenuItem;
  quantity: number;
  notes?: string;
}

interface PhoneOrdersProps {
  onBack: () => void;
}

const PhoneOrders: React.FC<PhoneOrdersProps> = ({ onBack }) => {
  const [tables, setTables] = useState<Table[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [currentReservation, setCurrentReservation] = useState<Reservation | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState<string>('');
  const [showMenu, setShowMenu] = useState(false);

  // PIN verification
  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Simple PIN verification - in production, this should be more secure
    if (pin === '1234') {
      setIsAuthenticated(true);
      setPinError('');
    } else {
      setPinError('Onjuiste PIN code');
    }
  };

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch tables
      const { data: tablesData, error: tablesError } = await supabase
        .from('tables')
        .select('*')
        .order('name');
      
      if (tablesError) throw tablesError;
      setTables(tablesData || []);

      // Fetch today's reservations
      const today = new Date().toISOString().split('T')[0];
      const { data: reservationsData, error: reservationsError } = await supabase
        .from('reservations')
        .select('*')
        .eq('date', today)
        .in('status', ['confirmed', 'seated']);
      
      if (reservationsError) throw reservationsError;
      setReservations(reservationsData || []);

      // Fetch menu items
      const { data: menuData, error: menuError } = await supabase
        .from('menu_items')
        .select('*')
        .order('category, name');
      
      if (menuError) throw menuError;
      setMenuItems(menuData || []);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Er is een fout opgetreden');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Get table status
  const getTableStatus = (tableId: string): 'available' | 'occupied' | 'reserved' => {
    const reservation = reservations.find(r => r.table_id === tableId);
    if (!reservation) return 'available';
    
    const now = new Date();
    const reservationTime = new Date(`${reservation.date}T${reservation.time}`);
    const endTime = new Date(reservationTime.getTime() + (2 * 60 * 60 * 1000)); // 2 hours
    
    if (now >= reservationTime && now <= endTime) {
      return reservation.status === 'seated' ? 'occupied' : 'reserved';
    }
    
    return 'available';
  };

  // Get reservation for table
  const getReservationForTable = (tableId: string): Reservation | null => {
    return reservations.find(r => r.table_id === tableId) || null;
  };

  // Handle table selection
  const handleTableSelect = (table: Table) => {
    setSelectedTable(table);
    setCurrentReservation(getReservationForTable(table.id));
    setOrderItems([]);
    setError('');
    setSuccess('');
    setShowMenu(true);
  };

  // Handle menu item add
  const handleAddMenuItem = (menuItem: MenuItem) => {
    setOrderItems(prev => {
      const existing = prev.find(item => item.menu_item.id === menuItem.id);
      if (existing) {
        return prev.map(item =>
          item.menu_item.id === menuItem.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        return [...prev, { menu_item: menuItem, quantity: 1, notes: '' }];
      }
    });
  };

  // Handle quantity change
  const handleQuantityChange = (menuItemId: string, quantity: number) => {
    if (quantity <= 0) {
      setOrderItems(prev => prev.filter(item => item.menu_item.id !== menuItemId));
    } else {
      setOrderItems(prev =>
        prev.map(item =>
          item.menu_item.id === menuItemId
            ? { ...item, quantity }
            : item
        )
      );
    }
  };

  // Handle notes change
  const handleNotesChange = (menuItemId: string, notes: string) => {
    setOrderItems(prev =>
      prev.map(item =>
        item.menu_item.id === menuItemId
          ? { ...item, notes }
          : item
      )
    );
  };

  // Calculate total
  const calculateTotal = () => {
    return orderItems.reduce((total, item) => total + (item.menu_item.price * item.quantity), 0);
  };

  // Handle back to table selection
  const handleBackToTables = () => {
    setShowMenu(false);
    setSelectedTable(null);
    setCurrentReservation(null);
    setOrderItems([]);
    setError('');
    setSuccess('');
  };

  // Handle order confirmation
  const handleConfirmOrder = async () => {
    if (!selectedTable || !currentReservation || orderItems.length === 0) return;

    try {
      setLoading(true);
      
      // Create order
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          reservation_id: currentReservation.id,
          table_id: selectedTable.id,
          status: 'pending',
          total_amount: calculateTotal(),
          items: orderItems.map(item => ({
            menu_item_id: item.menu_item.id,
            quantity: item.quantity,
            notes: item.notes || null,
            price: item.menu_item.price
          }))
        })
        .select()
        .single();

      if (orderError) throw orderError;

      setSuccess(`Bestelling succesvol opgenomen! Order #${orderData.id}`);
      setOrderItems([]);
      
      // Refresh data
      await fetchData();
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Er is een fout opgetreden bij het opnemen van de bestelling');
    } finally {
      setLoading(false);
    }
  };

  // Filter menu items
  const filteredMenuItems = menuItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Get unique categories
  const categories = ['all', ...Array.from(new Set(menuItems.map(item => item.category)))];

  // Show PIN verification if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="phone-orders-container">
        <div className="phone-orders-header">
          <button className="btn btn-secondary" onClick={onBack}>
            <ArrowLeft size={20} style={{ marginRight: '8px' }} />
            Terug naar Dashboard
          </button>
          <h1 className="phone-orders-title">
            <Phone size={24} style={{ marginRight: '12px' }} />
            Telefoon Bestellingen
          </h1>
        </div>

        <div className="card" style={{ maxWidth: '400px', margin: '2rem auto' }}>
          <div className="card-header">
            <h2 className="card-title">Toegang Vereist</h2>
            <p className="text-muted">Voer de PIN code in om toegang te krijgen tot de telefoon bestellingen interface</p>
          </div>
          
          <form onSubmit={handlePinSubmit}>
            <div className="form-group">
              <label className="form-label">PIN Code</label>
              <input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="form-input"
                placeholder="Voer PIN code in"
                maxLength={4}
                style={{ textAlign: 'center', fontSize: '1.2rem', letterSpacing: '0.5rem' }}
                required
              />
              {pinError && <div className="error" style={{ marginTop: '0.5rem' }}>{pinError}</div>}
            </div>
            
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
              Toegang Verkrijgen
            </button>
          </form>
          
          <div style={{ marginTop: '1rem', padding: '1rem', background: '#f8f9fa', borderRadius: '8px', fontSize: '0.9rem', color: '#6c757d' }}>
            <strong>Demo PIN:</strong> 1234
          </div>
        </div>
      </div>
    );
  }

  if (loading && tables.length === 0) {
    return (
      <div className="loading-container">
        <div className="loading">Gegevens laden...</div>
      </div>
    );
  }

  return (
    <div className="phone-orders-container">
      <div className="phone-orders-header">
        <button className="btn btn-secondary" onClick={onBack}>
          <ArrowLeft size={20} style={{ marginRight: '8px' }} />
          Terug naar Dashboard
        </button>
        <h1 className="phone-orders-title">
          <Phone size={24} style={{ marginRight: '12px' }} />
          Bestelling Opnemen
        </h1>
      </div>

      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}

      {!showMenu ? (
        /* Tables Overview */
        <div className="tables-section-centered">
          <h2>Kies een Tafel</h2>
          <div className="tables-grid-centered">
            {tables.map(table => {
              const status = getTableStatus(table.id);
              const reservation = getReservationForTable(table.id);
              
              return (
                <div
                  key={table.id}
                  className={`table-card-centered ${status}`}
                  onClick={() => handleTableSelect(table)}
                >
                  <div className="table-header">
                    <h3>{table.name}</h3>
                    <div className={`status-badge ${status}`}>
                      {status === 'available' && 'Vrij'}
                      {status === 'reserved' && 'Gereserveerd'}
                      {status === 'occupied' && 'Bezet'}
                    </div>
                  </div>
                  
                  {reservation && (
                    <div className="reservation-info">
                      <div className="reservation-detail">
                        <Users size={16} />
                        <span>{reservation.customer_name}</span>
                      </div>
                      <div className="reservation-detail">
                        <Clock size={16} />
                        <span>{reservation.time}</span>
                      </div>
                      <div className="reservation-detail">
                        <span>{reservation.guests} personen</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Menu Interface */
        <div className="menu-interface-centered">
          <div className="menu-header">
            <button className="btn btn-secondary" onClick={handleBackToTables}>
              <ArrowLeft size={20} style={{ marginRight: '8px' }} />
              Terug naar Tafels
            </button>
            <div className="table-info">
              <h2>{selectedTable?.name}</h2>
              {currentReservation && (
                <p>{currentReservation.customer_name} - {currentReservation.guests} personen</p>
              )}
            </div>
          </div>

          <div className="menu-content">
            {/* Menu Search */}
            <div className="menu-search">
              <div className="search-bar">
                <Search size={20} />
                <input
                  type="text"
                  placeholder="Zoek menu items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <div className="category-filter">
                {categories.map(category => (
                  <button
                    key={category}
                    className={`category-btn ${selectedCategory === category ? 'active' : ''}`}
                    onClick={() => setSelectedCategory(category)}
                  >
                    {category === 'all' ? 'Alle' : category}
                  </button>
                ))}
              </div>
            </div>

            {/* Menu Items */}
            <div className="menu-items-grid">
              {filteredMenuItems.map(item => (
                <div key={item.id} className="menu-item-card">
                  <div className="menu-item-info">
                    <h4>{item.name}</h4>
                    <p>{item.description}</p>
                    <div className="menu-item-meta">
                      <span className="price">€{item.price.toFixed(2)}</span>
                      {item.allergens.length > 0 && (
                        <span className="allergens">
                          {item.allergens.join(', ')}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => handleAddMenuItem(item)}
                  >
                    <Plus size={16} />
                  </button>
                </div>
              ))}
            </div>

            {/* Order Items */}
            {orderItems.length > 0 && (
              <div className="order-items-section">
                <h3>Bestelling</h3>
                {orderItems.map(item => (
                  <div key={item.menu_item.id} className="order-item">
                    <div className="order-item-info">
                      <h4>{item.menu_item.name}</h4>
                      <p>€{item.menu_item.price.toFixed(2)} per stuk</p>
                      <textarea
                        placeholder="Opmerkingen..."
                        value={item.notes}
                        onChange={(e) => handleNotesChange(item.menu_item.id, e.target.value)}
                        rows={2}
                      />
                    </div>
                    <div className="order-item-controls">
                      <div className="quantity-controls">
                        <button
                          onClick={() => handleQuantityChange(item.menu_item.id, item.quantity - 1)}
                        >
                          <Minus size={16} />
                        </button>
                        <span>{item.quantity}</span>
                        <button
                          onClick={() => handleQuantityChange(item.menu_item.id, item.quantity + 1)}
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                      <div className="item-total">
                        €{(item.menu_item.price * item.quantity).toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))}
                
                <div className="order-total">
                  <h3>Totaal: €{calculateTotal().toFixed(2)}</h3>
                  <button
                    className="btn btn-primary btn-lg"
                    onClick={handleConfirmOrder}
                    disabled={loading}
                  >
                    <Check size={20} style={{ marginRight: '8px' }} />
                    Bestelling Bevestigen
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PhoneOrders;
