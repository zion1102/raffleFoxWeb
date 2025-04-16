import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../config/firebaseConfig';
import queryString from 'query-string';

const TopUpSuccess = () => {
  const navigate = useNavigate();
  const [message, setMessage] = useState('Finalizing your top-up...');

  useEffect(() => {
    const { amount, userId } = queryString.parse(window.location.search);

    const finalizeTopUp = async (user) => {
      try {
        const res = await fetch('https://us-central1-rafflefox-23872.cloudfunctions.net/topupSuccessHandler', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: parseFloat(amount),
            userId,
          }),
        });

        const data = await res.json();
        if (data.success) {
          setMessage(`🎉 ${data.coins} Gold Coins added to your account!`);
          setTimeout(() => navigate('/topup'), 2000);
        } else {
          throw new Error(data.error || 'Unknown error');
        }
      } catch (err) {
        console.error('Top-up finalization failed:', err);
        setMessage('Something went wrong. Please contact support.');
      }
    };

    // Wait for auth state
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user && amount && userId) {
        finalizeTopUp(user);
      } else if (!user) {
        setMessage('You are not logged in. Redirecting to login...');
        setTimeout(() => navigate('/login'), 2000);
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  return <div style={{ padding: '2rem', textAlign: 'center' }}><h2>{message}</h2></div>;
};

export default TopUpSuccess;
