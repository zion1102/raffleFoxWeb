import React, { useState, useEffect } from 'react';
import { db, auth } from '../config/firebaseConfig';
import { doc, updateDoc, collection, addDoc, query, where, orderBy, getDocs, increment } from 'firebase/firestore';
import '../styles/TopUpPage.css';
import TopNavBar from './TopNavBar';
import LoginPage from './LoginPage'; // 👈 Import login page

const TopUpPage = () => {
  const [amount, setAmount] = useState(0);
  const [topups, setTopups] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Listen for auth state
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
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
      const topupsSnapshot = await getDocs(q);
      if (!topupsSnapshot.empty) {
        setTopups(topupsSnapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id })));
      }
    } catch (error) {
      console.error('Error fetching top-ups:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (amount > 0 && user) {
      try {
        await addDoc(collection(db, 'topups'), {
          userId: user.uid,
          amount: Number(amount),
          createdAt: new Date(),
        });

        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
          credits: increment(Number(amount)),
        });

        await fetchTopUps(user.uid);
        setAmount(0);
        alert('Top-up successful!');
      } catch (error) {
        console.error('Error processing top-up:', error);
      }
    } else {
      alert('Please enter a valid top-up amount.');
    }
  };

  if (loading) return <div>Loading...</div>;

  // 👇 If not logged in, show LoginPage
  if (!user) {
    return <LoginPage redirectAfterLogin="/topup" />;
  }

  return (
    <div>
      <TopNavBar />
      <div className="topup-container">
        <h2>Top Up Your Credits</h2>
        <form onSubmit={handleSubmit} className="topup-form">
          <label>Amount to Top-Up (TTD)</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            min="1"
          />
          <button type="submit" className="submit-button">Top Up</button>
        </form>

        <div className="previous-topups">
          <h3>Previous Top-Ups</h3>
          {topups.length > 0 ? (
            <ul>
              {topups.map((topup) => (
                <li key={topup.id}>
                  {topup.amount} TTD - {new Date(topup.createdAt.seconds * 1000).toLocaleString()}
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
