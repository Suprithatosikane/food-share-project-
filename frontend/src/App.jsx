import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { ThemeProvider } from './context/ThemeContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import DonorDashboard from './pages/DonorDashboard';
import ReceiverDashboard from './pages/ReceiverDashboard';
import VolunteerDashboard from './pages/VolunteerDashboard';
import LiveMapPage from './pages/LiveMapPage';
import RoleSelectionPage from './pages/RoleSelectionPage';

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
                  <Route path="/login" element={<Login />} />
                  <Route path="/signup" element={<Signup />} />
                  <Route path="/live-map" element={<LiveMapPage />} />
                  <Route path="/roles" element={<RoleSelectionPage />} />
                  <Route
                    path="/donor"
                    element={
                      <ProtectedRoute roles={['donor']}>
                        <DonorDashboard />
                      </ProtectedRoute>
                    }
                  />
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
