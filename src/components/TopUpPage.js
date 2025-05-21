import React, { useState, useEffect } from 'react';
import { auth, db } from '../config/firebaseConfig';
import {
  collection, query, where, getDocs, addDoc, doc,
  updateDoc, increment, serverTimestamp
} from 'firebase/firestore';
import { loadStripe } from '@stripe/stripe-js';
import '../styles/TopUpPage.css';
import TopNavBar from './TopNavBar';
import axios from 'axios';
import coinImg from '../assets/dollar.png';

const stripePromise = loadStripe('pk_test_51P6Z3iIL6zapKkuWeKALy7gmHd8wZdQvjZnGJLgA2jV1mYQoKoYMbRqUcEoT8VWAHhvToi73UzEXuqlzYP7HegW100mKY8zXtV');

const packages = {
  TTD: [10, 20, 50, 100],
  USD: [1.5, 3.0, 7.5, 15.0]
};

const conversionRate = {
  TTD: 10,
  USD: 1.5
};

const TopUpPage = () => {
  const [currency, setCurrency] = useState('TTD');
  const [selectedAmount, setSelectedAmount] = useState(null);
  const [customAmount, setCustomAmount] = useState('');
  const [topups, setTopups] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [showCoin, setShowCoin] = useState(false);
  const [customAmountValid, setCustomAmountValid] = useState(true);

  const interval = currency === 'TTD' ? 10 : 1.5;

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        const urlParams = new URLSearchParams(window.location.search);
        const success = urlParams.get('success');
        const amount = parseFloat(urlParams.get('amount'));
        const currencyParam = urlParams.get('currency') || 'TTD';

        if (success && amount) {
          try {
            const coins = Math.floor(amount / conversionRate[currencyParam]);

            await addDoc(collection(db, 'topups'), {
              userId: currentUser.uid,
              amount,
              currency: currencyParam,
              coins,
              createdAt: serverTimestamp()
            });

            await updateDoc(doc(db, 'users', currentUser.uid), {
              credits: increment(coins)
            });

            setShowCoin(true);
            setTimeout(() => setShowCoin(false), 3000);

            window.history.replaceState(null, '', '/topup');
          } catch (err) {
            console.error('❌ Firestore update error:', err);
          }
        }

        await fetchTopUps(currentUser.uid);
      } else {
        setUser(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const fetchTopUps = async (uid) => {
    try {
      const q = query(collection(db, 'topups'), where('userId', '==', uid));
      const snapshot = await getDocs(q);
      const results = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        const ts = data.createdAt?.toDate?.() || new Date(data.createdAt);
        return {
          id: docSnap.id,
          amount: data.amount,
          currency: data.currency,
          coins: data.coins,
          timestamp: ts
        };
      });

      results.sort((a, b) => b.timestamp - a.timestamp);
      setTopups(results);
    } catch (err) {
      console.error('❌ Error fetching top-ups:', err);
    }
  };

  const handleCustomChange = (e) => {
    const val = e.target.value;
    setCustomAmount(val);
    setSelectedAmount(null);

    const floatVal = parseFloat(val);
    const valid = !isNaN(floatVal) && floatVal > 0 && (floatVal * 100) % (interval * 100) === 0;
    setCustomAmountValid(valid);
  };

  const handleDropdownSelect = (e) => {
    const val = parseFloat(e.target.value);
    if (!isNaN(val)) {
      setSelectedAmount(val);
      setCustomAmount('');
      setCustomAmountValid(true);
    }
  };

  const handleTopUp = async () => {
    const stripe = await stripePromise;
    const amount = selectedAmount || parseFloat(customAmount);

    if (!amount || isNaN(amount) || amount <= 0 || !customAmountValid) {
      alert('Please enter a valid amount.');
      return;
    }

    setProcessing(true);

    try {
      const successUrl = `https://rafflefox.netlify.app/topup?success=true&amount=${amount}&currency=${currency}`;
      const cancelUrl = `https://rafflefox.netlify.app/topup?canceled=true`;

      const res = await axios.post('https://us-central1-rafflefox-23872.cloudfunctions.net/api/createCheckoutSession', {
        amount,
        userId: user.uid,
        currency
      });

      window.location.href = res.data.url;
    } catch (err) {
      console.error('❌ Stripe error:', err);
      alert('Payment error occurred.');
    } finally {
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

        <div className="currency-toggle">
          <button className={currency === 'TTD' ? 'active' : ''} onClick={() => {
            setCurrency('TTD');
            setCustomAmount('');
            setSelectedAmount(null);
            setCustomAmountValid(true);
          }}>🇹🇹 TTD</button>
          <button className={currency === 'USD' ? 'active' : ''} onClick={() => {
            setCurrency('USD');
            setCustomAmount('');
            setSelectedAmount(null);
            setCustomAmountValid(true);
          }}>🇺🇸 USD</button>
        </div>

        <div className="conversion-rate">
          <img src={coinImg} alt="Gold coin" className="inline-coin" /> = {conversionRate[currency].toFixed(2)} {currency}
        </div>

        <div className="section">
          <p className="section-label">Choose a package:</p>
          <div className="package-options">
            {packages[currency].map((pkg) => (
              <button
                key={pkg}
                className={`package-button ${selectedAmount === pkg ? 'selected' : ''}`}
                onClick={() => {
                  setSelectedAmount(pkg);
                  setCustomAmount('');
                  setCustomAmountValid(true);
                }}
              >
                {pkg} {currency}
              </button>
            ))}
          </div>
        </div>

        <div className="section">
          <p className="section-label">Or enter custom amount:</p>
          <input
            type="number"
            step={interval}
            min={interval}
            placeholder={`Enter amount (${currency})`}
            value={customAmount}
            onChange={handleCustomChange}
            className={`custom-amount-input ${!customAmountValid ? 'invalid' : ''}`}
          />
          <select
            className="dropdown-selector"
            onChange={handleDropdownSelect}
            value=""
          >
            <option value="">-- Select amount --</option>
            {Array.from({ length: 20 }, (_, i) => (i + 1) * interval).map((amt) => (
              <option key={amt} value={amt}>{amt} {currency}</option>
            ))}
          </select>
        </div>

        <button
          className={`submit-button ${(!selectedAmount && (!customAmount || !customAmountValid)) || processing ? 'disabled' : ''}`}
          disabled={(!selectedAmount && (!customAmount || !customAmountValid)) || processing}
          onClick={handleTopUp}
        >
          {processing ? 'Redirecting...' : 'Proceed to Payment'}
        </button>

        {showCoin && (
          <div className="coin-animation-wrapper">
            <img src={coinImg} alt="Gold Coin" className="coin-animation" />
          </div>
        )}

        <div className="previous-topups">
          <h3>Previous Top-Ups</h3>
          {topups.length > 0 ? (
            <ul>
              {topups.map((topup) => (
                <li key={topup.id}>
                  {topup.amount} {topup.currency} → 
                  <img src={coinImg} alt="Gold Coin" className="inline-coin" /> {topup.coins}
                  <span className="timestamp">{topup.timestamp.toLocaleString()}</span>
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
