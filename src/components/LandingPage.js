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
          <h1>Welcome to Raffle Fox!</h1>
          <p>Win trips, prizes, events, devices with and much more - all the things <br/>
            that make life better, easier and fun! Always at a bargain </p>
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
