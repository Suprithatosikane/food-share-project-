/**
 * Footer — Simple footer with branding and links.
 */
export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-brand">
          <span className="brand-icon">🍽️</span>
          <span>Anna Setu</span>
          <p className="footer-tagline">Bridging the gap between surplus food and hungry hearts.</p>
        </div>

        <div className="footer-links">
          <div className="footer-col">
            <h4>Platform</h4>
            <a href="/">Home</a>
            <a href="/login">Login</a>
            <a href="/signup">Sign Up</a>
          </div>
          <div className="footer-col">
            <h4>Roles</h4>
            <a href="/signup">Become a Donor</a>
            <a href="/signup">Register as NGO</a>
            <a href="/signup">Join as Volunteer</a>
          </div>
          <div className="footer-col">
            <h4>About</h4>
            <a href="/">Our Mission</a>
            <a href="/">Contact Us</a>
            <a href="/">Privacy Policy</a>
          </div>
        </div>

        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} Anna Setu — Reduce Food Waste, Feed the Needy 🌱</p>
        </div>
      </div>
    </footer>
  );
}
