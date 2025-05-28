import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebaseConfig';
import TopNavBar from './TopNavBar';
import styles from '../styles/GuessDetailsPage.module.css';

const GuessDetailsPage = () => {
  const { raffleId } = useParams();
  const [guesses, setGuesses] = useState([]);
  const [raffleInfo, setRaffleInfo] = useState(null);
  const [loading, setLoading] = useState(true);
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

      const guessQuery = query(
        collection(db, 'raffle_tickets'),
        where('raffleId', '==', raffleId),
        where('userId', '==', user.uid)
      );

      const guessSnap = await getDocs(guessQuery);
      const entries = guessSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setGuesses(entries);
      setLoading(false);
    };

    fetchGuesses();
  }, [raffleId]);

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
        <h2>Your Guesses for: {raffleInfo?.title}</h2>
        {guesses.length === 0 ? (
          <p className={styles['empty-guess']}>You have no guesses for this raffle.</p>
        ) : (
          <>
            <div className={styles['ticket-header']}>
              <div className={styles['ticket-subtitle']}>
                {guesses.length} {guesses.length > 1 ? 'guesses' : 'guess'} • Total: {raffleInfo.costPer * guesses.length} gold coins
              </div>
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
                      <img src={guess.imageUrl} alt="Guess visual" />
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
                  </div>
                </div>
              );
            })}
          </>
        )}
        <button className={styles['back-button']} onClick={() => navigate('/profile')}>⬅ Back to Profile</button>
      </div>
    </div>
  );
};

export default GuessDetailsPage;
