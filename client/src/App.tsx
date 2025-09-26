import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import CustomerReservation from './components/CustomerReservation';
import OwnerDashboard from './components/OwnerDashboard';
import './App.css';

function App() {
  const [currentView, setCurrentView] = useState('customer');

  return (
    <Router>
      <div className="App">
        <nav className="navbar">
          <div className="container">
            <div className="nav-content">
              <h1 className="nav-title">🍽️ Tafel Reserveren</h1>
              <div className="nav-links">
                <Link 
                  to="/" 
                  className={`nav-link ${currentView === 'customer' ? 'active' : ''}`}
                  onClick={() => setCurrentView('customer')}
                >
                  Reservering Maken
                </Link>
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

        <main className="main-content">
          <Routes>
            <Route path="/" element={<CustomerReservation />} />
            <Route path="/owner" element={<OwnerDashboard />} />
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
