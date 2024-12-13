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
  const [error, setError] = useState(''); // Error handling
  const [loading, setLoading] = useState(false); // Loading state
  const [successMessage, setSuccessMessage] = useState(''); // Success messages
  const navigate = useNavigate(); // For navigation

  // Initialize AppleID.auth
  useEffect(() => {
    if (window.AppleID) {
      window.AppleID.auth.init({
        clientId: "com.example.raffle-Fox.service", // Your Service ID
        scope: "email name",
        redirectURI: "https://rafflefox.netlify.app/auth/callback", // Your callback URL
        usePopup: true,
      });
      
    }
  }, []);

  // Handle Email/Password Login
  const handleSubmit = async (e) => {
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
      if (error.code === 'auth/wrong-password') {
        setError('Incorrect password. If you signed in with Apple, please use that option.');
      } else if (error.code === 'auth/user-not-found') {
        setError('No account found with this email. Please check or sign up.');
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
      console.error('Login error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Link Email and Password to an existing account
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

  // Handle Password Reset
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

  // Handle Apple Sign-In
  const handleAppleSignIn = async () => {
    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      // Step 1: Initiate Apple Sign-In
      const response = await window.AppleID.auth.signIn();
      console.log('Apple Sign-In response:', response);

      const { code } = response.authorization;

      // Step 2: Call Firebase Cloud Function to exchange authorization code for an ID token
      const tokenResponse = await axios.post(
        "https://us-central1-rafflefox-23872.cloudfunctions.net/exchangeAppleToken",
        { code }, // Send the authorization code
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const { id_token } = tokenResponse.data; // Extract the ID token
      console.log('Verified Apple ID Token:', id_token);

      // Step 3: Authenticate with Firebase using the Apple ID token
      const provider = new OAuthProvider("apple.com");
      const credential = provider.credential({
        idToken: id_token,
      });

      const userCredential = await auth.signInWithCredential(credential);

      // Step 4: Handle successful sign-in
      console.log("Successfully signed in with Firebase:", userCredential.user);
      setSuccessMessage(`Welcome, ${userCredential.user.displayName || "User"}!`);
      navigate('/topup'); // Redirect to the top-up page
    } catch (error) {
      console.error("Error during Apple Sign-In:", error);
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

export default LoginPage;
