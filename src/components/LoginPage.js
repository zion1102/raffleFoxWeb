import React, { useState, useEffect } from 'react';
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithCredential,
  EmailAuthProvider,
  linkWithCredential,
  OAuthProvider,
} from 'firebase/auth';
import { auth } from '../config/firebaseConfig';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../styles/LoginPage.css';
import TopNavBar from './TopNavBar';

const LoginPage = ({ redirectAfterLogin = '/topup' }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (window.AppleID) {
      window.AppleID.auth.init({
        clientId: 'com.example.raffle-Fox.service',
        scope: 'email name',
        redirectURI: 'https://rafflefox.netlify.app/auth/callback',
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
      const response = await window.AppleID.auth.signIn();
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

      const { id_token } = tokenResponse.data;

      if (!id_token) {
        setError('No ID token returned from backend.');
        return;
      }

      const provider = new OAuthProvider('apple.com');
      const credential = provider.credential({
        idToken: id_token,
      });

      const userCredential = await signInWithCredential(auth, credential);
      setSuccessMessage(`Welcome, ${userCredential.user.displayName || 'User'}!`);
      navigate(redirectAfterLogin); // Redirect after login
    } catch (error) {
      console.error('Error during Apple Sign-In:', error);
      setError('Failed to sign in with Apple. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSignIn = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log('Logged in successfully with Email/Password:', userCredential.user);
      navigate(redirectAfterLogin); // Redirect after login
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
    } catch (error) {
      console.error('Error sending password reset email:', error);
      setError('Failed to send password reset email. Please check the email address.');
    }
  };

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
