import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../config/firebaseConfig';
import { doc, updateDoc, increment, collection, addDoc } from 'firebase/firestore';
import queryString from 'query-string';

const TopUpSuccess = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const { amount, userId } = queryString.parse(window.location.search);
    if (amount && userId) {
      const finalizeTopUp = async () => {
        try {
          await addDoc(collection(db, 'topups'), {
            userId,
            amount: Number(amount),
            createdAt: new Date(),
          });

          const userRef = doc(db, 'users', userId);
          await updateDoc(userRef, {
            credits: increment(Number(amount)),
          });

          alert('Top-up successful!');
          navigate('/topup');
        } catch (err) {
          console.error('Finalizing top-up failed:', err);
          alert('Top-up processing error.');
        }
      };

      finalizeTopUp();
    } else {
      alert('Invalid top-up URL.');
      navigate('/topup');
    }
  }, [navigate]);

  return <h2>Finalizing your top-up...</h2>;
};

export default TopUpSuccess;
