import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithCredential, OAuthProvider } from 'firebase/auth';
import { auth } from '../config/firebaseConfig';

const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const error = params.get('error');

    if (error) {
      console.error('Error during Apple Sign-In:', error);
      navigate('/login');
      return;
    }

    if (!code) {
      console.error('No code provided in query params.');
      navigate('/login');
      return;
    }

    const exchangeAndSignIn = async () => {
      try {
        const res = await fetch(
          'https://us-central1-rafflefox-23872.cloudfunctions.net/exchangeAppleToken',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code }),
          }
        );

        const data = await res.json();
        console.log('Token exchange response:', data);

        if (!data.id_token) {
          console.error('No ID token returned from backend.');
          navigate('/login');
          return;
        }

        const provider = new OAuthProvider('apple.com');
        const credential = provider.credential({ idToken: data.id_token });

        const userCredential = await signInWithCredential(auth, credential);
        console.log('Signed in with Firebase:', userCredential.user);
        navigate('/topup');
      } catch (err) {
        console.error('Sign-in process failed:', err);
        navigate('/login');
      }
    };

    exchangeAndSignIn();
  }, [navigate]);

  return <p>Processing your login...</p>;
};

export default AuthCallback;
