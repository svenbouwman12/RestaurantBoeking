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
  const [availableDates, setAvailableDates] = useState<Date[]>([]);
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

  // Generate available dates (next 7 days)
  const generateAvailableDates = () => {
    const dates = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date);
    }
    setAvailableDates(dates);
  };

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
      
      const occupiedTableIds = occupiedReservations.map((r: any) => r.table_id);
      const availableTables = allTables.filter((table: Table) => !occupiedTableIds.includes(table.id));
      
      // Find the best table for the number of guests
      const suitableTables = availableTables.filter((table: Table) => table.seats >= formData.guests);
      const bestTable = suitableTables.sort((a: Table, b: Table) => a.seats - b.seats)[0]; // Smallest suitable table
      
      setAvailableTables(availableTables);
      
      if (bestTable) {
        setFormData((prev: ReservationData) => ({ ...prev, table_id: bestTable.id }));
      } else {
        setFormData((prev: ReservationData) => ({ ...prev, table_id: '' }));
      }
    } catch (error) {
      console.error('Error checking availability:', error);
      setError('Error checking table availability');
    } finally {
      setLoading(false);
    }
  }, [selectedDate, formData.guests]);

  useEffect(() => {
    generateAvailableDates();
  }, []);

  useEffect(() => {
    if (selectedDate && selectedTime) {
      checkAvailability();
    }
  }, [selectedDate, selectedTime, checkAvailability]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev: ReservationData) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleDateChange = (date: Date | null) => {
    if (date) {
      setSelectedDate(date);
      setFormData((prev: ReservationData) => ({
        ...prev,
        date: date.toISOString().split('T')[0]
      }));
    }
  };

  const handleTimeChange = (time: string) => {
    setSelectedTime(time);
    setFormData((prev: ReservationData) => ({
      ...prev,
      time: time
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      // Check if a table is available
      if (!formData.table_id) {
        setError('Geen tafel beschikbaar voor de geselecteerde datum en tijd. Probeer een andere tijd.');
        setSubmitting(false);
        return;
      }

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

  // Get the assigned table info for display
  const assignedTable = availableTables.find((table: Table) => table.id === formData.table_id);

  if (success) {
    return (
      <div className="container-narrow">
        <div className="card text-center">
          <CheckCircle size={80} className="text-success" style={{ margin: '0 auto 2rem' }} />
          <h2 className="card-title text-success">Reservering Bevestigd!</h2>
          <p className="text-lg">Bedankt voor je reservering! Je tafel is automatisch toegewezen.</p>
          {assignedTable && (
            <div className="alert alert-info" style={{ margin: '1rem 0' }}>
              <p><strong>Je tafel:</strong> {assignedTable.name} ({assignedTable.seats} plaatsen)</p>
              <p><strong>Datum:</strong> {selectedDate.toLocaleDateString('nl-NL')}</p>
              <p><strong>Tijd:</strong> {selectedTime}</p>
              <p><strong>Gasten:</strong> {formData.guests}</p>
            </div>
          )}
          <p className="text-muted">
            Je ontvangt een bevestigingsmail op {formData.customer_email}.
          </p>
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
    <div id="reservation-section" className="container-narrow">
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Maak een Reservering</h2>
          <p className="text-muted">Reserveer je tafel bij ons restaurant en ervaar culinaire perfectie</p>
        </div>

        {error && <div className="error">{error}</div>}

        <form onSubmit={handleSubmit}>
          {/* Date Selection */}
          <div className="form-group">
            <label className="form-label">
              <Calendar size={20} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
              Kies datum:
            </label>
            <div className="date-selector">
              <div className="date-cards">
                {availableDates.slice(0, 3).map((date, index) => {
                  const isToday = date.toDateString() === new Date().toDateString();
                  const isSelected = date.toDateString() === selectedDate.toDateString();
                  const isPast = date < new Date();
                  
                  return (
                    <div
                      key={date.toISOString()}
                      className={`date-card ${isSelected ? 'selected' : ''} ${isPast ? 'unavailable' : ''}`}
                      onClick={() => !isPast && setSelectedDate(date)}
                    >
                      <div className="date-day">
                        {isToday ? 'Vandaag' : date.toLocaleDateString('nl-NL', { weekday: 'short' })}
                      </div>
                      <div className="date-number">{date.getDate()}</div>
                      <div className="date-month">
                        {date.toLocaleDateString('nl-NL', { month: 'short' }).toUpperCase()}
                      </div>
                      {isPast && (
                        <div className="date-status">Niet beschikbaar</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Time Selection */}
          <div className="form-group">
            <label className="form-label">
              <Clock size={20} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
              Kies tijd:
            </label>
            <div className="time-selector">
              <div className="time-cards">
                {timeSlots.map(time => (
                  <div
                    key={time}
                    className={`time-card ${selectedTime === time ? 'selected' : ''}`}
                    onClick={() => handleTimeChange(time)}
                  >
                    {new Date(`2000-01-01T${time}`).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                ))}
              </div>
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

          {/* Table Assignment Status */}
          {loading ? (
            <div className="loading">Beschikbaarheid controleren...</div>
          ) : (
            <div className="form-group">
              <label className="form-label">Tafel Toewijzing</label>
              {!formData.table_id ? (
                <div className="alert alert-warning">
                  <p>Geen tafels beschikbaar voor de geselecteerde datum en tijd. Probeer een andere tijd.</p>
                </div>
              ) : assignedTable ? (
                <div className="alert alert-success">
                  <p><strong>✅ Tafel toegewezen:</strong> {assignedTable.name} ({assignedTable.seats} plaatsen)</p>
                  <p className="text-muted">Deze tafel is perfect geschikt voor {formData.guests} {formData.guests === 1 ? 'gast' : 'gasten'}.</p>
                </div>
              ) : null}
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
