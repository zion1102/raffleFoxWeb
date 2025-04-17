import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../config/firebaseConfig';
import { signInWithCustomToken } from 'firebase/auth';
import axios from 'axios';

const TopUpSuccess = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const finalizeTopUp = async () => {
      const params = new URLSearchParams(window.location.search);
      const amount = parseFloat(params.get('amount'));
      const userId = params.get('userId');
      const token = params.get('token');

      if (!amount || !userId || !token) {
        alert('Missing top-up information.');
        navigate('/login');
        return;
      }

      try {
        // Sign in the user silently using the custom token
        await signInWithCustomToken(auth, token);

        // Finalize the top-up by calling your backend
        const res = await axios.post(
          'https://us-central1-rafflefox-23872.cloudfunctions.net/topupSuccessHandler',
          { amount, userId },
          { headers: { 'Content-Type': 'application/json' } }
        );

        if (res.data.success) {
          alert(`Successfully added ${res.data.coins} gold coins!`);
        } else {
          console.error(res.data);
          alert('Top-up recorded, but something went wrong.');
        }

        navigate('/topup');
      } catch (error) {
        console.error('Finalizing top-up failed:', error);
        alert('Top-up failed. Please try again.');
        navigate('/login');
      }
    };

    finalizeTopUp();
  }, [navigate]);

  return <p>Finalizing top-up...</p>;
};

export default TopUpSuccess;
