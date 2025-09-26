import React, { useState, useEffect, useCallback } from 'react';
import { 
  Settings as SettingsIcon,
  Save,
  ArrowLeft,
  Clock,
  Calendar,
  Users,
  Building
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

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

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
              <h3 className="card-title">
                <Users size={20} style={{ marginRight: '8px' }} />
                Tafel Beheer
              </h3>
            </div>
            <div className="card-body">
              <p className="text-muted">
                Tafel beheer wordt uitgevoerd via het hoofd dashboard. 
                Ga terug naar het dashboard om tafels toe te voegen, te bewerken of te verwijderen.
              </p>
              <button 
                className="btn btn-secondary"
                onClick={onBack}
              >
                <ArrowLeft size={16} style={{ marginRight: '8px' }} />
                Ga naar Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
