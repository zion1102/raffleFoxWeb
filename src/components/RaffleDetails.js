import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../config/firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import TopNavBar from './TopNavBar';
import '../styles/RaffleDetail.css';

const RaffleDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [raffle, setRaffle] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRaffle = async () => {
      try {
        if (!id || typeof id !== 'string') {
          setError('Invalid raffle ID provided.');
          setLoading(false);
          return;
        }

        const raffleRef = doc(db, 'raffles', id.trim());
        const raffleSnap = await getDoc(raffleRef);

        if (raffleSnap.exists()) {
          const data = raffleSnap.data();
          setRaffle({
            ...data,
            expiryDate: data.expiryDate?.toDate() || null,
          });
        } else {
          setError('Raffle not found. Please check the URL or try again later.');
        }
      } catch (err) {
        console.error('Error fetching raffle:', err);
        setError('An unexpected error occurred while fetching raffle details.');
      } finally {
        setLoading(false);
      }
    };

    fetchRaffle();
  }, [id]);

  const handlePlayNow = () => {
    navigate(`/game/${id}`);
  };

  if (loading) {
    return (
      <div className="raffle-detail-page">
        <TopNavBar />
        <div className="raffle-detail-container">
          <p style={{ padding: '40px', textAlign: 'center' }}>Loading Raffle Details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="raffle-detail-page">
        <TopNavBar />
        <div className="raffle-detail-container">
          <p style={{ padding: '40px', textAlign: 'center', color: 'red' }}>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="raffle-detail-page">
      <TopNavBar />
      <div className="raffle-detail-container fade-in visible">
        <img
          className="raffle-detail-image"
          src={raffle.picture || 'https://via.placeholder.com/600x400'}
          alt={raffle.title}
        />
        <div className="raffle-detail-info">
          <h1>{raffle.title}</h1>
          {raffle.detailOne && <p className="raffle-extra">{raffle.detailOne}</p>}
          {raffle.detailTwo && <p className="raffle-extra">{raffle.detailTwo}</p>}
          {raffle.detailThree && <p className="raffle-extra">{raffle.detailThree}</p>}
          <div className="raffle-prize-tag">Price to Play: ${raffle.costPer}</div>
          {raffle.expiryDate && (
            <div className="raffle-expiry">
              Entries close: {raffle.expiryDate.toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </div>
          )}
          <button className="cta-button large" onClick={handlePlayNow}>Play Now</button>
  
          {/* 🎯 Move description here BELOW everything */}
          {raffle.description && (
            <p className="raffle-desc" style={{ marginTop: '2rem' }}>{raffle.description}</p>
          )}
        </div>
      </div>
    </div>
  );
  
};

export default RaffleDetail;
