import React, { useState, useEffect } from 'react';
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithCredential,
  OAuthProvider,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { auth } from '../config/firebaseConfig';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
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
        clientId: 'com.example.raffle-Fox.service',
        scope: 'email name',
        redirectURI: 'https://rafflefox.netlify.app/auth/callback',
        usePopup: true,
      });
    }
  }, []);

  const handleGoogleSignIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      navigate('/topup');
    } catch (error) {
      setError('Failed to sign in with Google.');
    }
  };

  const handleAppleSignIn = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await window.AppleID.auth.signIn();
      const { code } = response.authorization;
      const tokenResponse = await axios.post(
        'https://us-central1-rafflefox-23872.cloudfunctions.net/exchangeAppleToken',
        { code },
        { headers: { 'Content-Type': 'application/json' } }
      );
      const { id_token } = tokenResponse.data;
      const provider = new OAuthProvider('apple.com');
      const credential = provider.credential({ idToken: id_token });
      await signInWithCredential(auth, credential);
      navigate('/topup');
    } catch (e) {
      console.error(e);
      setError('Failed to sign in with Apple.');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSignIn = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/topup');
    } catch {
      setError('Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!email) {
      setError('Please enter your email first.');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      setSuccessMessage('Password reset email sent.');
    } catch {
      setError('Failed to send password reset email.');
    }
  };

  return (
    <div>
      <TopNavBar />
      <div className="login-page-content">
        <div className="login-container">
          <h2>Log In</h2>
          {error && <p className="error-message">{error}</p>}
          {successMessage && <p className="success-message">{successMessage}</p>}

          <form onSubmit={handleEmailSignIn} className="login-form">
            <label>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />

            <label>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />

            <button type="submit" className="submit-button" disabled={loading}>
              {loading ? 'Logging in...' : 'Log In'}
            </button>
          </form>

          <div className="extra-options">
            <button className="link-button" onClick={handlePasswordReset}>Forgot Password?</button>
          </div>

          <div className="social-signin">
            <button className="google-btn" onClick={handleGoogleSignIn}>
              Continue with Google
            </button>
            <button className="apple-btn" onClick={handleAppleSignIn}>
              Continue with Apple
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
