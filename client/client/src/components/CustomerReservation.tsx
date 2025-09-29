import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  const [dateOffset, setDateOffset] = useState<number>(0);
  const [availableTables, setAvailableTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string>('');
  
  // New flow state
  const [currentStep, setCurrentStep] = useState<'guests' | 'date' | 'details'>('guests');
  const [timeAvailability, setTimeAvailability] = useState<{[key: string]: boolean}>({});
  const [checkingAvailability, setCheckingAvailability] = useState(false);

  const [formData, setFormData] = useState<ReservationData>({
    table_id: '',
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    guests: 0,
    date: '',
    time: '',
    notes: ''
  });

  const timeSlots = useMemo(() => [
    '17:00', '17:30', '18:00', '18:30', '19:00', '19:30',
    '20:00', '20:30', '21:00', '21:30', '22:00'
  ], []);

  // Generate available dates (next 30 days)
  const generateAvailableDates = useCallback(() => {
    const dates = [];
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date);
    }
    setAvailableDates(dates);
  }, []);

  // Configuration for reservation duration and buffer
  const RESERVATION_DURATION_HOURS = 2; // Standard reservation duration
  const BUFFER_MINUTES = 15; // Buffer time before and after reservation

  // Helper function to check time overlap
  const hasTimeOverlap = (startTime1: string, endTime1: string, startTime2: string, endTime2: string): boolean => {
    return startTime1 < endTime2 && startTime2 < endTime1;
  };

  // Helper function to add minutes to time string
  const addMinutesToTime = (timeStr: string, minutes: number): string => {
    const [hours, mins] = timeStr.split(':').map(Number);
    const totalMinutes = hours * 60 + mins + minutes;
    const newHours = Math.floor(totalMinutes / 60);
    const newMins = totalMinutes % 60;
    return `${newHours.toString().padStart(2, '0')}:${newMins.toString().padStart(2, '0')}`;
  };

  const checkTimeAvailability = useCallback(async () => {
    if (!selectedDate || !formData.guests) return;
    
    setCheckingAvailability(true);
    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      
      // Get all tables
      const { data: allTables, error: tablesError } = await supabase
        .from('tables')
        .select('*');
      
      if (tablesError) throw tablesError;
      
      // Get all reservations for the date
      const { data: allReservations, error: reservationsError } = await supabase
        .from('reservations')
        .select('table_id, time, status, duration_hours, buffer_minutes')
        .eq('date', dateStr)
        .in('status', ['confirmed', 'arrived', 'in_progress']);
      
      if (reservationsError) throw reservationsError;
      
      // Check availability for each time slot
      const availability: {[key: string]: boolean} = {};
      
      for (const timeSlot of timeSlots) {
        const bufferStartTime = addMinutesToTime(timeSlot, -BUFFER_MINUTES);
        const reservationEndTime = addMinutesToTime(timeSlot, RESERVATION_DURATION_HOURS * 60);
        const bufferEndTime = addMinutesToTime(reservationEndTime, BUFFER_MINUTES);
        
        // Check each table for availability at this time
        const availableTables = allTables.filter((table: Table) => {
          if (table.seats < formData.guests) return false; // Not enough seats
          
          const tableReservations = allReservations.filter((r: any) => r.table_id === table.id);
          
          // Check if any reservation overlaps with this time slot
          for (const reservation of tableReservations) {
            const existingTime = reservation.time;
            const existingDuration = reservation.duration_hours || RESERVATION_DURATION_HOURS;
            const existingBuffer = reservation.buffer_minutes || BUFFER_MINUTES;
            
            const existingBufferStart = addMinutesToTime(existingTime, -existingBuffer);
            const existingReservationEnd = addMinutesToTime(existingTime, existingDuration * 60);
            const existingBufferEnd = addMinutesToTime(existingReservationEnd, existingBuffer);
            
            if (hasTimeOverlap(bufferStartTime, bufferEndTime, existingBufferStart, existingBufferEnd)) {
              return false; // Table is not available
            }
          }
          
          return true; // Table is available
        });
        
        availability[timeSlot] = availableTables.length > 0;
      }
      
      setTimeAvailability(availability);
    } catch (error) {
      console.error('Error checking time availability:', error);
      setError('Fout bij het controleren van beschikbaarheid');
    } finally {
      setCheckingAvailability(false);
    }
  }, [selectedDate, formData.guests, timeSlots]);

  const checkAvailability = useCallback(async () => {
    setLoading(true);
    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      
      // Get all tables
      const { data: allTables, error: tablesError } = await supabase
        .from('tables')
        .select('*');
      
      if (tablesError) throw tablesError;
      
      // Calculate time slots with buffer for overlap check
      const bufferStartTime = addMinutesToTime(selectedTime, -BUFFER_MINUTES);
      const reservationEndTime = addMinutesToTime(selectedTime, RESERVATION_DURATION_HOURS * 60);
      const bufferEndTime = addMinutesToTime(reservationEndTime, BUFFER_MINUTES);
      
      // Get all reservations for the date
      const { data: allReservations, error: reservationsError } = await supabase
        .from('reservations')
        .select('table_id, time, status, duration_hours, buffer_minutes')
        .eq('date', dateStr)
        .in('status', ['confirmed', 'arrived', 'in_progress']);
      
      if (reservationsError) throw reservationsError;
      
      // Check each table for availability
      const availableTables = allTables.filter((table: Table) => {
        const tableReservations = allReservations.filter((r: any) => r.table_id === table.id);
        
        // Check if any reservation overlaps with the requested time
        for (const reservation of tableReservations) {
          const existingTime = reservation.time;
          const existingDuration = reservation.duration_hours || RESERVATION_DURATION_HOURS;
          const existingBuffer = reservation.buffer_minutes || BUFFER_MINUTES;
          
          const existingBufferStart = addMinutesToTime(existingTime, -existingBuffer);
          const existingReservationEnd = addMinutesToTime(existingTime, existingDuration * 60);
          const existingBufferEnd = addMinutesToTime(existingReservationEnd, existingBuffer);
          
          if (hasTimeOverlap(bufferStartTime, bufferEndTime, existingBufferStart, existingBufferEnd)) {
            return false; // Table is not available
          }
        }
        
        return true; // Table is available
      });
      
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
  }, [selectedDate, selectedTime, formData.guests]);

  useEffect(() => {
    generateAvailableDates();
  }, [generateAvailableDates]);

  // Check time availability when date or guests change
  useEffect(() => {
    if (selectedDate && formData.guests) {
      checkTimeAvailability();
    }
  }, [selectedDate, formData.guests, checkTimeAvailability]);

  // Check final availability when time is selected
  useEffect(() => {
    if (selectedDate && selectedTime && formData.guests) {
      checkAvailability();
    }
  }, [selectedDate, selectedTime, formData.guests, checkAvailability]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev: ReservationData) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleGuestsChange = (guests: number) => {
    setFormData((prev: ReservationData) => ({
      ...prev,
      guests: guests
    }));
  };

  const handleDateChange = (date: Date) => {
    setSelectedDate(date);
    // Automatically check time availability when date is selected
    if (formData.guests > 0) {
      checkTimeAvailability();
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
        status: 'confirmed'
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
        guests: 0,
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
          
          {/* Progress Steps */}
          <div className="flex" style={{ justifyContent: 'center', marginTop: '1.5rem', gap: '1rem' }}>
            <div className={`step ${currentStep === 'guests' ? 'active' : currentStep === 'date' || currentStep === 'details' ? 'completed' : ''}`}>
              <div className="step-number">1</div>
              <div className="step-label">Gasten</div>
            </div>
            <div className={`step ${currentStep === 'date' ? 'active' : currentStep === 'details' ? 'completed' : ''}`}>
              <div className="step-number">2</div>
              <div className="step-label">Datum & Tijd</div>
            </div>
            <div className={`step ${currentStep === 'details' ? 'active' : ''}`}>
              <div className="step-number">3</div>
              <div className="step-label">Details</div>
            </div>
          </div>
        </div>

        {error && <div className="error">{error}</div>}

        <form onSubmit={handleSubmit}>
          {/* Step 1: Guests Selection */}
          {currentStep === 'guests' && (
            <div className="form-group">
              <label className="form-label">
                <Users size={20} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                Aantal Gasten
              </label>
              <div className="guests-grid">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(guests => (
                  <button
                    key={guests}
                    type="button"
                    className={`guest-btn ${formData.guests === guests ? 'active' : ''}`}
                    onClick={() => handleGuestsChange(guests)}
                  >
                    {guests}
                  </button>
                ))}
              </div>
              <div className="flex" style={{ justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setCurrentStep('date')}
                  disabled={!formData.guests || formData.guests === 0}
                >
                  Volgende →
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Date Selection */}
          {currentStep === 'date' && (
            <div className="form-group">
              <label className="form-label">
                <Calendar size={20} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                Kies datum:
              </label>
              <div className="date-selector">
                <div className="date-navigation">
                  <button 
                    type="button"
                    className="date-nav-btn"
                    onClick={() => setDateOffset(Math.max(0, dateOffset - 1))}
                    disabled={dateOffset === 0}
                  >
                    ‹
                  </button>
                  <div className="date-cards">
                    {availableDates.slice(dateOffset, dateOffset + 5).map((date: Date, index: number) => {
                      const isToday = date.toDateString() === new Date().toDateString();
                      const isSelected = date.toDateString() === selectedDate.toDateString();
                      const isPast = date < new Date() && !isToday;
                      
                      return (
                        <div
                          key={date.toISOString()}
                          className={`date-card ${isSelected ? 'selected' : ''} ${isPast ? 'unavailable' : ''}`}
                          onClick={() => !isPast && handleDateChange(date)}
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
                  <button 
                    type="button"
                    className="date-nav-btn"
                    onClick={() => setDateOffset(Math.min(availableDates.length - 5, dateOffset + 1))}
                    disabled={dateOffset >= availableDates.length - 5}
                  >
                    ›
                  </button>
                </div>
              </div>
              {/* Show time selection directly under date selection */}
              {selectedDate && formData.guests > 0 && (
                <div style={{ marginTop: '2rem' }}>
                  <label className="form-label">
                    <Clock size={20} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                    Beschikbare tijden voor {selectedDate.toLocaleDateString('nl-NL')}:
                  </label>
                  {checkingAvailability && (
                    <div className="loading" style={{ textAlign: 'center', padding: '1rem' }}>
                      Beschikbaarheid controleren...
                    </div>
                  )}
                  <div className="time-selector">
                    <div className="time-cards">
                      {timeSlots.map(time => {
                        const isAvailable = timeAvailability[time];
                        const isSelected = selectedTime === time;
                        
                        return (
                          <div
                            key={time}
                            className={`time-card ${isSelected ? 'selected' : ''} ${!isAvailable ? 'unavailable' : ''}`}
                            onClick={() => isAvailable && handleTimeChange(time)}
                            style={{
                              opacity: !isAvailable ? 0.5 : 1,
                              cursor: !isAvailable ? 'not-allowed' : 'pointer',
                              position: 'relative'
                            }}
                          >
                            {new Date(`2000-01-01T${time}`).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            {!isAvailable && (
                              <div style={{
                                position: 'absolute',
                                top: '50%',
                                left: '50%',
                                transform: 'translate(-50%, -50%)',
                                fontSize: '0.7rem',
                                color: '#ef4444',
                                fontWeight: '600',
                                textAlign: 'center'
                              }}>
                                Vol
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
              
              <div className="flex" style={{ justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setCurrentStep('details')}
                  disabled={!selectedDate || !selectedTime}
                >
                  Volgende →
                </button>
              </div>
            </div>
          )}


          {/* Step 4: Customer Details */}
          {currentStep === 'details' && (
            <>
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
            </>
          )}

          {/* Navigation Buttons */}
          {currentStep !== 'guests' && (
            <div className="flex" style={{ justifyContent: 'space-between', marginTop: '2rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  if (currentStep === 'date') setCurrentStep('guests');
                  if (currentStep === 'details') setCurrentStep('date');
                }}
              >
                ← Terug
              </button>
              {currentStep === 'details' && (
                <div style={{ color: 'var(--neutral-500)', fontSize: '0.9rem', alignSelf: 'center' }}>
                  Stap 3 van 3
                </div>
              )}
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default CustomerReservation;
