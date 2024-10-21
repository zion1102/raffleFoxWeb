import React from 'react';
import '../styles/LandingPage.css';
import { Link } from 'react-router-dom';
import TopNavBar from './TopNavBar';  // Import the new top navigation bar

const LandingPage = () => {
  return (
    <div>
      <TopNavBar /> {/* Add the navigation bar here */}
      <div className="landing-container">
        <header className="header">
          <h1>Welcome to Credit Top-Up</h1>
          <p>Your easy way to add credits</p>
          <div className="button-group">
            <Link to="/login" className="button">Log In</Link>
            <Link to="/register" className="button">Register</Link>
          </div>
        </header>
      </div>
    </div>
  );
};

export default LandingPage;
