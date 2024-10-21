import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../config/firebaseConfig'; // Import Firebase auth
import { useNavigate } from 'react-router-dom'; // Import useNavigate for navigation
import '../styles/LoginPage.css';
import TopNavBar from './TopNavBar';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(''); // For handling error messages
  const [loading, setLoading] = useState(false); // For handling loading state

  const navigate = useNavigate(); // Hook for navigation

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Firebase authentication logic
      await signInWithEmailAndPassword(auth, email, password);
      console.log('Logged in successfully');
      
      // Redirect to the "Top Up Credits" page after successful login
      navigate('/topup'); 
      
    } catch (error) {
      setError('Failed to log in. Please check your email and password.');
      console.error('Login error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div><TopNavBar /> 
    <div className="login-container">
      <h2>Log In</h2>
      {error && <p className="error-message">{error}</p>} {/* Display error message if any */}
      <form onSubmit={handleSubmit} className="login-form">
        <label>Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <label>Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button type="submit" className="submit-button" disabled={loading}>
          {loading ? 'Logging In...' : 'Log In'}
        </button>
      </form>
    </div>
    </div>
  );
};

export default LoginPage;
