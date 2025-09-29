import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Settings as SettingsIcon,
  Save,
  ArrowLeft,
  Clock,
  Calendar,
  Utensils,
  Building,
  Tag,
  AlertTriangle,
  Plus,
  X
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import MenuManagement from './MenuManagement';

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


const Settings: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  
  // Determine current view from URL
  const getCurrentViewFromUrl = (): 'settings' | 'categories' | 'allergens' | 'menu' => {
    const path = location.pathname;
    if (path === '/settings/categories') return 'categories';
    if (path === '/settings/allergens') return 'allergens';
    if (path === '/settings/menu') return 'menu';
    return 'settings';
  };
  
  const [currentView, setCurrentView] = useState<'settings' | 'categories' | 'allergens' | 'menu'>(getCurrentViewFromUrl());
  
  // Settings state
  const [openingHours, setOpeningHours] = useState<{[key: string]: OpeningHours}>({});
  const [defaultDuration, setDefaultDuration] = useState(2);
  const [defaultBuffer, setDefaultBuffer] = useState(15);
  const [maxAdvanceDays, setMaxAdvanceDays] = useState(30);
  const [minAdvanceHours, setMinAdvanceHours] = useState(2);
  const [restaurantName, setRestaurantName] = useState('Zaytun Restaurant');
  
  // Categories and allergens state
  const [categories, setCategories] = useState<string[]>([]);
  const [allergens, setAllergens] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [newAllergen, setNewAllergen] = useState('');
  
  // Table management state

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

  // Fetch categories and allergens
  const fetchCategoriesAndAllergens = useCallback(async () => {
    try {
      // Fetch unique categories from menu items
      const { data: menuData, error: menuError } = await supabase
        .from('menu_items')
        .select('category, allergens');
      
      if (menuError) throw menuError;
      
      // Extract unique categories
      const categorySet = new Set(menuData.map(item => item.category).filter(Boolean));
      const uniqueCategories = Array.from(categorySet);
      setCategories(uniqueCategories);
      
      // Extract unique allergens
      const allAllergens = menuData
        .flatMap(item => item.allergens || [])
        .filter(Boolean);
      const allergenSet = new Set(allAllergens);
      const uniqueAllergens = Array.from(allergenSet);
      setAllergens(uniqueAllergens);
    } catch (error) {
      console.error('Error fetching categories and allergens:', error);
      setError('Fout bij het laden van categorieën en allergenen');
    }
  }, []);

  // Add new category
  const addCategory = async () => {
    if (!newCategory.trim()) return;
    
    try {
      setCategories(prev => [...prev, newCategory.trim()]);
      setNewCategory('');
      setSuccess('Categorie toegevoegd!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error adding category:', error);
      setError('Fout bij het toevoegen van categorie');
    }
  };

  // Remove category
  const removeCategory = async (category: string) => {
    try {
      setCategories(prev => prev.filter(cat => cat !== category));
      setSuccess('Categorie verwijderd!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error removing category:', error);
      setError('Fout bij het verwijderen van categorie');
    }
  };

  // Add new allergen
  const addAllergen = async () => {
    if (!newAllergen.trim()) return;
    
    try {
      setAllergens(prev => [...prev, newAllergen.trim()]);
      setNewAllergen('');
      setSuccess('Allergeen toegevoegd!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error adding allergen:', error);
      setError('Fout bij het toevoegen van allergeen');
    }
  };

  // Remove allergen
  const removeAllergen = async (allergen: string) => {
    try {
      setAllergens(prev => prev.filter(all => all !== allergen));
      setSuccess('Allergeen verwijderd!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error removing allergen:', error);
      setError('Fout bij het verwijderen van allergeen');
    }
  };

  // Update currentView when URL changes
  useEffect(() => {
    setCurrentView(getCurrentViewFromUrl());
  }, [location.pathname]);

  useEffect(() => {
    fetchSettings();
    fetchCategoriesAndAllergens();
  }, [fetchSettings, fetchCategoriesAndAllergens]);

  const dayNames = {
    monday: 'Maandag',
    tuesday: 'Dinsdag', 
    wednesday: 'Woensdag',
    thursday: 'Donderdag',
    friday: 'Vrijdag',
    saturday: 'Zaterdag',
    sunday: 'Zondag'
  };

  // Show menu management if selected
  if (currentView === 'menu') {
    return <MenuManagement />;
  }

  return (
    <div className="container">
      <div className="card">
        <div className="card-header">
          <div className="flex" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
            <div className="flex" style={{ alignItems: 'center', gap: '1rem' }}>
              <button 
                className="btn btn-icon" 
                onClick={() => navigate('/owner')}
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

        {/* Tab Navigation */}
        <div className="tab-navigation">
          <button 
            className={`tab-button ${currentView === 'settings' ? 'active' : ''}`}
            onClick={() => navigate('/settings')}
          >
            <SettingsIcon size={16} style={{ marginRight: '8px' }} />
            Instellingen
          </button>
          <button 
            className={`tab-button ${currentView === 'categories' ? 'active' : ''}`}
            onClick={() => navigate('/settings/categories')}
          >
            <Tag size={16} style={{ marginRight: '8px' }} />
            Categorieën
          </button>
          <button 
            className={`tab-button ${currentView === 'allergens' ? 'active' : ''}`}
            onClick={() => navigate('/settings/allergens')}
          >
            <AlertTriangle size={16} style={{ marginRight: '8px' }} />
            Allergenen
          </button>
          <button 
            className={`tab-button ${currentView === 'menu' ? 'active' : ''}`}
            onClick={() => navigate('/settings/menu')}
          >
            <Utensils size={16} style={{ marginRight: '8px' }} />
            Menu Beheer
          </button>
        </div>

        <div className="card-body">
          {/* Settings Tab */}
          {currentView === 'settings' && (
            <>
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

                 {/* Menu Management */}
                 <div className="card mb-20">
                   <div className="card-header">
                     <div className="flex" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
                       <h3 className="card-title">
                         <Utensils size={20} style={{ marginRight: '8px' }} />
                         Menu Beheer
                       </h3>
                       <button
                         className="btn btn-primary"
                         onClick={() => setCurrentView('menu')}
                       >
                         <Utensils size={16} style={{ marginRight: '8px' }} />
                         Menu Items Beheren
                       </button>
                     </div>
                   </div>
                   <div className="card-body">
                     <p className="text-muted">
                       Beheer je menu items, prijzen, allergenen en beschikbaarheid. 
                       Voeg nieuwe gerechten toe, pas bestaande aan of verwijder items.
                     </p>
                   </div>
                 </div>
            </>
          )}

          {/* Categories Tab */}
          {currentView === 'categories' && (
            <div className="card mb-20">
              <div className="card-header">
                <h3 className="card-title">
                  <Tag size={20} style={{ marginRight: '8px' }} />
                  Menu Categorieën Beheer
                </h3>
              </div>
              <div className="card-body">
                <p className="text-muted mb-20">
                  Beheer de categorieën die gebruikt worden voor menu items. 
                  Categorieën worden automatisch opgehaald uit bestaande menu items.
                </p>

                {/* Add new category */}
                <div className="form-group mb-20">
                  <label className="form-label">Nieuwe categorie toevoegen</label>
                  <div className="flex" style={{ gap: '1rem', alignItems: 'flex-end' }}>
                    <div style={{ flex: 1 }}>
                      <input
                        type="text"
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        className="form-input"
                        placeholder="Bijv. Voorgerechten, Hoofdgerechten, Desserts"
                        onKeyPress={(e) => e.key === 'Enter' && addCategory()}
                      />
                    </div>
                    <button 
                      className="btn btn-primary"
                      onClick={addCategory}
                      disabled={!newCategory.trim()}
                    >
                      <Plus size={16} style={{ marginRight: '8px' }} />
                      Toevoegen
                    </button>
                  </div>
                </div>

                {/* Categories list */}
                <div className="form-group">
                  <label className="form-label">Bestaande categorieën</label>
                  {categories.length === 0 ? (
                    <p className="text-muted">Nog geen categorieën gevonden</p>
                  ) : (
                    <div className="categories-list">
                      {categories.map((category, index) => (
                        <div key={index} className="category-item">
                          <span className="category-name">{category}</span>
                          <button 
                            className="btn btn-sm btn-danger"
                            onClick={() => removeCategory(category)}
                            title="Categorie verwijderen"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Allergens Tab */}
          {currentView === 'allergens' && (
            <div className="card mb-20">
              <div className="card-header">
                <h3 className="card-title">
                  <AlertTriangle size={20} style={{ marginRight: '8px' }} />
                  Allergenen Beheer
                </h3>
              </div>
              <div className="card-body">
                <p className="text-muted mb-20">
                  Beheer de allergenen die gebruikt worden voor menu items. 
                  Allergenen worden automatisch opgehaald uit bestaande menu items.
                </p>

                {/* Add new allergen */}
                <div className="form-group mb-20">
                  <label className="form-label">Nieuw allergeen toevoegen</label>
                  <div className="flex" style={{ gap: '1rem', alignItems: 'flex-end' }}>
                    <div style={{ flex: 1 }}>
                      <input
                        type="text"
                        value={newAllergen}
                        onChange={(e) => setNewAllergen(e.target.value)}
                        className="form-input"
                        placeholder="Bijv. Gluten, Lactose, Noten, Eieren"
                        onKeyPress={(e) => e.key === 'Enter' && addAllergen()}
                      />
                    </div>
                    <button 
                      className="btn btn-primary"
                      onClick={addAllergen}
                      disabled={!newAllergen.trim()}
                    >
                      <Plus size={16} style={{ marginRight: '8px' }} />
                      Toevoegen
                    </button>
                  </div>
                </div>

                {/* Allergens list */}
                <div className="form-group">
                  <label className="form-label">Bestaande allergenen</label>
                  {allergens.length === 0 ? (
                    <p className="text-muted">Nog geen allergenen gevonden</p>
                  ) : (
                    <div className="allergens-list">
                      {allergens.map((allergen, index) => (
                        <div key={index} className="allergen-item">
                          <span className="allergen-name">{allergen}</span>
                          <button 
                            className="btn btn-sm btn-danger"
                            onClick={() => removeAllergen(allergen)}
                            title="Allergeen verwijderen"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Menu Management Tab */}
          {currentView === 'menu' && (
            <MenuManagement />
          )}

        </div>
      </div>
    </div>
  );
};

export default Settings;
