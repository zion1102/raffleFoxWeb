import React, { useState, useEffect } from 'react';
import { auth, db } from '../config/firebaseConfig';
import {
  collection,
  query,
  where,
  orderBy,
  getDocs
} from 'firebase/firestore';
import '../styles/TopUpPage.css';
import TopNavBar from './TopNavBar';
import axios from 'axios';

const packages = [10, 20, 50, 100];

const TopUpPage = () => {
  const [selectedAmount, setSelectedAmount] = useState(null);
  const [customAmount, setCustomAmount] = useState('');
  const [topups, setTopups] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      const urlParams = new URLSearchParams(window.location.search);
      const amount = urlParams.get('amount');
      const userId = urlParams.get('userId');
      const token = urlParams.get('token');

      if (token && userId && amount) {
        try {
          await auth.signInWithCustomToken(token);
          await axios.post(
            'https://us-central1-rafflefox-23872.cloudfunctions.net/api/topupSuccessHandler', // ✅ FIXED URL
            { amount: parseFloat(amount), userId },
            { headers: { 'Content-Type': 'application/json' } }
          );
          window.history.replaceState(null, '', '/topup');
        } catch (err) {
          console.error('Top-up post-processing failed:', err);
        }
      }

      if (currentUser) {
        setUser(currentUser);
        await fetchTopUps(currentUser.uid);
      } else {
        setUser(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const fetchTopUps = async (userId) => {
    try {
      const q = query(
        collection(db, 'topups'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      const results = querySnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          amount: data.amount,
          coins: data.coins,
          timestamp: data.createdAt?.toDate?.() || new Date(),
        };
      });
      setTopups(results);
    } catch (error) {
      console.error('Error fetching top-ups:', error);
    }
  };

  const handleTopUp = async () => {
    const amountToTopUp = selectedAmount || parseFloat(customAmount);
    if (!amountToTopUp || isNaN(amountToTopUp) || amountToTopUp <= 0) {
      alert('Please select or enter a valid top-up amount.');
      return;
    }

    setProcessing(true);
    try {
      const response = await axios.post(
        'https://us-central1-rafflefox-23872.cloudfunctions.net/api/createCheckoutSession', // ✅ FIXED URL
        { amount: amountToTopUp, userId: user.uid },
        { headers: { 'Content-Type': 'application/json' } }
      );

      if (response.data.url) {
        setShowSuccess(true);
        setTimeout(() => {
          window.location.href = response.data.url;
        }, 1000);
      } else {
        alert('Stripe session error.');
        setProcessing(false);
      }
    } catch (error) {
      console.error('Stripe error:', error);
      alert('Error creating Stripe session.');
      setProcessing(false);
    }
  };

  if (loading) return <div className="loading">Loading...</div>;
  if (!user) return <div className="loading">Please log in to view your gold coin purchases.</div>;

  return (
    <div>
      <TopNavBar />
      <div className="topup-container">
        <h2>Top Up Your Gold Coins</h2>

        <div className="section">
          <p className="section-label">Choose a package:</p>
          <div className="package-options">
            {packages.map((pkg) => (
              <button
                key={pkg}
                className={`package-button ${selectedAmount === pkg ? 'selected' : ''}`}
                onClick={() => {
                  setSelectedAmount(pkg);
                  setCustomAmount('');
                }}
              >
                {pkg} TTD
              </button>
            ))}
          </div>
        </div>

        <div className="section">
          <p className="section-label">Or enter custom amount:</p>
          <input
            type="number"
            min="1"
            placeholder="Enter amount (TTD)"
            value={customAmount}
            onChange={(e) => {
              setCustomAmount(e.target.value);
              setSelectedAmount(null);
            }}
            className="custom-amount-input"
          />
        </div>

        <button
          className={`submit-button ${(!selectedAmount && !customAmount) || processing ? 'disabled' : ''}`}
          disabled={(!selectedAmount && !customAmount) || processing}
          onClick={handleTopUp}
        >
          {processing ? 'Redirecting...' : 'Proceed to Payment'}
        </button>

        {showSuccess && (
          <div className="success-popup">
            <div className="checkmark-circle">&#10003;</div>
            <p>Redirecting to payment...</p>
          </div>
        )}

        <div className="previous-topups">
          <h3>Previous Top-Ups</h3>
          {topups.length > 0 ? (
            <ul>
              {topups.map((topup) => (
                <li key={topup.id}>
                  {topup.amount} TTD → {topup.coins} gold coins
                  <span className="timestamp">{new Date(topup.timestamp).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="no-topups">No previous top-ups found.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default TopUpPage;
