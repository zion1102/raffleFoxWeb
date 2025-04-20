import React, { useEffect, useState } from 'react';
import { auth } from '../config/firebaseConfig';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const TopUpSuccess = () => {
  const [status, setStatus] = useState('Processing top-up...');
  const navigate = useNavigate();

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const amount = urlParams.get('amount');
    const userId = urlParams.get('userId');
    const token = urlParams.get('token');

    if (!amount || !userId || !token) {
      setStatus('Missing data in redirect URL.');
      return;
    }

    const processTopUp = async () => {
      try {
        // 1️⃣ Authenticate the user
        await auth.signInWithCustomToken(token);

        // 2️⃣ Call the backend to finalize top-up
        await axios.post(
          'https://us-central1-rafflefox-23872.cloudfunctions.net/topupSuccessHandler',
          { amount: parseFloat(amount), userId },
          { headers: { 'Content-Type': 'application/json' } }
        );

        setStatus('Top-up successful! Redirecting...');
        setTimeout(() => navigate('/topup'), 3000); // go back to TopUp screen
      } catch (err) {
        console.error('Top-up processing error:', err);
        setStatus('Error finalizing top-up.');
      }
    };

    processTopUp();
  }, [navigate]);

  return (
    <div className="topup-success-container">
      <h2>{status}</h2>
    </div>
  );
};

export default TopUpSuccess;
