import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, Plus, Edit, Trash2, Check, X, Building
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Table {
  id: string;
  name: string;
  seats: number;
  created_at: string;
  updated_at: string;
}

interface TableManagementProps {
  onBack: () => void;
}

const TableManagement: React.FC<TableManagementProps> = ({ onBack }) => {
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  
  // Form state
  const [showAddTable, setShowAddTable] = useState(false);
  const [editingTable, setEditingTable] = useState<Table | null>(null);
  const [newTable, setNewTable] = useState({
    name: '',
    seats: 2
  });

  const fetchTables = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tables')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setTables(data || []);
    } catch (error: any) {
      console.error('Error fetching tables:', error);
      setError('Fout bij het laden van tafels');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTables();
  }, [fetchTables]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewTable(prev => ({
      ...prev,
      [name]: name === 'seats' ? parseInt(value) || 2 : value
    }));
  };

  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditingTable(prev => prev ? {
      ...prev,
      [name]: name === 'seats' ? parseInt(value) || 2 : value
    } : null);
  };

  const addTable = async () => {
    if (!newTable.name.trim()) {
      setError('Tafel naam is verplicht');
      return;
    }

    if (newTable.seats < 1 || newTable.seats > 20) {
      setError('Aantal plaatsen moet tussen 1 en 20 zijn');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('tables')
        .insert([newTable]);

      if (error) throw error;
      setSuccess('Tafel succesvol toegevoegd!');
      setNewTable({ name: '', seats: 2 });
      setShowAddTable(false);
      await fetchTables();
    } catch (error: any) {
      console.error('Error adding table:', error);
      setError(error.message || 'Fout bij het toevoegen van tafel');
    } finally {
      setLoading(false);
    }
  };

  const updateTable = async (table: Table) => {
    if (!table.name.trim()) {
      setError('Tafel naam is verplicht');
      return;
    }

    if (table.seats < 1 || table.seats > 20) {
      setError('Aantal plaatsen moet tussen 1 en 20 zijn');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('tables')
        .update({ name: table.name, seats: table.seats })
        .eq('id', table.id);

      if (error) throw error;
      setSuccess('Tafel succesvol bijgewerkt!');
      setEditingTable(null);
      await fetchTables();
    } catch (error: any) {
      console.error('Error updating table:', error);
      setError(error.message || 'Fout bij het bijwerken van tafel');
    } finally {
      setLoading(false);
    }
  };

  const deleteTable = async (tableId: string) => {
    if (!window.confirm('Weet je zeker dat je deze tafel wilt verwijderen? Dit kan niet ongedaan worden gemaakt.')) {
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('tables')
        .delete()
        .eq('id', tableId);

      if (error) throw error;
      setSuccess('Tafel succesvol verwijderd!');
      await fetchTables();
    } catch (error: any) {
      console.error('Error deleting table:', error);
      setError(error.message || 'Fout bij het verwijderen van tafel');
    } finally {
      setLoading(false);
    }
  };

  const cancelEdit = () => {
    setEditingTable(null);
  };

  const cancelAdd = () => {
    setShowAddTable(false);
    setNewTable({ name: '', seats: 2 });
  };

  if (loading && tables.length === 0) {
    return (
      <div className="container">
        <div className="card text-center">
          <div className="loading">Tafels laden...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="card">
        <div className="card-header">
          <div className="flex" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
            <button className="btn btn-icon" onClick={onBack}>
              ←
            </button>
            <h1 className="card-title">
              <Users size={24} style={{ marginRight: '12px', verticalAlign: 'middle' }} />
              Tafel Beheer
            </h1>
            <button 
              className="btn btn-primary"
              onClick={() => setShowAddTable(true)}
            >
              <Plus size={20} style={{ marginRight: '8px' }} />
              Nieuwe Tafel
            </button>
          </div>
        </div>

        {error && <div className="error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        {/* Add Table Form */}
        {showAddTable && (
          <div className="card mb-20" style={{ background: 'var(--neutral-50)', border: '2px solid var(--primary-color)' }}>
            <div className="card-header">
              <h3 className="card-title">Nieuwe Tafel Toevoegen</h3>
            </div>
            <div className="card-body">
              <div className="grid grid-2" style={{ gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Tafel Naam *</label>
                  <input
                    type="text"
                    name="name"
                    value={newTable.name}
                    onChange={handleInputChange}
                    className="form-input"
                    placeholder="Bijv. Tafel 1, Venster Tafel, etc."
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Aantal Plaatsen *</label>
                  <input
                    type="number"
                    name="seats"
                    min="1"
                    max="20"
                    value={newTable.seats}
                    onChange={handleInputChange}
                    className="form-input"
                    required
                  />
                </div>
              </div>
              <div className="flex" style={{ gap: '1rem', marginTop: '1rem' }}>
                <button
                  className="btn btn-primary"
                  onClick={addTable}
                  disabled={loading}
                >
                  <Check size={16} style={{ marginRight: '8px' }} />
                  Tafel Toevoegen
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={cancelAdd}
                >
                  <X size={16} style={{ marginRight: '8px' }} />
                  Annuleren
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tables List */}
        <div className="tables-list">
          {tables.length === 0 ? (
            <div className="text-center" style={{ padding: '3rem 0' }}>
              <Users size={48} style={{ marginBottom: '1rem', opacity: 0.3 }} />
              <p style={{ color: 'var(--neutral-500)' }}>
                Nog geen tafels toegevoegd. Voeg je eerste tafel toe om te beginnen.
              </p>
            </div>
          ) : (
            <div className="grid grid-1" style={{ gap: '1rem' }}>
              {tables.map(table => (
                <div key={table.id} className="table-item-admin">
                  {editingTable?.id === table.id ? (
                    <div className="table-edit-form">
                      <div className="grid grid-2" style={{ gap: '1rem' }}>
                        <div className="form-group">
                          <label className="form-label">Tafel Naam</label>
                          <input
                            type="text"
                            name="name"
                            value={editingTable.name}
                            onChange={handleEditInputChange}
                            className="form-input"
                            required
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Aantal Plaatsen</label>
                          <input
                            type="number"
                            name="seats"
                            min="1"
                            max="20"
                            value={editingTable.seats}
                            onChange={handleEditInputChange}
                            className="form-input"
                            required
                          />
                        </div>
                      </div>
                      <div className="flex" style={{ gap: '0.5rem', marginTop: '1rem' }}>
                        <button
                          className="btn btn-primary"
                          onClick={() => updateTable(editingTable)}
                          disabled={loading}
                        >
                          <Check size={14} style={{ marginRight: '4px' }} />
                          Opslaan
                        </button>
                        <button
                          className="btn btn-secondary"
                          onClick={cancelEdit}
                        >
                          <X size={14} style={{ marginRight: '4px' }} />
                          Annuleren
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="table-item-content">
                      <div className="table-item-header">
                        <div className="table-item-info">
                          <div className="table-icon">
                            <Building size={24} />
                          </div>
                          <div className="table-details">
                            <h4 className="table-name">{table.name}</h4>
                            <p className="table-seats">
                              {table.seats} {table.seats === 1 ? 'plaats' : 'plaatsen'}
                            </p>
                          </div>
                        </div>
                        <div className="table-item-actions">
                          <button
                            className="btn btn-icon"
                            onClick={() => setEditingTable(table)}
                            title="Bewerken"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            className="btn btn-icon btn-danger"
                            onClick={() => deleteTable(table.id)}
                            title="Verwijderen"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TableManagement;
