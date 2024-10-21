import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth } from '../config/firebaseConfig'; // Import Firebase auth
import '../styles/TopNavBar.css';

const TopNavBar = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false); // State to track login status
  const navigate = useNavigate();

  useEffect(() => {
    // Set up a listener to check if the user is logged in
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setIsLoggedIn(true);
      } else {
        setIsLoggedIn(false);
      }
    });

    return () => unsubscribe(); // Clean up the listener when the component unmounts
  }, []);

  const handleLogout = async () => {
    try {
      await auth.signOut(); // Firebase sign-out function
      navigate('/login'); // Redirect to login page after logging out
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  return (
    <nav className="navbar">
      <div className="navbar-logo">
        <Link to={isLoggedIn ? "/topup" : "/"}> Raffle Fox</Link> {/* Direct to TopUp if logged in */}
      </div>
      <div className="navbar-links">
        {isLoggedIn ? (
          <>
           
            <Link to="/profile">Profile</Link>
            <button onClick={handleLogout} className="logout-button">Log Out</button>
          </>
        ) : (
          <>
            <Link to="/login">Log In</Link>
            <Link to="/register">Register</Link>
          </>
        )}
      </div>
    </nav>
  );
};

export default TopNavBar;
