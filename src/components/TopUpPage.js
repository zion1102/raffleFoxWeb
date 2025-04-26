import React, { useState, useEffect } from 'react';
import { auth, db } from '../config/firebaseConfig';
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  addDoc,
  doc,
  updateDoc,
  increment,
  serverTimestamp,
} from 'firebase/firestore';
import { loadStripe } from '@stripe/stripe-js';
import '../styles/TopUpPage.css';
import TopNavBar from './TopNavBar';
import axios from 'axios';

const stripePromise = loadStripe('pk_test_51P6Z3iIL6zapKkuWeKALy7gmHd8wZdQvjZnGJLgA2jV1mYQoKoYMbRqUcEoT8VWAHhvToi73UzEXuqlzYP7HegW100mKY8zXtV');

// 🔥 Predefined packages and their Stripe price IDs
const packages = [
  { amount: 10, priceId: 'prod_SCdmLAUSkHu2tX' },
  { amount: 20, priceId: 'price_1P7xeGIL6zapKkuWsrfvQOoh' },
  { amount: 50, priceId: 'price_1P7xeWIL6zapKkuWqMGpHz0l' },
  { amount: 100, priceId: 'price_1P7xefIL6zapKkuWZDn8MNn7' },
];

const TopUpPage = () => {
  const [selectedAmount, setSelectedAmount] = useState(null);
  const [customAmount, setCustomAmount] = useState('');
  const [topups, setTopups] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      const urlParams = new URLSearchParams(window.location.search);
      const success = urlParams.get('success');
      const amount = parseFloat(urlParams.get('amount'));

      if (currentUser) {
        setUser(currentUser);

        if (success && amount) {
          try {
            await addDoc(collection(db, 'topups'), {
              userId: currentUser.uid,
              amount,
              coins: Math.floor(amount / 10),
              createdAt: serverTimestamp(),
            });

            const userRef = doc(db, 'users', currentUser.uid);
            await updateDoc(userRef, {
              credits: increment(Math.floor(amount / 10)),
            });

            console.log('✅ Top-up and credits updated.');
            window.history.replaceState(null, '', '/topup');
          } catch (error) {
            console.error('❌ Error updating Firestore after payment:', error);
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
      console.error('❌ Error fetching top-ups:', error);
    }
  };

  const handleTopUp = async () => {
    const stripe = await stripePromise;
    const amountToTopUp = selectedAmount || parseFloat(customAmount);

    if (!amountToTopUp || isNaN(amountToTopUp) || amountToTopUp <= 0) {
      alert('Please select or enter a valid top-up amount.');
      return;
    }

    setProcessing(true);

    try {
      if (selectedAmount) {
        // 🧡 Predefined package flow (fixed price ID)
        const selectedPackage = packages.find((p) => p.amount === selectedAmount);
        if (!selectedPackage) throw new Error('Invalid package selected.');

        await stripe.redirectToCheckout({
          lineItems: [{ price: selectedPackage.priceId, quantity: 1 }],
          mode: 'payment',
          successUrl: `https://rafflefox.netlify.app/topup?success=true&amount=${selectedPackage.amount}`,
          cancelUrl: `https://rafflefox.netlify.app/topup?canceled=true`,
        });
      } else {
        // 💙 Custom amount flow (dynamic Stripe session)
        const res = await axios.post('https://us-central1-rafflefox-23872.cloudfunctions.net/api/createCheckoutSession', {
          amount: amountToTopUp,
          userId: user.uid,
        });

        window.location.href = res.data.url;
      }
    } catch (error) {
      console.error('❌ Stripe checkout error:', error);
      alert('Error processing payment.');
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
                key={pkg.amount}
                className={`package-button ${selectedAmount === pkg.amount ? 'selected' : ''}`}
                onClick={() => {
                  setSelectedAmount(pkg.amount);
                  setCustomAmount('');
                }}
              >
                {pkg.amount} TTD
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
