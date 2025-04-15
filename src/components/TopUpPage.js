import React, { useState, useEffect } from 'react';
import { auth } from '../config/firebaseConfig';
import { signInWithEmailAndPassword } from 'firebase/auth';
import queryString from 'query-string';
import '../styles/TopUpPage.css';
import TopNavBar from './TopNavBar';
import axios from 'axios';

const packages = [10, 20, 50, 100];

const TopUpPage = () => {
  const [selectedAmount, setSelectedAmount] = useState(null);
  const [topups, setTopups] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const params = queryString.parse(window.location.search);
      const userId = params.userId;
      const email = params.email;

      if (userId && email) {
        try {
          const userCredential = await signInWithEmailAndPassword(auth, email, 'defaultpassword');
          setUser(userCredential.user);
          await fetchTopUps(userCredential.user.uid);
        } catch (error) {
          console.error("Auto-login failed:", error);
        }
      } else {
        auth.onAuthStateChanged(async (currentUser) => {
          if (currentUser) {
            setUser(currentUser);
            await fetchTopUps(currentUser.uid);
          }
        });
      }

      setLoading(false);
    };

    checkAuth();
  }, []);

  const fetchTopUps = async (userId) => {
    try {
      const res = await fetch(
        `https://firestore.googleapis.com/v1/projects/rafflefox-23872/databases/(default)/documents/topups?orderBy=createTime desc`
      );
      const data = await res.json();
      if (data.documents) {
        const filtered = data.documents.filter(doc => doc.fields.userId?.stringValue === userId);
        setTopups(filtered.map(doc => ({
          id: doc.name.split('/').pop(),
          amount: doc.fields.amount.integerValue,
          timestamp: doc.createTime
        })));
      }
    } catch (error) {
      console.error('Error fetching top-ups:', error);
    }
  };

  const handleTopUp = async () => {
    if (!selectedAmount || !user) {
      alert('Please select a top-up amount.');
      return;
    }

    setProcessing(true);
    try {
      const response = await axios.post(
        'https://us-central1-rafflefox-23872.cloudfunctions.net/createCheckoutSession',
        { amount: selectedAmount, userId: user.uid },
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
  if (!user) return <div className="loading">Please log in to view your top-ups.</div>;

  return (
    <div>
      <TopNavBar />
      <div className="topup-container">
        <h2>Top Up Your Credits</h2>

        <div className="package-options">
          {packages.map((pkg) => (
            <button
              key={pkg}
              className={`package-button ${selectedAmount === pkg ? 'selected' : ''}`}
              onClick={() => setSelectedAmount(pkg)}
            >
              {pkg} TTD
            </button>
          ))}
        </div>

        <button
          className={`submit-button ${!selectedAmount || processing ? 'disabled' : ''}`}
          disabled={!selectedAmount || processing}
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
                  {topup.amount} TTD <span className="timestamp">{new Date(topup.timestamp).toLocaleString()}</span>
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
