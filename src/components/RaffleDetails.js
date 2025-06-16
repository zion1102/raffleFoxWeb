import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, auth } from '../config/firebaseConfig';
import { doc, getDoc, collection, query, where, getDocs, addDoc, deleteDoc } from 'firebase/firestore';
import TopNavBar from './TopNavBar';
import styles from '../styles/RaffleDetail.module.css';
import { FaHeart, FaRegHeart } from 'react-icons/fa';

const RaffleDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [raffle, setRaffle] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [likeDocId, setLikeDocId] = useState(null);
  const [likeLoading, setLikeLoading] = useState(false);

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

          const user = auth.currentUser;
          if (user) {
            const likesQuery = query(
              collection(db, 'userLikes'),
              where('raffleId', '==', id),
              where('userId', '==', user.uid)
            );
            const likesSnap = await getDocs(likesQuery);
            if (!likesSnap.empty) {
              setLiked(true);
              setLikeDocId(likesSnap.docs[0].id);
            }
          }
        } else {
          setError('Raffle not found.');
        }
      } catch (err) {
        console.error(err);
        setError('Failed to load raffle.');
      } finally {
        setLoading(false);
      }
    };

    fetchRaffle();
  }, [id]);

  const handlePlayNow = () => {
    navigate(`/game/${id}`);
  };

  const handleLikeToggle = async () => {
    const user = auth.currentUser;
    if (!user) {
      alert('Please log in to like raffles.');
      return;
    }

    setLikeLoading(true);

    try {
      if (!liked) {
        const docRef = await addDoc(collection(db, 'userLikes'), {
          raffleId: id,
          userId: user.uid,
          timestamp: new Date(),
        });
        setLikeDocId(docRef.id);
        setLiked(true);
      } else {
        const docRef = doc(db, 'userLikes', likeDocId);
        await deleteDoc(docRef);
        setLiked(false);
        setLikeDocId(null);
      }
    } catch (err) {
      console.error('Error toggling like:', err);
      alert('Error processing like.');
    } finally {
      setLikeLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={styles['raffle-detail-page']}>
        <TopNavBar />
        <div className={styles['raffle-detail-container']}>
          <p>Loading Raffle Details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles['raffle-detail-page']}>
        <TopNavBar />
        <div className={styles['raffle-detail-container']}>
          <p style={{ color: 'red' }}>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles['raffle-detail-page']}>
      <TopNavBar />
      <div className={styles['raffle-detail-container']}>
        <div className={styles['image-wrapper']}>
          <img
            className={styles['raffle-detail-image']}
            src={raffle.picture || 'https://via.placeholder.com/600x400'}
            alt={raffle.title}
          />
          <button
            className={styles['heart-button']}
            onClick={handleLikeToggle}
            disabled={likeLoading}
          >
            {liked ? <FaHeart className={styles['heart-filled']} /> : <FaRegHeart className={styles['heart-empty']} />}
          </button>
        </div>

        <div className={styles['raffle-detail-info']}>
          <h1>{raffle.title}</h1>
          {raffle.detailOne && <p className={styles['raffle-extra']}>{raffle.detailOne}</p>}
          {raffle.detailTwo && <p className={styles['raffle-extra']}>{raffle.detailTwo}</p>}
          {raffle.detailThree && <p className={styles['raffle-extra']}>{raffle.detailThree}</p>}

          <div className={styles['raffle-prize-tag']}>Price to Play: ${raffle.costPer}</div>

          {raffle.expiryDate && (
            <div className={styles['raffle-expiry']}>
              Entries close: {raffle.expiryDate.toLocaleDateString(undefined, {
                year: 'numeric', month: 'long', day: 'numeric'
              })}
            </div>
          )}

          <button className={styles['cta-button']} onClick={handlePlayNow}>Play Now</button>

          {raffle.description && (
            <p className={styles['raffle-desc']}>{raffle.description}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default RaffleDetail;
