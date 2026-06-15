import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { ThemeProvider } from './context/ThemeContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import DonorDashboard from './pages/DonorDashboard';
import ReceiverDashboard from './pages/ReceiverDashboard';
import VolunteerDashboard from './pages/VolunteerDashboard';
import LiveMapPage from './pages/LiveMapPage';

/**
 * App — Root component with routing, auth, language, and theme context.
 */
function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <Router>
            <div className="app">
              <Navbar />
              <main className="main-content">
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/live-map" element={<LiveMapPage />} />
                  <Route path="/donor" element={<DonorDashboard />} />
                  <Route path="/receiver" element={<ReceiverDashboard />} />
                  <Route path="/volunteer" element={<VolunteerDashboard />} />
                </Routes>
              </main>
              <Footer />
            </div>
          </Router>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;
