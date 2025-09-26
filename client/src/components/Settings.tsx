import React, { useState, useEffect, useCallback } from 'react';
import { 
  Settings as SettingsIcon,
  Save,
  ArrowLeft,
  Clock,
  Calendar,
  Users,
  Building,
  Plus,
  Edit,
  Trash2,
  Check,
  X
} from 'lucide-react';
import { supabase } from '../lib/supabase';

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

interface Table {
  id: string;
  name: string;
  seats: number;
  position_x: number;
  position_y: number;
}

interface SettingsProps {
  onBack: () => void;
}

const Settings: React.FC<SettingsProps> = ({ onBack }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  
  // Settings state
  const [openingHours, setOpeningHours] = useState<{[key: string]: OpeningHours}>({});
  const [defaultDuration, setDefaultDuration] = useState(2);
  const [defaultBuffer, setDefaultBuffer] = useState(15);
  const [maxAdvanceDays, setMaxAdvanceDays] = useState(30);
  const [minAdvanceHours, setMinAdvanceHours] = useState(2);
  const [restaurantName, setRestaurantName] = useState('Zaytun Restaurant');
  
  // Table management state
  const [tables, setTables] = useState<Table[]>([]);
  const [showAddTable, setShowAddTable] = useState(false);
  const [editingTable, setEditingTable] = useState<Table | null>(null);
  const [newTable, setNewTable] = useState({
    name: '',
    seats: 2
  });

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('restaurant_settings')
        .select('*')
        .order('setting_key');
      
      if (error) throw error;
      
      // Parse settings
      data.forEach((setting: RestaurantSetting) => {
        if (setting.setting_key.startsWith('opening_hours_')) {
          const day = setting.setting_key.replace('opening_hours_', '');
          setOpeningHours(prev => ({
            ...prev,
            [day]: JSON.parse(setting.setting_value)
          }));
        } else if (setting.setting_key === 'restaurant_name') {
          setRestaurantName(setting.setting_value);
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
    } catch (error) {
      console.error('Error fetching settings:', error);
      setError('Fout bij het laden van instellingen');
    } finally {
      setLoading(false);
    }
  }, []);

  const saveSettings = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      // Save restaurant name
      await supabase
        .from('restaurant_settings')
        .update({ setting_value: restaurantName })
        .eq('setting_key', 'restaurant_name');
      
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
      
      setSuccess('Instellingen succesvol opgeslagen!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      setError('Fout bij het opslaan van instellingen');
    } finally {
      setLoading(false);
    }
  };

  const fetchTables = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('tables')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setTables(data);
    } catch (error) {
      console.error('Error fetching tables:', error);
      setError('Fout bij het laden van tafels');
    }
  }, []);

  const addTable = async () => {
    if (!newTable.name.trim() || newTable.seats < 1) {
      setError('Vul een geldige tafelnaam en aantal plaatsen in');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('tables')
        .insert([{
          name: newTable.name.trim(),
          seats: newTable.seats,
          position_x: 0,
          position_y: 0
        }])
        .select()
        .single();

      if (error) throw error;
      
      setTables(prev => [...prev, data]);
      setNewTable({ name: '', seats: 2 });
      setShowAddTable(false);
      setSuccess('Tafel succesvol toegevoegd!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error adding table:', error);
      setError('Fout bij het toevoegen van tafel');
    }
  };

  const updateTable = async (table: Table) => {
    if (!table.name.trim() || table.seats < 1) {
      setError('Vul een geldige tafelnaam en aantal plaatsen in');
      return;
    }

    try {
      const { error } = await supabase
        .from('tables')
        .update({
          name: table.name.trim(),
          seats: table.seats
        })
        .eq('id', table.id);

      if (error) throw error;
      
      setTables(prev => prev.map(t => t.id === table.id ? table : t));
      setEditingTable(null);
      setSuccess('Tafel succesvol bijgewerkt!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error updating table:', error);
      setError('Fout bij het bijwerken van tafel');
    }
  };

  const deleteTable = async (tableId: string) => {
    if (!window.confirm('Weet je zeker dat je deze tafel wilt verwijderen? Dit kan niet ongedaan worden gemaakt.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('tables')
        .delete()
        .eq('id', tableId);

      if (error) throw error;
      
      setTables(prev => prev.filter(t => t.id !== tableId));
      setSuccess('Tafel succesvol verwijderd!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error deleting table:', error);
      setError('Fout bij het verwijderen van tafel');
    }
  };

  useEffect(() => {
    fetchSettings();
    fetchTables();
  }, [fetchSettings, fetchTables]);

  const dayNames = {
    monday: 'Maandag',
    tuesday: 'Dinsdag', 
    wednesday: 'Woensdag',
    thursday: 'Donderdag',
    friday: 'Vrijdag',
    saturday: 'Zaterdag',
    sunday: 'Zondag'
  };

  return (
    <div className="container">
      <div className="card">
        <div className="card-header">
          <div className="flex" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
            <div className="flex" style={{ alignItems: 'center', gap: '1rem' }}>
              <button 
                className="btn btn-icon" 
                onClick={onBack}
                style={{ padding: '0.5rem' }}
              >
                <ArrowLeft size={20} />
              </button>
              <h1 className="card-title">
                <SettingsIcon size={24} style={{ marginRight: '8px' }} />
                Restaurant Instellingen
              </h1>
            </div>
            <button 
              className="btn btn-primary"
              onClick={saveSettings}
              disabled={loading}
            >
              <Save size={20} style={{ marginRight: '8px' }} />
              {loading ? 'Opslaan...' : 'Instellingen Opslaan'}
            </button>
          </div>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <div className="card-body">
          {/* Restaurant Information */}
          <div className="card mb-20">
            <div className="card-header">
              <h3 className="card-title">
                <Building size={20} style={{ marginRight: '8px' }} />
                Restaurant Informatie
              </h3>
            </div>
            <div className="card-body">
              <div className="form-group">
                <label className="form-label">Restaurant Naam</label>
                <input
                  type="text"
                  value={restaurantName}
                  onChange={(e) => setRestaurantName(e.target.value)}
                  className="form-input"
                  placeholder="Voer restaurant naam in"
                />
              </div>
            </div>
          </div>

          {/* Opening Hours */}
          <div className="card mb-20">
            <div className="card-header">
              <h3 className="card-title">
                <Clock size={20} style={{ marginRight: '8px' }} />
                Openingstijden
              </h3>
            </div>
            <div className="card-body">
              <div className="grid grid-1">
                {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(day => {
                  const hours = openingHours[day] || { open: '17:00', close: '23:00', closed: false };
                  
                  return (
                    <div key={day} className="form-group">
                      <div className="flex" style={{ alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                        <div style={{ minWidth: '120px' }}>
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
          </div>

          {/* Reservation Settings */}
          <div className="card mb-20">
            <div className="card-header">
              <h3 className="card-title">
                <Calendar size={20} style={{ marginRight: '8px' }} />
                Reserveringsinstellingen
              </h3>
            </div>
            <div className="card-body">
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
                  <small className="text-muted">Hoe lang duurt een standaard reservering</small>
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
                  <small className="text-muted">Tijd tussen reserveringen voor schoonmaak</small>
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
                  <small className="text-muted">Hoe ver vooruit kunnen klanten reserveren</small>
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
                  <small className="text-muted">Hoe kort van tevoren kunnen klanten nog reserveren</small>
                </div>
              </div>
            </div>
          </div>

          {/* Table Management */}
          <div className="card mb-20">
            <div className="card-header">
              <div className="flex" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 className="card-title">
                  <Users size={20} style={{ marginRight: '8px' }} />
                  Tafel Beheer
                </h3>
                <button 
                  className="btn btn-primary"
                  onClick={() => setShowAddTable(true)}
                >
                  <Plus size={16} style={{ marginRight: '8px' }} />
                  Tafel Toevoegen
                </button>
              </div>
            </div>
            <div className="card-body">
              {/* Add Table Form */}
              {showAddTable && (
                <div className="card mb-20" style={{ background: 'var(--neutral-50)', border: '2px solid var(--primary-color)' }}>
                  <div className="card-header">
                    <h4 className="card-title">Nieuwe Tafel Toevoegen</h4>
                  </div>
                  <div className="card-body">
                    <div className="grid grid-2">
                      <div className="form-group">
                        <label className="form-label">Tafel Naam *</label>
                        <input
                          type="text"
                          value={newTable.name}
                          onChange={(e) => setNewTable(prev => ({ ...prev, name: e.target.value }))}
                          className="form-input"
                          placeholder="Bijv. Tafel 1, Venster Tafel, etc."
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Aantal Plaatsen *</label>
                        <input
                          type="number"
                          min="1"
                          max="20"
                          value={newTable.seats}
                          onChange={(e) => setNewTable(prev => ({ ...prev, seats: parseInt(e.target.value) || 2 }))}
                          className="form-input"
                        />
                      </div>
                    </div>
                    <div className="flex" style={{ gap: '1rem', marginTop: '1rem' }}>
                      <button 
                        className="btn btn-primary"
                        onClick={addTable}
                      >
                        <Check size={16} style={{ marginRight: '8px' }} />
                        Tafel Toevoegen
                      </button>
                      <button 
                        className="btn btn-secondary"
                        onClick={() => {
                          setShowAddTable(false);
                          setNewTable({ name: '', seats: 2 });
                        }}
                      >
                        <X size={16} style={{ marginRight: '8px' }} />
                        Annuleren
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Tables List */}
              <div className="grid grid-1" style={{ gap: '1rem' }}>
                {tables.length === 0 ? (
                  <div className="text-center" style={{ padding: '2rem', color: 'var(--neutral-500)' }}>
                    <Users size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                    <p>Nog geen tafels toegevoegd. Voeg je eerste tafel toe om te beginnen.</p>
                  </div>
                ) : (
                  tables.map(table => (
                    <div key={table.id} className="card" style={{ 
                      background: 'white',
                      border: '2px solid var(--neutral-200)',
                      borderRadius: '12px',
                      padding: '1.5rem'
                    }}>
                      {editingTable?.id === table.id ? (
                        <div className="grid grid-2" style={{ gap: '1rem' }}>
                          <div className="form-group">
                            <label className="form-label">Tafel Naam</label>
                            <input
                              type="text"
                              value={editingTable.name}
                              onChange={(e) => setEditingTable(prev => prev ? { ...prev, name: e.target.value } : null)}
                              className="form-input"
                            />
                          </div>
                          <div className="form-group">
                            <label className="form-label">Aantal Plaatsen</label>
                            <input
                              type="number"
                              min="1"
                              max="20"
                              value={editingTable.seats}
                              onChange={(e) => setEditingTable(prev => prev ? { ...prev, seats: parseInt(e.target.value) || 2 } : null)}
                              className="form-input"
                            />
                          </div>
                          <div className="flex" style={{ gap: '0.5rem', gridColumn: '1 / -1' }}>
                            <button 
                              className="btn btn-primary"
                              onClick={() => editingTable && updateTable(editingTable)}
                            >
                              <Check size={14} style={{ marginRight: '4px' }} />
                              Opslaan
                            </button>
                            <button 
                              className="btn btn-secondary"
                              onClick={() => setEditingTable(null)}
                            >
                              <X size={14} style={{ marginRight: '4px' }} />
                              Annuleren
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
                          <div className="flex" style={{ alignItems: 'center', gap: '1rem' }}>
                            <div style={{ 
                              background: 'var(--primary-color)',
                              color: 'white',
                              width: '48px',
                              height: '48px',
                              borderRadius: '12px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '18px',
                              fontWeight: '700'
                            }}>
                              {table.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <h4 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: '600', color: 'var(--neutral-900)' }}>
                                {table.name}
                              </h4>
                              <p style={{ margin: '0', color: 'var(--neutral-600)', fontSize: '14px' }}>
                                {table.seats} {table.seats === 1 ? 'plaats' : 'plaatsen'}
                              </p>
                            </div>
                          </div>
                          <div className="flex" style={{ gap: '0.5rem' }}>
                            <button 
                              className="btn btn-secondary"
                              onClick={() => setEditingTable(table)}
                            >
                              <Edit size={14} />
                            </button>
                            <button 
                              className="btn btn-danger"
                              onClick={() => deleteTable(table.id)}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
