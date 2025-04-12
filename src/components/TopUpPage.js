import React, { useState, useEffect } from 'react';
import { auth } from '../config/firebaseConfig';
import { signInWithEmailAndPassword } from 'firebase/auth';
import queryString from 'query-string';
import '../styles/TopUpPage.css';
import TopNavBar from './TopNavBar';
import axios from 'axios';

const packages = [10, 20, 50, 100]; // TTD packages

const TopUpPage = () => {
  const [selectedAmount, setSelectedAmount] = useState(null);
  const [topups, setTopups] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

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
      const res = await fetch(`https://firestore.googleapis.com/v1/projects/rafflefox-23872/databases/(default)/documents/topups?orderBy=createTime desc`);
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

    try {
      const response = await axios.post(
        'https://us-central1-rafflefox-23872.cloudfunctions.net/createCheckoutSession',
        { amount: selectedAmount, userId: user.uid },
        { headers: { 'Content-Type': 'application/json' } }
      );

      if (response.data.url) {
        window.location.href = response.data.url;
      } else {
        alert('Stripe session error.');
      }
    } catch (error) {
      console.error('Stripe error:', error);
      alert('Error creating Stripe session.');
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!user) return <div>Please log in to view your top-ups.</div>;

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
          className="submit-button"
          disabled={!selectedAmount}
          onClick={handleTopUp}
        >
          Proceed to Payment
        </button>

        <div className="previous-topups">
          <h3>Previous Top-Ups</h3>
          {topups.length > 0 ? (
            <ul>
              {topups.map((topup) => (
                <li key={topup.id}>
                  {topup.amount} TTD - {new Date(topup.timestamp).toLocaleString()}
                </li>
              ))}
            </ul>
          ) : (
            <p>No previous top-ups found.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default TopUpPage;
