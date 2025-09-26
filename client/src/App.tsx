import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import CustomerReservation from './components/CustomerReservation';
import OwnerDashboard from './components/OwnerDashboard';
import Settings from './components/Settings';
import './App.css';

function App() {
  const [currentView, setCurrentView] = useState('customer');

  return (
    <Router>
      <div className="App">
        <nav className="navbar">
          <div className="container">
            <div className="nav-content">
              <div className="nav-brand">
                <img 
                  src="/zaytun logo.svg" 
                  alt="Zaytun Logo" 
                  className="nav-logo clickable-logo"
                  onClick={() => setCurrentView('customer')}
                />
              </div>
              <div className="nav-links">
                <Link 
                  to="/owner" 
                  className={`nav-link ${currentView === 'owner' ? 'active' : ''}`}
                  onClick={() => setCurrentView('owner')}
                >
                  Eigenaar Dashboard
                </Link>
              </div>
            </div>
          </div>
        </nav>

        {currentView === 'customer' && (
          <section className="hero">
            <div className="container">
              <div className="hero-content">
                <h1>Reserveer Je Tafel</h1>
                <p>Ervaar culinaire perfectie in een sfeervolle omgeving. Reserveer nu je tafel en laat je verwennen door onze chef-kok.</p>
                <div className="hero-cta">
                  <button 
                    className="btn btn-lg" 
                    style={{ background: 'white', color: 'var(--primary-color)' }}
                    onClick={() => {
                      const reservationSection = document.getElementById('reservation-section');
                      if (reservationSection) {
                        reservationSection.scrollIntoView({ behavior: 'smooth' });
                      }
                    }}
                  >
                    Direct Reserveren
                  </button>
                  <button className="btn btn-lg btn-secondary" style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: '2px solid rgba(255,255,255,0.3)' }}>
                    Bekijk Menu
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        <main className="main-content">
          <Routes>
            <Route path="/" element={<CustomerReservation />} />
            <Route path="/owner" element={<OwnerDashboard />} />
            <Route path="/settings" element={<Settings onBack={() => setCurrentView('owner')} />} />
          </Routes>
        </main>

        <footer className="footer">
          <div className="container">
            <p>&copy; 2024 Tafel Reserveren. Alle rechten voorbehouden.</p>
          </div>
        </footer>
      </div>
    </Router>
  );
}

export default App;
