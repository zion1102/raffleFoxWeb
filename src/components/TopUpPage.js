import React, { useState, useEffect } from 'react';
import { db, auth } from '../config/firebaseConfig'; // Import Firebase Firestore and Auth
import { doc, updateDoc, collection, addDoc, query, where, orderBy, getDocs, increment } from 'firebase/firestore'; // Import Firestore functions, including increment
import '../styles/TopUpPage.css';
import TopNavBar from './TopNavBar';

const TopUpPage = () => {
  const [amount, setAmount] = useState(0);
  const [topups, setTopups] = useState([]); // State to hold previous top-ups
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);  // New state for loading

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        await fetchTopUps(currentUser.uid);
      }
      setLoading(false);  // Set loading to false after data fetch
    });

    return () => unsubscribe();  // Cleanup listener on component unmount
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
        const topupData = topupsSnapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }));
        console.log('Fetched top-ups:', topupData); // Log the top-ups
        setTopups(topupData);  // Update state
      } else {
        console.log('No top-ups found.');
      }
    } catch (error) {
      console.error('Error fetching top-ups:', error); // Log the error if any
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (amount > 0 && user) {
      try {
        // Add top-up to Firestore
        await addDoc(collection(db, 'topups'), {
          userId: user.uid,
          amount: Number(amount),
          createdAt: new Date(),
        });

        // Update user's credits in the 'users' collection
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
          credits: increment(Number(amount)), // Use the increment function here
        });

        // Refetch top-ups after a successful top-up
        await fetchTopUps(user.uid);
        setAmount(0); // Reset amount after top-up
        alert('Top-up successful!');
      } catch (error) {
        console.error('Error processing top-up:', error);
      }
    } else {
      alert('Please enter a valid top-up amount.');
    }
  };

  if (loading) {
    return <div>Loading...</div>;  // Show loading message while data is being fetched
  }
  
  if (!user) {
    return <div>Please log in to view your top-ups.</div>; // Display message if user is not logged in
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
