import React, { useState, useEffect, useCallback } from 'react';
import { Utensils, Clock, Leaf, Flame } from 'lucide-react';
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
}

interface MenuCategory {
  id: string;
  name: string;
  description: string;
  items: MenuItem[];
}

const Menu: React.FC = () => {
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    fetchMenu();
  }, [fetchMenu]);

  const fetchMenu = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch menu items from Supabase
      const { data: menuItems, error: itemsError } = await supabase
        .from('menu_items')
        .select('*')
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (itemsError) throw itemsError;

      // Group items by category
      const groupedCategories: { [key: string]: MenuItem[] } = {};
      menuItems?.forEach((item: MenuItem) => {
        if (!groupedCategories[item.category]) {
          groupedCategories[item.category] = [];
        }
        groupedCategories[item.category].push(item);
      });

      // Create category objects
      const categoryList: MenuCategory[] = Object.entries(groupedCategories).map(([categoryName, items]) => ({
        id: categoryName.toLowerCase().replace(/\s+/g, '-'),
        name: categoryName,
        description: getCategoryDescription(categoryName),
        items: items
      }));

      setCategories(categoryList);
    } catch (error: any) {
      console.error('Error fetching menu:', error);
      setError('Fout bij het laden van het menu');
    } finally {
      setLoading(false);
    }
  }, []);

  const getCategoryDescription = (categoryName: string): string => {
    const descriptions: { [key: string]: string } = {
      'Voorgerechten': 'Lekkere hapjes om je maaltijd mee te beginnen',
      'Hoofdgerechten': 'Heerlijke hoofdgerechten van onze chef-kok',
      'Desserts': 'Zoete afsluiters voor de perfecte maaltijd',
      'Dranken': 'Verfrissende dranken en wijnselectie',
      'Specials': 'Chef\'s specialiteiten van de dag'
    };
    return descriptions[categoryName] || 'Heerlijke gerechten uit onze keuken';
  };

  const formatPrice = (price: number): string => {
    return `€${price.toFixed(2)}`;
  };

  const filteredCategories = selectedCategory === 'all' 
    ? categories 
    : categories.filter(cat => cat.id === selectedCategory);

  if (loading) {
    return (
      <div className="container-narrow">
        <div className="card text-center">
          <div className="loading">Menu laden...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-narrow">
        <div className="card text-center">
          <div className="error">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-narrow">
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">
            <Utensils size={24} style={{ marginRight: '12px', verticalAlign: 'middle' }} />
            Ons Menu
          </h2>
          <p className="text-muted">Ontdek onze heerlijke gerechten, bereid met verse ingrediënten en veel liefde</p>
        </div>

        {/* Category Filter */}
        <div className="menu-categories">
          <button
            className={`category-btn ${selectedCategory === 'all' ? 'active' : ''}`}
            onClick={() => setSelectedCategory('all')}
          >
            Alle Gerechten
          </button>
          {categories.map(category => (
            <button
              key={category.id}
              className={`category-btn ${selectedCategory === category.id ? 'active' : ''}`}
              onClick={() => setSelectedCategory(category.id)}
            >
              {category.name}
            </button>
          ))}
        </div>

        {/* Menu Items */}
        <div className="menu-content">
          {filteredCategories.map(category => (
            <div key={category.id} className="menu-category">
              <div className="category-header">
                <h3 className="category-title">{category.name}</h3>
                <p className="category-description">{category.description}</p>
              </div>
              
              <div className="menu-items">
                {category.items.map(item => (
                  <div key={item.id} className="menu-item">
                    <div className="menu-item-content">
                      <div className="menu-item-header">
                        <h4 className="menu-item-name">{item.name}</h4>
                        <div className="menu-item-price">{formatPrice(item.price)}</div>
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
                        </div>
                        
                        <div className="menu-item-meta">
                          <span className="prep-time">
                            <Clock size={12} style={{ marginRight: '4px' }} />
                            {item.prep_time_minutes} min
                          </span>
                        </div>
                      </div>
                      
                      {item.allergens.length > 0 && (
                        <div className="allergens">
                          <strong>Allergenen:</strong> {item.allergens.join(', ')}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {filteredCategories.length === 0 && (
          <div className="text-center" style={{ padding: '3rem 0' }}>
            <Utensils size={48} style={{ marginBottom: '1rem', opacity: 0.3 }} />
            <p style={{ color: 'var(--neutral-500)' }}>Geen gerechten gevonden in deze categorie.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Menu;
