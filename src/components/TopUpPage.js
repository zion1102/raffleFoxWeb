import React, { useState, useEffect } from 'react';
import { auth, db } from '../config/firebaseConfig';
import { collection, query, where, orderBy, getDocs, addDoc, doc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';
import { loadStripe } from '@stripe/stripe-js';
import '../styles/TopUpPage.css';
import TopNavBar from './TopNavBar';

const stripePromise = loadStripe('pk_test_51P6Z3iIL6zapKkuWeKALy7gmHd8wZdQvjZnGJLgA2jV1mYQoKoYMbRqUcEoT8VWAHhvToi73UzEXuqlzYP7HegW100mKY8zXtV'); // 🔥 Replace with your real Stripe public key

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
      const success = urlParams.get('success');
      const amount = parseFloat(urlParams.get('amount'));

      if (currentUser) {
        setUser(currentUser);

        if (success && amount) {
          try {
            // Record the top-up after successful payment
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
            // Clean up the URL to remove query params
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
    const amountToTopUp = selectedAmount || parseFloat(customAmount);
    if (!amountToTopUp || isNaN(amountToTopUp) || amountToTopUp <= 0) {
      alert('Please select or enter a valid top-up amount.');
      return;
    }

    setProcessing(true);

    try {
      const stripe = await stripePromise;

      const session = await stripe.redirectToCheckout({
        lineItems: [{
          price_data: {
            currency: 'ttd',
            product_data: { name: `${amountToTopUp} TTD Gold Coin Top-Up` },
            unit_amount: amountToTopUp * 100,
          },
          quantity: 1,
        }],
        mode: 'payment',
        successUrl: `https://rafflefox.netlify.app/topup?success=true&amount=${amountToTopUp}`,
        cancelUrl: `https://rafflefox.netlify.app/topup?canceled=true`,
      });

      if (session.error) {
        console.error('❌ Stripe Checkout session error:', session.error.message);
        alert('Error redirecting to payment.');
        setProcessing(false);
      }
    } catch (error) {
      console.error('❌ Stripe Checkout creation error:', error);
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
