import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth } from '../config/firebaseConfig';
import { FiHome, FiUser, FiLogOut, FiCreditCard, FiShoppingCart } from 'react-icons/fi';
import '../styles/TopNavBar.css';

const TopNavBar = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setIsLoggedIn(!!user);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await auth.signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  return (
    <nav className="navbar">
      <div className="navbar-logo">
        <Link to={isLoggedIn ? '/home' : '/'}>RaffleFox</Link>
      </div>

      <div className="navbar-links">
        {isLoggedIn && (
          <>
            <Link to="/home" title="Home"><FiHome /></Link>
            <Link to="/topup" title="Top Up"><FiCreditCard /></Link>
            <Link to="/cart" title="Cart"><FiShoppingCart /></Link>
            <Link to="/profile" title="Profile"><FiUser /></Link>
            <button onClick={handleLogout} className="logout-button" title="Log Out"><FiLogOut /></button>
          </>
        )}
      </div>
    </nav>
  );
};

export default TopNavBar;
