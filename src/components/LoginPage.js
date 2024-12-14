import React, { useState, useEffect } from 'react';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { EmailAuthProvider, linkWithCredential, OAuthProvider } from 'firebase/auth';
import { auth } from '../config/firebaseConfig'; // Firebase auth configuration
import { useNavigate } from 'react-router-dom'; // For navigation
import axios from 'axios'; // For API calls
import '../styles/LoginPage.css';
import TopNavBar from './TopNavBar';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (window.AppleID) {
      window.AppleID.auth.init({
        clientId: 'com.example.raffle-Fox.service', // Your Service ID
        scope: 'email name',
        redirectURI: 'https://rafflefox.netlify.app/auth/callback', // Your callback URL
        usePopup: true,
      });
    }
  }, []);

  const handleAppleSignIn = async () => {
    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const response = await window.AppleID.auth.signIn();
      console.log('Apple Sign-In response:', response);

      const { code } = response.authorization;

      const tokenResponse = await axios.post(
        'https://us-central1-rafflefox-23872.cloudfunctions.net/exchangeAppleToken',
        { code },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('Backend token exchange response:', tokenResponse.data);

      const { id_token } = tokenResponse.data;

      if (!id_token) {
        setError('No ID token returned from backend.');
        return;
      }

      const provider = new OAuthProvider('apple.com');
      const credential = provider.credential({ idToken: id_token });

      const userCredential = await auth.signInWithCredential(credential);

      console.log('Successfully signed in with Firebase:', userCredential.user);
      setSuccessMessage(`Welcome, ${userCredential.user.displayName || 'User'}!`);
      navigate('/topup');
    } catch (error) {
      console.error('Error during Apple Sign-In:', error);
      setError('Failed to sign in with Apple. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <TopNavBar />
      <div className="login-container">
        <h2>Log In</h2>
        {error && <p className="error-message">{error}</p>}
        {successMessage && <p className="success-message">{successMessage}</p>}
        <button
          className="apple-sign-in-button"
          onClick={handleAppleSignIn}
          disabled={loading}
        >
          {loading ? 'Signing in...' : 'Sign in with Apple'}
        </button>
      </div>
    </div>
  );
};

export default LoginPage;
