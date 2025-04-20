import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../config/firebaseConfig';
import { signInWithCustomToken } from 'firebase/auth';
import axios from 'axios';

const TopUpSuccess = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState('Finalizing top-up...');

  useEffect(() => {
    const finalizeTopUp = async () => {
      const params = new URLSearchParams(window.location.search);
      const amount = parseFloat(params.get('amount'));
      const userId = params.get('userId');
      const token = params.get('token');

      if (!amount || !userId || !token) {
        alert('Missing top-up info.');
        navigate('/login');
        return;
      }

      try {
        // 🔐 Authenticate silently using the token
        await signInWithCustomToken(auth, token);
        console.log('✅ Signed in successfully.');

        // 💾 Finalize the top-up
        const res = await axios.post(
          'https://us-central1-rafflefox-23872.cloudfunctions.net/topupSuccessHandler',
          { amount, userId },
          { headers: { 'Content-Type': 'application/json' } }
        );

        if (res.data.success) {
          alert(`✅ ${res.data.coins} gold coins added!`);
        } else {
          alert('⚠️ Top-up saved, but something went wrong.');
        }

        navigate('/topup'); // ✅ redirect to topup
      } catch (error) {
        console.error('Top-up error:', error);
        alert('Top-up failed.');
        navigate('/login');
      }
    };

    finalizeTopUp();
  }, [navigate]);

  return <p>{status}</p>;
};

export default TopUpSuccess;
