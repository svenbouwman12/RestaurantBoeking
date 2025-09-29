import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import CustomerReservation from './components/CustomerReservation';
import OwnerDashboard from './components/OwnerDashboard';
import Settings from './components/Settings';
import Menu from './components/Menu';
import './App.css';

function AppContent() {
  const [currentView, setCurrentView] = useState('customer');
  const location = useLocation();

  // Update currentView based on the current route
  useEffect(() => {
    const path = location.pathname;
    if (path.startsWith('/owner') || path.startsWith('/dashboard') || path.startsWith('/menu-beheer') || path.startsWith('/tafel-beheer') || path.startsWith('/keuken') || path.startsWith('/bestelling-opnemen') || path.startsWith('/settings') || path.startsWith('/categories') || path.startsWith('/allergens') || path.startsWith('/menu-management')) {
      setCurrentView('owner');
      document.body.classList.add('dashboard-active');
    } else if (path === '/menu') {
      setCurrentView('menu');
      document.body.classList.remove('dashboard-active');
    } else {
      setCurrentView('customer');
      document.body.classList.remove('dashboard-active');
    }
    
    // Cleanup function to remove class when component unmounts
    return () => {
      document.body.classList.remove('dashboard-active');
    };
  }, [location.pathname]);

  return (
    <div className="App">
        <nav className="navbar">
          <div className="container">
            <div className="nav-content">
              <div className="nav-brand">
                <Link to="/" className="nav-logo-link">
                  <img 
                    src="/zaytun-logo.svg" 
                    alt="Zaytun Logo" 
                    className="nav-logo clickable-logo"
                  />
                </Link>
              </div>
              <div className="nav-links">
                <Link 
                  to="/owner" 
                  className={`nav-link ${currentView === 'owner' ? 'active' : ''}`}
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
                  <Link 
                    to="/" 
                    className="btn btn-lg" 
                    style={{ background: 'white', color: 'var(--primary-color)', textDecoration: 'none' }}
                    onClick={() => {
                      // Scroll to reservation section after navigation
                      setTimeout(() => {
                        const reservationSection = document.getElementById('reservation-section');
                        if (reservationSection) {
                          reservationSection.scrollIntoView({ behavior: 'smooth' });
                        }
                      }, 100);
                    }}
                  >
                    Direct Reserveren
                  </Link>
                  <Link 
                    to="/menu" 
                    className="btn btn-lg btn-secondary" 
                    style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: '2px solid rgba(255,255,255,0.3)', textDecoration: 'none' }}
                  >
                    Bekijk Menu
                  </Link>
                </div>
              </div>
            </div>
          </section>
        )}

        <main className={`main-content ${currentView === 'owner' ? 'dashboard-active' : ''}`}>
          <Routes>
            <Route path="/" element={<CustomerReservation />} />
            <Route path="/menu" element={<Menu />} />
            <Route path="/owner" element={<OwnerDashboard />} />
            <Route path="/dashboard" element={<OwnerDashboard />} />
            <Route path="/menu-beheer" element={<OwnerDashboard />} />
            <Route path="/tafel-beheer" element={<OwnerDashboard />} />
            <Route path="/keuken" element={<OwnerDashboard />} />
            <Route path="/bestelling-opnemen" element={<OwnerDashboard />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/categories" element={<Settings />} />
            <Route path="/allergens" element={<Settings />} />
            <Route path="/menu-management" element={<Settings />} />
            {/* Fallback route */}
            <Route path="*" element={<CustomerReservation />} />
          </Routes>
        </main>

        <footer className="footer">
          <div className="container">
            <p>&copy; 2024 Tafel Reserveren. Alle rechten voorbehouden.</p>
          </div>
        </footer>
      </div>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
