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
  const [user, setUser] = useState(null);
  const [timeLeft, setTimeLeft] = useState({});

  useEffect(() => {
    const fetchRaffles = async () => {
      try {
        setLoading(true);
        const now = new Date();
        const next7Days = new Date();
        next7Days.setDate(next7Days.getDate() + 7); // Calculate date 7 days ahead

        // Fetch latest raffles
        const latestQuery = query(
          collection(db, 'raffles'),
          where('expiryDate', '>=', now),
          orderBy('expiryDate', 'asc'),
          limit(5)
        );
        const latestSnapshot = await getDocs(latestQuery);
        const latestData = latestSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          expiryDate: doc.data().expiryDate.toDate(),
        }));
        setLatestRaffles(latestData);
        console.log('Latest Raffles:', latestData);

        // Check if user is logged in
        const currentUser = auth.currentUser;
        setUser(currentUser);

        if (currentUser) {
          // Fetch liked raffles
          const likedQuery = query(
            collection(db, 'userLikes'),
            where('userId', '==', currentUser.uid),
            limit(5)
          );
          const likedSnapshot = await getDocs(likedQuery);
          const likedRaffleIds = likedSnapshot.docs.map(doc => doc.data().raffleId);

          // Fetch details for liked raffles
          if (likedRaffleIds.length > 0) {
            const likedRafflesQuery = query(
              collection(db, 'raffles'),
              where('raffleId', 'in', likedRaffleIds)
            );
            const likedRafflesSnapshot = await getDocs(likedRafflesQuery);
            const likedRafflesData = likedRafflesSnapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data(),
              expiryDate: doc.data().expiryDate.toDate(),
            }));
            setLikedRaffles(likedRafflesData);
            console.log('Liked Raffles:', likedRafflesData);
          }
        }

        // Fetch most popular raffles based on userLikes
        const likesSnapshot = await getDocs(collection(db, 'userLikes'));
        const likeCounts = {};
        likesSnapshot.docs.forEach(doc => {
          const raffleId = doc.data().raffleId;
          likeCounts[raffleId] = (likeCounts[raffleId] || 0) + 1;
        });

        // Fetch details for the top liked raffles
        const mostLikedRaffleIds = Object.keys(likeCounts)
          .sort((a, b) => likeCounts[b] - likeCounts[a])
          .slice(0, 5);

        if (mostLikedRaffleIds.length > 0) {
          const mostLikedQuery = query(
            collection(db, 'raffles'),
            where('raffleId', 'in', mostLikedRaffleIds)
          );
          const mostLikedSnapshot = await getDocs(mostLikedQuery);
          const mostLikedData = mostLikedSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            expiryDate: doc.data().expiryDate.toDate(),
            likes: likeCounts[doc.id] || 0,
          }));
          setPopularRaffles(mostLikedData);
          console.log('Most Liked Raffles:', mostLikedData);
        }

        // Fetch raffles ending soon (expiryDate within the next 7 days)
        const endingSoonQuery = query(
          collection(db, 'raffles'),
          where('expiryDate', '>=', now),
          where('expiryDate', '<=', next7Days),
          orderBy('expiryDate', 'asc'),
          limit(5)
        );
        const endingSoonSnapshot = await getDocs(endingSoonQuery);
        const endingSoonData = endingSoonSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          expiryDate: doc.data().expiryDate.toDate(),
        }));
        setEndingSoon(endingSoonData);
        console.log('Ending Soon Raffles:', endingSoonData);

        setLoading(false);
      } catch (error) {
        console.error('Error fetching raffles:', error);
        setLoading(false);
      }
    };

    fetchRaffles();
  }, []);

  // ⏳ Live Countdown Timer Effect
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(prevTime => {
        const updatedTime = {};
        [...latestRaffles, ...popularRaffles, ...endingSoon, ...likedRaffles].forEach(raffle => {
          const difference = raffle.expiryDate - new Date();
          if (difference > 0) {
            updatedTime[raffle.id] = {
              days: Math.floor(difference / (1000 * 60 * 60 * 24)),
              hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
              minutes: Math.floor((difference / (1000 * 60)) % 60),
              seconds: Math.floor((difference / 1000) % 60),
            };
          } else {
            updatedTime[raffle.id] = 'Expired';
          }
        });
        return updatedTime;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [latestRaffles, popularRaffles, endingSoon, likedRaffles]);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <TopNavBar />
      <div className="home-container">
        <h1>Welcome to RaffleFox</h1>
        <p>Discover exciting raffles and games!</p>

        {[{ title: 'Latest Raffles', data: latestRaffles },
          { title: 'Most Popular Raffles', data: popularRaffles },
          { title: 'Ending Soon', data: endingSoon }].map(({ title, data }) => (
          <div className="raffle-section" key={title}>
            <h2>{title}</h2>
            <div className="raffle-list">
              {data.length > 0 ? (
                data.map(raffle => (
                  <div className="raffle-card" key={raffle.id}>
                    <img src={raffle.picture || 'https://via.placeholder.com/150'} alt={raffle.title} className="raffle-image" />
                    <h3>{raffle.title}</h3>
                    <p>{raffle.description}</p>
                    <p><strong>Price to Play:</strong> ${raffle.costPer}</p>
                    <p><strong>Time Left:</strong> 
                      {timeLeft[raffle.id] !== 'Expired' ? (
                        `${timeLeft[raffle.id]?.days}d ${timeLeft[raffle.id]?.hours}h ${timeLeft[raffle.id]?.minutes}m ${timeLeft[raffle.id]?.seconds}s`
                      ) : 'Expired'}
                    </p>
                  </div>
                ))
              ) : (
                <p className="no-raffles">No raffles right now, check again later!</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HomeScreen;
