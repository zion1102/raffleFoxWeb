import React, { useState, useEffect } from 'react';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import {signInWithCredential, EmailAuthProvider, linkWithCredential, OAuthProvider } from 'firebase/auth';
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
      console.log('AppleID.auth initialized.');
    } else {
      console.error('AppleID object not found. Ensure you have included the Apple JS SDK.');
    }
  }, []);

  const handleAppleSignIn = async () => {
    setLoading(true);
    setError('');
    setSuccessMessage('');
  
    try {
      console.log('Starting Apple Sign-In process...');
      const response = await window.AppleID.auth.signIn();
      console.log('Apple Sign-In response:', response);
  
      const { code } = response.authorization;
      console.log('Authorization code received:', code);
  
      // Exchange the authorization code for an ID token with your backend
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
      console.log('ID token received:', id_token);
  
      if (!id_token) {
        setError('No ID token returned from backend.');
        return;
      }
  
      // Use the ID token to sign in with Firebase
      const provider = new OAuthProvider('apple.com');
      const credential = provider.credential({
        idToken: id_token,
      });
  
      // Correct way to call signInWithCredential
      const userCredential = await signInWithCredential(auth, credential);
  
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
  

  // Handle Email/Password Login
  const handleEmailSignIn = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log('Logged in successfully with Email/Password:', userCredential.user);

      // Redirect to the top-up page after login
      navigate('/topup');
    } catch (error) {
      console.error('Login error:', error);
      if (error.code === 'auth/wrong-password') {
        setError('Incorrect password. If you signed in with Apple, please use that option.');
      } else if (error.code === 'auth/user-not-found') {
        setError('No account found with this email. Please check or sign up.');
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle Password Reset
  const handlePasswordReset = async () => {
    setError('');
    setSuccessMessage('');
    if (!email) {
      setError('Please provide your email address to reset your password.');
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      setSuccessMessage('Password reset email sent! Check your inbox.');
      console.log('Password reset email sent to:', email);
    } catch (error) {
      console.error('Error sending password reset email:', error);
      setError('Failed to send password reset email. Please check the email address.');
    }
  };

  // Link Email and Password to an existing account
  const linkEmailPassword = async () => {
    setError('');
    setSuccessMessage('');

    if (!email || !password) {
      setError('Please provide both email and password to link your account.');
      return;
    }

    try {
      const emailCredential = EmailAuthProvider.credential(email, password);
      await linkWithCredential(auth.currentUser, emailCredential);
      setSuccessMessage('Email/Password linked successfully to your account.');
      console.log('Email/Password linked successfully.');
    } catch (error) {
      console.error('Error linking Email/Password:', error.message);
      if (error.code === 'auth/credential-already-in-use') {
        setError('This email is already in use by another account.');
      } else {
        setError('An unexpected error occurred while linking your email and password.');
      }
    }
  };

  return (
    <div>
      <TopNavBar />
      <div className="login-container">
        <h2>Log In</h2>
        {error && <p className="error-message">{error}</p>}
        {successMessage && <p className="success-message">{successMessage}</p>}
        <form onSubmit={handleEmailSignIn} className="login-form">
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="Enter your email"
          />

          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="Enter your password"
          />

          <button type="submit" className="submit-button" disabled={loading}>
            {loading ? 'Logging In...' : 'Log In'}
          </button>
        </form>

        <div className="extra-options">
          <button
            className="link-button"
            onClick={handlePasswordReset}
            disabled={!email}
          >
            Forgot Password?
          </button>
          <button
            className="link-button"
            onClick={linkEmailPassword}
            disabled={!email || !password || loading}
          >
            Link Email/Password to Account
          </button>
          <button
            className="apple-sign-in-button"
            onClick={handleAppleSignIn}
            disabled={loading}
          >
            {loading ? 'Signing in with Apple...' : 'Sign in with Apple'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
