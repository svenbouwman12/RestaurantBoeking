import React, { useState, useEffect, useCallback } from 'react';
import { 
  Utensils, Plus, Edit, Trash2, X, Clock, Leaf, Flame, 
  Eye, EyeOff, Search, Filter 
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image_url?: string;
  is_vegetarian: boolean;
  is_spicy: boolean;
  prep_time_minutes: number;
  allergens: string[];
  is_available: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

const MenuManagement: React.FC = () => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  
  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: 0,
    category: 'Voorgerechten',
    image_url: '',
    is_vegetarian: false,
    is_spicy: false,
    prep_time_minutes: 15,
    allergens: [] as string[],
    is_available: true,
    sort_order: 0
  });
  
  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [availabilityFilter, setAvailabilityFilter] = useState('all');
  
  // Allergen options
  const allergenOptions = [
    'gluten', 'melk', 'eieren', 'noten', 'sesam', 'soja', 'vis', 'schaaldieren', 
    'sulfieten', 'mosterd', 'selderij', 'lupine'
  ];
  
  // Category options
  const categories = [
    'Voorgerechten', 'Hoofdgerechten', 'Desserts', 'Dranken', 'Specials'
  ];

  const fetchMenuItems = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .order('category', { ascending: true })
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      setMenuItems(data || []);
    } catch (error: any) {
      console.error('Error fetching menu items:', error);
      setError('Fout bij het laden van menu items');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMenuItems();
  }, [fetchMenuItems]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else if (name === 'price') {
      setFormData(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
    } else if (name === 'prep_time_minutes' || name === 'sort_order') {
      setFormData(prev => ({ ...prev, [name]: parseInt(value) || 0 }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleAllergenChange = (allergen: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      allergens: checked 
        ? [...prev.allergens, allergen]
        : prev.allergens.filter(a => a !== allergen)
    }));
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: 0,
      category: 'Voorgerechten',
      image_url: '',
      is_vegetarian: false,
      is_spicy: false,
      prep_time_minutes: 15,
      allergens: [],
      is_available: true,
      sort_order: 0
    });
    setEditingItem(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (editingItem) {
        // Update existing item
        const { error } = await supabase
          .from('menu_items')
          .update(formData)
          .eq('id', editingItem.id);

        if (error) throw error;
        setSuccess('Menu item succesvol bijgewerkt!');
      } else {
        // Create new item
        const { error } = await supabase
          .from('menu_items')
          .insert([formData]);

        if (error) throw error;
        setSuccess('Menu item succesvol toegevoegd!');
      }

      await fetchMenuItems();
      resetForm();
    } catch (error: any) {
      console.error('Error saving menu item:', error);
      setError(error.message || 'Fout bij het opslaan van menu item');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item: MenuItem) => {
    setFormData({
      name: item.name,
      description: item.description,
      price: item.price,
      category: item.category,
      image_url: item.image_url || '',
      is_vegetarian: item.is_vegetarian,
      is_spicy: item.is_spicy,
      prep_time_minutes: item.prep_time_minutes,
      allergens: item.allergens,
      is_available: item.is_available,
      sort_order: item.sort_order
    });
    setEditingItem(item);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Weet je zeker dat je dit menu item wilt verwijderen?')) {
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('menu_items')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setSuccess('Menu item succesvol verwijderd!');
      await fetchMenuItems();
    } catch (error: any) {
      console.error('Error deleting menu item:', error);
      setError(error.message || 'Fout bij het verwijderen van menu item');
    } finally {
      setLoading(false);
    }
  };

  const toggleAvailability = async (item: MenuItem) => {
    try {
      const { error } = await supabase
        .from('menu_items')
        .update({ is_available: !item.is_available })
        .eq('id', item.id);

      if (error) throw error;
      await fetchMenuItems();
    } catch (error: any) {
      console.error('Error toggling availability:', error);
      setError(error.message || 'Fout bij het wijzigen van beschikbaarheid');
    }
  };

  // Filter menu items
  const filteredItems = menuItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
    const matchesAvailability = availabilityFilter === 'all' || 
                               (availabilityFilter === 'available' && item.is_available) ||
                               (availabilityFilter === 'unavailable' && !item.is_available);
    
    return matchesSearch && matchesCategory && matchesAvailability;
  });

  const formatPrice = (price: number): string => {
    return `€${price.toFixed(2)}`;
  };

  if (loading && menuItems.length === 0) {
    return (
      <div className="container">
        <div className="card text-center">
          <div className="loading">Menu items laden...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="card">
        <div className="card-header">
          <div className="flex" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
            <button className="btn btn-icon" onClick={() => window.history.back()}>
              ←
            </button>
            <h1 className="card-title">
              <Utensils size={24} style={{ marginRight: '12px', verticalAlign: 'middle' }} />
              Menu Beheer
            </h1>
            <button 
              className="btn btn-primary"
              onClick={() => setShowForm(true)}
            >
              <Plus size={20} style={{ marginRight: '8px' }} />
              Nieuw Item
            </button>
          </div>
        </div>

        {error && <div className="error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        {/* Filters */}
        <div className="menu-filters" style={{ marginBottom: '2rem' }}>
          <div className="grid grid-3" style={{ gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">
                <Search size={16} style={{ marginRight: '8px' }} />
                Zoeken
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="form-input"
                placeholder="Zoek op naam of beschrijving..."
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">
                <Filter size={16} style={{ marginRight: '8px' }} />
                Categorie
              </label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="form-input"
              >
                <option value="all">Alle categorieën</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            
            <div className="form-group">
              <label className="form-label">Beschikbaarheid</label>
              <select
                value={availabilityFilter}
                onChange={(e) => setAvailabilityFilter(e.target.value)}
                className="form-input"
              >
                <option value="all">Alle items</option>
                <option value="available">Beschikbaar</option>
                <option value="unavailable">Niet beschikbaar</option>
              </select>
            </div>
          </div>
        </div>

        {/* Menu Items List */}
        <div className="menu-items-admin">
          {filteredItems.length === 0 ? (
            <div className="text-center" style={{ padding: '3rem 0' }}>
              <Utensils size={48} style={{ marginBottom: '1rem', opacity: 0.3 }} />
              <p style={{ color: 'var(--neutral-500)' }}>
                {searchTerm || categoryFilter !== 'all' || availabilityFilter !== 'all' 
                  ? 'Geen menu items gevonden met de huidige filters.'
                  : 'Nog geen menu items toegevoegd. Voeg je eerste item toe om te beginnen.'
                }
              </p>
            </div>
          ) : (
            <div className="grid grid-1" style={{ gap: '1rem' }}>
              {filteredItems.map(item => (
                <div key={item.id} className={`menu-item-admin ${!item.is_available ? 'unavailable' : ''}`}>
                  <div className="menu-item-content">
                    <div className="menu-item-header">
                      <div className="menu-item-info">
                        <h4 className="menu-item-name">{item.name}</h4>
                        <div className="menu-item-meta">
                          <span className="category-badge">{item.category}</span>
                          <span className="price">{formatPrice(item.price)}</span>
                        </div>
                      </div>
                      
                      <div className="menu-item-actions">
                        <button
                          className="btn btn-icon"
                          onClick={() => toggleAvailability(item)}
                          title={item.is_available ? 'Markeer als niet beschikbaar' : 'Markeer als beschikbaar'}
                        >
                          {item.is_available ? <Eye size={16} /> : <EyeOff size={16} />}
                        </button>
                        <button
                          className="btn btn-icon"
                          onClick={() => handleEdit(item)}
                          title="Bewerken"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          className="btn btn-icon btn-danger"
                          onClick={() => handleDelete(item.id)}
                          title="Verwijderen"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    
                    <p className="menu-item-description">{item.description}</p>
                    
                    <div className="menu-item-details">
                      <div className="menu-item-badges">
                        {item.is_vegetarian && (
                          <span className="badge badge-vegetarian">
                            <Leaf size={12} style={{ marginRight: '4px' }} />
                            Vegetarisch
                          </span>
                        )}
                        {item.is_spicy && (
                          <span className="badge badge-spicy">
                            <Flame size={12} style={{ marginRight: '4px' }} />
                            Pittig
                          </span>
                        )}
                        <span className="prep-time">
                          <Clock size={12} style={{ marginRight: '4px' }} />
                          {item.prep_time_minutes} min
                        </span>
                      </div>
                      
                      {item.allergens.length > 0 && (
                        <div className="allergens">
                          <strong>Allergenen:</strong> {item.allergens.join(', ')}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add/Edit Form Modal */}
        {showForm && (
          <div className="modal-overlay" onClick={resetForm}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>{editingItem ? 'Menu Item Bewerken' : 'Nieuw Menu Item'}</h3>
                <button className="btn btn-icon" onClick={resetForm}>
                  <X size={20} />
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="modal-body">
                <div className="grid grid-2" style={{ gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Naam *</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="form-input"
                      required
                      placeholder="Bijv. Hummus met Pita"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">Categorie *</label>
                    <select
                      name="category"
                      value={formData.category}
                      onChange={handleInputChange}
                      className="form-input"
                      required
                    >
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div className="form-group">
                  <label className="form-label">Beschrijving *</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    className="form-textarea"
                    required
                    rows={3}
                    placeholder="Beschrijf het gerecht..."
                  />
                </div>
                
                <div className="grid grid-3" style={{ gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Prijs (€) *</label>
                    <input
                      type="number"
                      name="price"
                      value={formData.price}
                      onChange={handleInputChange}
                      className="form-input"
                      required
                      min="0"
                      step="0.01"
                      placeholder="8.50"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">Bereidingstijd (min)</label>
                    <input
                      type="number"
                      name="prep_time_minutes"
                      value={formData.prep_time_minutes}
                      onChange={handleInputChange}
                      className="form-input"
                      min="1"
                      placeholder="15"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">Sorteer volgorde</label>
                    <input
                      type="number"
                      name="sort_order"
                      value={formData.sort_order}
                      onChange={handleInputChange}
                      className="form-input"
                      min="0"
                      placeholder="0"
                    />
                  </div>
                </div>
                
                <div className="form-group">
                  <label className="form-label">Afbeelding URL</label>
                  <input
                    type="url"
                    name="image_url"
                    value={formData.image_url}
                    onChange={handleInputChange}
                    className="form-input"
                    placeholder="https://example.com/image.jpg"
                  />
                </div>
                
                <div className="grid grid-2" style={{ gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Eigenschappen</label>
                    <div className="checkbox-group">
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          name="is_vegetarian"
                          checked={formData.is_vegetarian}
                          onChange={handleInputChange}
                        />
                        <span>Vegetarisch</span>
                      </label>
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          name="is_spicy"
                          checked={formData.is_spicy}
                          onChange={handleInputChange}
                        />
                        <span>Pittig</span>
                      </label>
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          name="is_available"
                          checked={formData.is_available}
                          onChange={handleInputChange}
                        />
                        <span>Beschikbaar</span>
                      </label>
                    </div>
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">Allergenen</label>
                    <div className="allergen-grid">
                      {allergenOptions.map(allergen => (
                        <label key={allergen} className="checkbox-label">
                          <input
                            type="checkbox"
                            checked={formData.allergens.includes(allergen)}
                            onChange={(e) => handleAllergenChange(allergen, e.target.checked)}
                          />
                          <span>{allergen}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="modal-actions">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={resetForm}
                  >
                    Annuleren
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={loading}
                  >
                    {loading ? 'Opslaan...' : (editingItem ? 'Bijwerken' : 'Toevoegen')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MenuManagement;
