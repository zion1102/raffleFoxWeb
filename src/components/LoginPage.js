import React, { useState, useEffect } from 'react';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { EmailAuthProvider, linkWithCredential } from 'firebase/auth';
import { auth } from '../config/firebaseConfig'; // Import Firebase auth
import { useNavigate } from 'react-router-dom'; // Import useNavigate for navigation
import axios from 'axios'; // Axios for backend Apple token verification
import '../styles/LoginPage.css';
import TopNavBar from './TopNavBar';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(''); // For handling error messages
  const [loading, setLoading] = useState(false); // For handling loading state
  const [successMessage, setSuccessMessage] = useState(''); // For success messages

  const navigate = useNavigate(); // Hook for navigation

  // Initialize AppleID.auth
  useEffect(() => {
    if (window.AppleID) {
      window.AppleID.auth.init({
        clientId: 'com.example.raffle-Fox', // Replace with your app's client ID
        scope: 'email name',
        redirectURI: 'https://rafflefox.netlify.app/auth/callback', // Replace with your redirect URI
        usePopup: true, // Use popup for Apple Sign-In
      });
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log('Logged in successfully with Email/Password:', userCredential.user);
      navigate('/topup');
    } catch (error) {
      if (error.code === 'auth/wrong-password') {
        setError('Incorrect password. If you signed in with Apple, please use that option.');
      } else if (error.code === 'auth/user-not-found') {
        setError('No account found with this email. Please check or sign up.');
      } else if (error.code === 'auth/email-already-in-use') {
        setError('This email is linked to another sign-in method. Try "Sign in with Apple".');
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
      console.error('Login error:', error);
    } finally {
      setLoading(false);
    }
  };

  const linkEmailPassword = async () => {
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

  const handlePasswordReset = async () => {
    try {
      await sendPasswordResetEmail(auth, email);
      setSuccessMessage('Password reset email sent! Check your inbox.');
      console.log('Password reset email sent to:', email);
    } catch (error) {
      console.error('Error sending password reset email:', error);
      setError('Failed to send password reset email. Please check the email address.');
    }
  };

  const handleAppleSignIn = async () => {
    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const response = await window.AppleID.auth.signIn();
      console.log('Apple Sign-In response:', response);

      const { code } = response.authorization;

      // Call your backend to verify the Apple auth code
      const { id_token } = await verifyAppleAuthCode(code);

      // Use id_token to authenticate with your backend or Firebase
      console.log('Verified Apple ID Token:', id_token);

      setSuccessMessage('Signed in with Apple successfully!');
    } catch (error) {
      console.error('Apple Sign-In error:', error);
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
        {error && <p className="error-message">{error}</p>} {/* Display error message if any */}
        {successMessage && <p className="success-message">{successMessage}</p>} {/* Display success message if any */}
        <form onSubmit={handleSubmit} className="login-form">
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
            Sign in with Apple
          </button>
        </div>
      </div>
    </div>
  );
};

// Function to verify Apple auth code
const verifyAppleAuthCode = async (authCode) => {
  const response = await axios.post('https://appleid.apple.com/auth/token', {
    client_id: 'com.example.raffle-Fox', // Replace with your app's client ID
    client_secret: ' eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Iks3UURGMzNVQTUifQ.eyJpc3MiOiJZNU4zVTdDVTROIiwiaWF0IjoxNzM0MTE1NDQxLCJleHAiOjE3MzQyMDE4NDEsImF1ZCI6Imh0dHBzOi8vYXBwbGVpZC5hcHBsZS5jb20iLCJzdWIiOiJjb20uZXhhbXBsZS5yYWZmbGUtZm94LnNlcnZpY2UifQ.dLO_Bb5XhyykuBuhtWvB02XQmtrCCRla94K0_S-L3psFvWFQ5ZkIvKaNjPQ8emZ8suguCAuJWfVGDmOB2jCP-Q', // Replace with your app's generated Apple secret
    code: authCode,
    grant_type: 'authorization_code',
  });

  const { id_token, access_token } = response.data;
  return { id_token, access_token };
};

export default LoginPage;
