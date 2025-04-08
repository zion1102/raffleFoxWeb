import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const error = params.get('error');

    if (error) {
      console.error('Error during Apple Sign-In:', error);
      navigate('/login');
    } else if (code) {
      console.log('Authorization Code received:', code);

      fetch('https://us-central1-rafflefox-23872.cloudfunctions.net/exchangeAppleToken', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      })
        .then((response) => response.json())
        .then((data) => {
          console.log('Token exchange response:', data);
          if (data.id_token) {
            navigate('/topup');
          } else {
            navigate('/login');
          }
        })
        .catch((err) => {
          console.error('Token exchange failed:', err);
          navigate('/login');
        });
    } else {
      console.error('No code or error in URL params.');
      navigate('/login');
    }
  }, [navigate]);

  return <p>Processing your login...</p>;
};

export default AuthCallback;
