import React, { useState, useEffect, useCallback } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { Calendar, Clock, Users, MessageSquare, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Table {
  id: string;
  name: string;
  seats: number;
}

interface ReservationData {
  table_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  guests: number;
  date: string;
  time: string;
  notes: string;
}

const CustomerReservation: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<string>('19:00');
  const [availableTables, setAvailableTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string>('');

  const [formData, setFormData] = useState<ReservationData>({
    table_id: '',
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    guests: 2,
    date: '',
    time: '',
    notes: ''
  });

  const timeSlots = [
    '17:00', '17:30', '18:00', '18:30', '19:00', '19:30',
    '20:00', '20:30', '21:00', '21:30', '22:00'
  ];

  const checkAvailability = useCallback(async () => {
    setLoading(true);
    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      
      // Get all tables
      const { data: allTables, error: tablesError } = await supabase
        .from('tables')
        .select('*');
      
      if (tablesError) throw tablesError;
      
      // Get occupied reservations for the selected date and time
      const { data: occupiedReservations, error: reservationsError } = await supabase
        .from('reservations')
        .select('table_id')
        .eq('date', dateStr)
        .eq('status', 'confirmed')
        .or('status.eq.arrived,status.eq.in_progress');
      
      if (reservationsError) throw reservationsError;
      
      const occupiedTableIds = occupiedReservations.map(r => r.table_id);
      const availableTables = allTables.filter(table => !occupiedTableIds.includes(table.id));
      
      setAvailableTables(availableTables);
    } catch (error) {
      console.error('Error checking availability:', error);
      setError('Error checking table availability');
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    if (selectedDate && selectedTime) {
      checkAvailability();
    }
  }, [selectedDate, selectedTime, checkAvailability]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleDateChange = (date: Date | null) => {
    if (date) {
      setSelectedDate(date);
      setFormData(prev => ({
        ...prev,
        date: date.toISOString().split('T')[0]
      }));
    }
  };

  const handleTimeChange = (time: string) => {
    setSelectedTime(time);
    setFormData(prev => ({
      ...prev,
      time: time
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const reservationData = {
        table_id: formData.table_id,
        customer_name: formData.customer_name,
        customer_email: formData.customer_email,
        customer_phone: formData.customer_phone,
        guests: formData.guests,
        date: selectedDate.toISOString().split('T')[0],
        time: selectedTime,
        notes: formData.notes,
        status: 'pending'
      };

      const { data, error } = await supabase
        .from('reservations')
        .insert([reservationData])
        .select()
        .single();

      if (error) throw error;

      console.log('Reservation created:', data);
      setSuccess(true);
      
      // Reset form
      setFormData({
        table_id: '',
        customer_name: '',
        customer_email: '',
        customer_phone: '',
        guests: 2,
        date: '',
        time: '',
        notes: ''
      });
      setSelectedDate(new Date());
      setSelectedTime('19:00');
    } catch (error: any) {
      console.error('Error creating reservation:', error);
      setError(error.message || 'Error creating reservation');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredTables = availableTables.filter(table => table.seats >= formData.guests);

  if (success) {
    return (
      <div className="container-narrow">
        <div className="card text-center fade-in">
          <CheckCircle size={80} className="text-success" style={{ margin: '0 auto 2rem' }} />
          <h2 className="card-title text-success">Reservering Bevestigd!</h2>
          <p className="text-lg">Bedankt voor je reservering. We kijken ernaar uit om je te verwelkomen!</p>
          <button 
            className="btn btn-primary btn-lg mt-6"
            onClick={() => setSuccess(false)}
          >
            Nieuwe Reservering Maken
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container-narrow">
      <div className="card fade-in">
        <div className="card-header">
          <h2 className="card-title">Maak een Reservering</h2>
          <p className="text-muted">Reserveer je tafel bij ons restaurant en ervaar culinaire perfectie</p>
        </div>

        {error && <div className="error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="grid grid-2">
            {/* Date Selection */}
            <div className="form-group">
              <label className="form-label">
                <Calendar size={20} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                Selecteer Datum
              </label>
              <DatePicker
                selected={selectedDate}
                onChange={handleDateChange}
                minDate={new Date()}
                maxDate={new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)} // 30 days from now
                dateFormat="MMMM d, yyyy"
                className="form-input"
                placeholderText="Selecteer een datum"
              />
            </div>

            {/* Time Selection */}
            <div className="form-group">
              <label className="form-label">
                <Clock size={20} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                Selecteer Tijd
              </label>
              <select
                name="time"
                value={selectedTime}
                onChange={(e) => handleTimeChange(e.target.value)}
                className="form-input"
              >
                {timeSlots.map(time => (
                  <option key={time} value={time}>
                    {new Date(`2000-01-01T${time}`).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Number of Guests */}
          <div className="form-group">
            <label className="form-label">
              <Users size={20} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
              Aantal Gasten
            </label>
            <select
              name="guests"
              value={formData.guests}
              onChange={handleInputChange}
              className="form-input"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                <option key={num} value={num}>{num} {num === 1 ? 'Gast' : 'Gasten'}</option>
              ))}
            </select>
          </div>

          {/* Available Tables */}
          {loading ? (
            <div className="loading">Beschikbaarheid controleren...</div>
          ) : (
            <div className="form-group">
              <label className="form-label">Beschikbare Tafels</label>
              {filteredTables.length === 0 ? (
                <p className="text-danger">Geen tafels beschikbaar voor de geselecteerde datum en tijd</p>
              ) : (
                <div className="grid grid-3">
                  {filteredTables.map(table => (
                    <div
                      key={table.id}
                      className={`card ${formData.table_id === table.id ? 'selected' : ''}`}
                      style={{
                        cursor: 'pointer',
                        border: formData.table_id === table.id ? '2px solid #007bff' : '1px solid #ddd',
                        backgroundColor: formData.table_id === table.id ? '#f8f9fa' : 'white'
                      }}
                      onClick={() => setFormData(prev => ({ ...prev, table_id: table.id }))}
                    >
                      <h4>{table.name}</h4>
                      <p className="text-muted">{table.seats} plaatsen</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Customer Information */}
          <div className="grid grid-2">
            <div className="form-group">
              <label className="form-label">Volledige Naam *</label>
              <input
                type="text"
                name="customer_name"
                value={formData.customer_name}
                onChange={handleInputChange}
                className="form-input"
                required
                placeholder="Voer je volledige naam in"
              />
            </div>

            <div className="form-group">
              <label className="form-label">E-mail</label>
              <input
                type="email"
                name="customer_email"
                value={formData.customer_email}
                onChange={handleInputChange}
                className="form-input"
                placeholder="Voer je e-mail in"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Telefoonnummer</label>
            <input
              type="tel"
              name="customer_phone"
              value={formData.customer_phone}
              onChange={handleInputChange}
              className="form-input"
              placeholder="Voer je telefoonnummer in"
            />
          </div>

          {/* Special Requests */}
          <div className="form-group">
            <label className="form-label">
              <MessageSquare size={20} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
              Bijzondere Wensen (Optioneel)
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              className="form-textarea"
              placeholder="Eventuele dieetwensen, vieringen of andere verzoeken..."
              rows={3}
            />
          </div>

          <div className="text-center mt-8">
            <button
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={submitting || !formData.table_id || !formData.customer_name}
            >
              {submitting ? 'Reservering aanmaken...' : 'Reservering Maken'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CustomerReservation;
