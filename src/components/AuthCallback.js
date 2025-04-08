import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithCredential, OAuthProvider } from 'firebase/auth';
import { auth } from '../config/firebaseConfig';

const AuthCallback = () => {
  const navigate = useNavigate();
  const [message, setMessage] = useState('Processing your login...');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const error = params.get('error');

    console.log('Apple callback URL params:', {
      code,
      error,
      raw: window.location.search,
    });

    if (error) {
      console.error('❌ Error returned by Apple:', error);
      setMessage('Apple login failed. Redirecting...');
      setTimeout(() => navigate('/login'), 1500);
      return;
    }

    if (!code) {
      console.error('❌ No authorization code found.');
      setMessage('Invalid login response. Redirecting...');
      setTimeout(() => navigate('/login'), 1500);
      return;
    }

    const exchangeAndSignIn = async () => {
      try {
        setMessage('Exchanging Apple token...');
        const res = await fetch(
          'https://us-central1-rafflefox-23872.cloudfunctions.net/exchangeAppleToken',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code }),
          }
        );

        const data = await res.json();
        console.log('🔁 Token exchange response:', data);

        if (!data.id_token) {
          console.error('❌ Backend did not return ID token:', data);
          setMessage('Login failed. Redirecting...');
          setTimeout(() => navigate('/login'), 2000);
          return;
        }

        const provider = new OAuthProvider('apple.com');
        const credential = provider.credential({ idToken: data.id_token });

        const userCredential = await signInWithCredential(auth, credential);
        console.log('✅ Signed in with Firebase:', userCredential.user);

        setMessage(`Welcome back! Redirecting to Top-Up...`);
        setTimeout(() => navigate('/topup'), 1000);
      } catch (err) {
        console.error('🔥 Apple Sign-In error:', err);
        setMessage('Something went wrong. Redirecting...');
        setTimeout(() => navigate('/login'), 2000);
      }
    };

    exchangeAndSignIn();
  }, [navigate]);

  return (
    <div style={{ textAlign: 'center', padding: '2rem' }}>
      <h2>{message}</h2>
    </div>
  );
};

export default AuthCallback;
