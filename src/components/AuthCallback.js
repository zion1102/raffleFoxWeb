import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    // Example: You might receive an authorization code or token
    const code = params.get('code');
    const error = params.get('error');

    if (error) {
      console.error('Error during Apple Sign-In:', error);
      navigate('/login');
    } else if (code) {
      console.log('Authorization Code:', code);
      // Optionally send the code to your backend to exchange for an ID token
      navigate('/topup'); // Redirect after successful sign-in
    } else {
      navigate('/login'); // Fallback if something unexpected happens
    }
  }, [navigate]);

  return <p>Processing your login...</p>;
};

export default AuthCallback;
