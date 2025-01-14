import React, { useEffect, useState } from 'react';
import { db, auth } from '../config/firebaseConfig'; // Firebase config
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import TopNavBar from './TopNavBar';
import '../styles/HomeScreen.css';

const HomeScreen = () => {
  const [latestRaffles, setLatestRaffles] = useState([]);
  const [likedRaffles, setLikedRaffles] = useState([]);
  const [popularRaffles, setPopularRaffles] = useState([]);
  const [endingSoon, setEndingSoon] = useState([]);
  const [loading, setLoading] = useState(true);

  // Helper function to calculate the countdown
  const calculateTimeLeft = (endDate) => {
    const difference = new Date(endDate) - new Date();
    if (difference > 0) {
      const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((difference / (1000 * 60)) % 60);
      const seconds = Math.floor((difference / 1000) % 60);
      return `${hours}h ${minutes}m ${seconds}s`;
    }
    return 'Expired';
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const user = auth.currentUser;

        // Fetch latest raffles
        const latestQuery = query(
          collection(db, 'raffles'),
          orderBy('createdAt', 'desc'),
          limit(5)
        );
        const latestSnapshot = await getDocs(latestQuery);
        setLatestRaffles(
          latestSnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(raffle => new Date(raffle.endDate) > new Date()) // Only non-expired raffles
        );

        // Fetch liked raffles
        if (user) {
          const likedQuery = query(
            collection(db, 'likedRaffles'),
            where('userId', '==', user.uid),
            limit(5)
          );
          const likedSnapshot = await getDocs(likedQuery);
          setLikedRaffles(
            likedSnapshot.docs
              .map(doc => ({ id: doc.id, ...doc.data() }))
              .filter(raffle => new Date(raffle.endDate) > new Date()) // Only non-expired raffles
          );
        }

        // Fetch most popular raffles
        const popularQuery = query(
          collection(db, 'raffles'),
          orderBy('likes', 'desc'),
          limit(5)
        );
        const popularSnapshot = await getDocs(popularQuery);
        setPopularRaffles(
          popularSnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(raffle => new Date(raffle.endDate) > new Date()) // Only non-expired raffles
        );

        // Fetch raffles ending soon
        const endingSoonQuery = query(
          collection(db, 'raffles'),
          orderBy('endDate', 'asc'),
          limit(5)
        );
        const endingSoonSnapshot = await getDocs(endingSoonQuery);
        setEndingSoon(
          endingSoonSnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(raffle => new Date(raffle.endDate) > new Date()) // Only non-expired raffles
        );

        setLoading(false);
      } catch (error) {
        console.error('Error fetching raffles:', error);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <TopNavBar />
      <div className="home-container">
        <h1>Welcome to RaffleFox</h1>
        <p>Discover exciting raffles and games!</p>

        <div className="raffle-section">
          <h2>Latest Raffles</h2>
          <div className="raffle-list">
            {latestRaffles.length > 0 ? (
              latestRaffles.map(raffle => (
                <div className="raffle-card" key={raffle.id}>
                  <img src={raffle.picture || 'https://via.placeholder.com/150'} alt={raffle.title} className="raffle-image" />
                  <h3>{raffle.title}</h3>
                  <p>{raffle.description}</p>
                  <p><strong>Price to Play:</strong> ${raffle.costPer}</p>
                  <p><strong>Time Left:</strong> {calculateTimeLeft(raffle.endDate)}</p>
                </div>
              ))
            ) : (
              <p className="no-raffles">No raffles right now, check again later!</p>
            )}
          </div>
        </div>

        <div className="raffle-section">
          <h2>Raffles You Liked</h2>
          <div className="raffle-list">
            {likedRaffles.length > 0 ? (
              likedRaffles.map(raffle => (
                <div className="raffle-card" key={raffle.id}>
                  <img src={raffle.picture || 'https://via.placeholder.com/150'} alt={raffle.title} className="raffle-image" />
                  <h3>{raffle.title}</h3>
                  <p>{raffle.description}</p>
                  <p><strong>Price to Play:</strong> ${raffle.costPer}</p>
                  <p><strong>Time Left:</strong> {calculateTimeLeft(raffle.endDate)}</p>
                </div>
              ))
            ) : (
              <p className="no-raffles">No raffles right now, like a raffle to see it here!</p>
            )}
          </div>
        </div>

        <div className="raffle-section">
          <h2>Most Popular Raffles</h2>
          <div className="raffle-list">
            {popularRaffles.length > 0 ? (
              popularRaffles.map(raffle => (
                <div className="raffle-card" key={raffle.id}>
                  <img src={raffle.picture || 'https://via.placeholder.com/150'} alt={raffle.title} className="raffle-image" />
                  <h3>{raffle.title}</h3>
                  <p>{raffle.description}</p>
                  <p><strong>Price to Play:</strong> ${raffle.costPer}</p>
                  <p><strong>Time Left:</strong> {calculateTimeLeft(raffle.endDate)}</p>
                </div>
              ))
            ) : (
              <p className="no-raffles">No raffles right now, check again later!</p>
            )}
          </div>
        </div>

        <div className="raffle-section">
          <h2>Ending Soon</h2>
          <div className="raffle-list">
            {endingSoon.length > 0 ? (
              endingSoon.map(raffle => (
                <div className="raffle-card" key={raffle.id}>
                  <img src={raffle.picture || 'https://via.placeholder.com/150'} alt={raffle.title} className="raffle-image" />
                  <h3>{raffle.title}</h3>
                  <p>{raffle.description}</p>
                  <p><strong>Price to Play:</strong> ${raffle.costPer}</p>
                  <p><strong>Time Left:</strong> {calculateTimeLeft(raffle.endDate)}</p>
                </div>
              ))
            ) : (
              <p className="no-raffles">No raffles right now, check again later!</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomeScreen;
