import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { collection, query, where, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebaseConfig';
import TopNavBar from './TopNavBar';
import styles from '../styles/GuessDetailsPage.module.css';

const GuessDetailsPage = () => {
  const { raffleId } = useParams();
  const location = useLocation();
  const source = location.state?.source || 'profile';
  const [guesses, setGuesses] = useState([]);
  const [raffleInfo, setRaffleInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchGuesses = async () => {
      const user = auth.currentUser;
      if (!user || !raffleId) return;

      const raffleRef = doc(db, 'raffles', raffleId);
      const raffleSnap = await getDoc(raffleRef);
      if (!raffleSnap.exists()) return;

      const raffle = raffleSnap.data();
      setRaffleInfo({
        title: raffle.title || 'Untitled Raffle',
        expiry: raffle.expiryDate?.toDate?.(),
        costPer: raffle.costPer || 0
      });

      let guessQuery;
      if (source === 'cart') {
        guessQuery = query(
          collection(db, 'cart'),
          where('raffleId', '==', raffleId),
          where('userId', '==', user.uid)
        );
      } else {
        guessQuery = query(
          collection(db, 'raffle_tickets'),
          where('raffleId', '==', raffleId),
          where('userId', '==', user.uid)
        );
      }

      const guessSnap = await getDocs(guessQuery);
      const entries = guessSnap.docs.map(doc => ({
        id: doc.id,
        ref: doc.ref,
        ...doc.data()
      }));

      setGuesses(entries);
      setLoading(false);
    };

    fetchGuesses();
  }, [raffleId, source]);

  const handleImageClick = (e, guess) => {
    if (source !== 'cart') return;

    const rect = e.target.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const width = rect.width;
    const height = rect.height;

    const newX = (x / width) * (guess.imgWidth || 352);
    const newY = (y / height) * (guess.imgHeight || 492);

    setGuesses(prev =>
      prev.map(g => g.id === guess.id ? { ...g, xCoord: newX, yCoord: newY } : g)
    );
  };

  const handleSave = async (guess) => {
    try {
      await updateDoc(guess.ref, {
        xCoord: guess.xCoord,
        yCoord: guess.yCoord
      });
      alert('Guess updated successfully!');
      setEditingId(null);
    } catch (err) {
      console.error(err);
      alert('Failed to save changes.');
    }
  };

  if (loading) {
    return (
      <div className={`${styles['guess-wrapper']} ${styles['guess-details-page']}`}>
        <TopNavBar />
        <div className={styles['guess-loading']}>Loading your raffle guesses...</div>
      </div>
    );
  }

  return (
    <div className={`${styles['guess-wrapper']} ${styles['guess-details-page']}`}>
      <TopNavBar />
      <div className={styles['guess-container']}>
        <h2>Your Guesses for: <span className={styles['raffle-title']}>{raffleInfo?.title}</span></h2>

        <div className={styles['ticket-header']}>
          <div>{guesses.length} {guesses.length > 1 ? 'guesses' : 'guess'} • Total: {raffleInfo.costPer * guesses.length} gold coins</div>
          {raffleInfo.expiry && (
            <div className={styles['ticket-expiry']}>
              {raffleInfo.expiry < new Date()
                ? 'Expired'
                : `Valid Until ${raffleInfo.expiry.toLocaleDateString()}`}
            </div>
          )}
        </div>

        <div className={styles['ticket-dashed']} />

        {guesses.map(guess => {
          const width = guess.imgWidth || 352;
          const height = guess.imgHeight || 492;
          return (
            <div key={guess.id} className={styles['guess-entry']}>
              {guess.imageUrl && (
                <div className={styles['guess-image-wrapper']}>
                  <img
                    src={guess.imageUrl}
                    alt="Guess visual"
                    onClick={(e) => handleImageClick(e, guess)}
                    style={{ cursor: source === 'cart' ? 'crosshair' : 'default' }}
                  />
                  <div
                    className={styles['guess-dot']}
                    style={{
                      left: `${(guess.xCoord / width) * 100}%`,
                      top: `${(guess.yCoord / height) * 100}%`
                    }}
                  />
                </div>
              )}

              <div className={styles['guess-details']}>
                <div><strong>X:</strong> {Number(guess.xCoord).toFixed(2)}</div>
                <div><strong>Y:</strong> {Number(guess.yCoord).toFixed(2)}</div>
                <div><strong>Date:</strong> {guess.createdAt?.seconds ? new Date(guess.createdAt.seconds * 1000).toLocaleString() : 'Unknown'}</div>
                <div><strong>Cost:</strong> {raffleInfo.costPer} gold coins</div>

                {source === 'cart' && (
                  <button onClick={() => handleSave(guess)} className={styles['save-btn']}>
                    Save Changes
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default GuessDetailsPage;
