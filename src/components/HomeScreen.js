import React, { useEffect, useState } from 'react';
import { db } from '../config/firebaseConfig';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import TopNavBar from './TopNavBar';
import { useNavigate } from 'react-router-dom';
import '../styles/HomeScreen.css';

const HomeScreen = () => {
  const [latestRaffles, setLatestRaffles] = useState([]);
  const [popularRaffles, setPopularRaffles] = useState([]);
  const [endingSoon, setEndingSoon] = useState([]);
  const [stickyRaffle, setStickyRaffle] = useState(null);
  const [visibleLatestCount, setVisibleLatestCount] = useState(4);
  const navigate = useNavigate();

  useEffect(() => {
    fetchLatestRaffles();
    fetchPopularRaffles();
    fetchEndingSoonRaffles();
  }, []);

  const fetchLatestRaffles = async () => {
    try {
      const now = new Date();
      const latestQuery = query(
        collection(db, 'raffles'),
        where('expiryDate', '>=', now),
        orderBy('expiryDate', 'asc')
      );
      const snapshot = await getDocs(latestQuery);
      const raffles = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        expiryDate: doc.data().expiryDate?.toDate() || null,
      }));
      setLatestRaffles(raffles);
      if (raffles.length > 0) {
        setStickyRaffle(raffles[Math.floor(Math.random() * raffles.length)]);
      }
    } catch (error) {
      console.error('Error fetching latest raffles:', error);
    }
  };

  const fetchPopularRaffles = async () => {
    try {
      const popularQuery = query(
        collection(db, 'raffles'),
        orderBy('popularity', 'desc')
      );
      const snapshot = await getDocs(popularQuery);
      const raffles = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        expiryDate: doc.data().expiryDate?.toDate() || null,
      }));
      setPopularRaffles(raffles);
    } catch (error) {
      console.error('Error fetching popular raffles:', error);
    }
  };

  const fetchEndingSoonRaffles = async () => {
    try {
      const now = new Date();
      const next7Days = new Date();
      next7Days.setDate(now.getDate() + 7);

      const endingSoonQuery = query(
        collection(db, 'raffles'),
        where('expiryDate', '>=', now),
        where('expiryDate', '<=', next7Days),
        orderBy('expiryDate', 'asc')
      );
      const snapshot = await getDocs(endingSoonQuery);
      const raffles = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        expiryDate: doc.data().expiryDate?.toDate() || null,
      }));
      setEndingSoon(raffles);
    } catch (error) {
      console.error('Error fetching ending soon raffles:', error);
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      const sections = document.querySelectorAll('.fade-in');
      sections.forEach(section => {
        const rect = section.getBoundingClientRect();
        if (rect.top <= window.innerHeight * 0.85) {
          section.classList.add('visible');
        }
      });
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleCardClick = (raffleId) => {
    navigate(`/raffle/${raffleId}`);
  };

  const handleLoadMore = () => {
    setVisibleLatestCount(prev => prev + 4);
  };

  const handleCollapse = () => {
    setVisibleLatestCount(4);
  };

  return (
    <div className="page-background">
      <TopNavBar />
      <div className="confetti-background" />

      <section className="hero-section">
        <div className="hero-content">
          <h1>Win Dream Prizes with <span className="highlight">RaffleFox</span>!</h1>
          <p>Enter raffles, win big — it's that simple.</p>
          
        </div>
      </section>

      {latestRaffles.length > 0 && (
        <section className="featured-raffles fade-in">
          <h2>🚀 Featured Raffles</h2>
          <div className="raffle-grid">
            {latestRaffles.slice(0, visibleLatestCount).map(raffle => (
              <div className="raffle-card tilt" key={raffle.id} onClick={() => handleCardClick(raffle.id)}>
                <img src={raffle.picture || 'https://via.placeholder.com/300'} alt={raffle.title} />
                <div className="raffle-info">
                  <h3>{raffle.title}</h3>
                </div>
              </div>
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            {visibleLatestCount < latestRaffles.length && (
              <button className="cta-button" onClick={handleLoadMore}>Load More</button>
            )}
            {visibleLatestCount > 4 && (
              <button className="cta-button" style={{ marginLeft: '10px', backgroundColor: '#999' }} onClick={handleCollapse}>
                Collapse
              </button>
            )}
          </div>
        </section>
      )}

      {popularRaffles.length > 0 && (
        <section className="popular-raffles fade-in">
          <h2>🔥 Most Popular</h2>
          <div className="raffle-grid">
            {popularRaffles.map(raffle => (
              <div className="raffle-card tilt" key={raffle.id} onClick={() => handleCardClick(raffle.id)}>
                <img src={raffle.picture || 'https://via.placeholder.com/300'} alt={raffle.title} />
                <div className="raffle-info">
                  <h3>{raffle.title}</h3>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {endingSoon.length > 0 && (
        <section className="ending-soon fade-in">
          <h2>⏳ Ending Soon</h2>
          <div className="raffle-grid">
            {endingSoon.map(raffle => (
              <div className="raffle-card tilt" key={raffle.id} onClick={() => handleCardClick(raffle.id)}>
                <img src={raffle.picture || 'https://via.placeholder.com/300'} alt={raffle.title} />
                <div className="raffle-info">
                  <h3>{raffle.title}</h3>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <footer className="footer-cta">
        <h2>Ready to Win?</h2>
        
      </footer>

      {stickyRaffle && (
        <div className="sticky-featured bounce-in" onClick={() => handleCardClick(stickyRaffle.id)}>
          <img src={stickyRaffle.picture || 'https://via.placeholder.com/150'} alt={stickyRaffle.title} />
          <div className="sticky-content">
            <h4>{stickyRaffle.title}</h4>
            <button className="small-cta">Play</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomeScreen;
