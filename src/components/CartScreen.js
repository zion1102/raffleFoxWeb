import React, { useEffect, useState } from 'react';
import { collection, getDocs, query, where, doc, deleteDoc, getDoc, updateDoc, addDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebaseConfig';
import { useNavigate } from 'react-router-dom';
import TopNavBar from './TopNavBar';
import '../styles/CartScreen.css';

const CartScreen = () => {
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalCost, setTotalCost] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCart = async () => {
      const user = auth.currentUser;
      if (!user) return;

      const cartQuery = query(collection(db, 'cart'), where('userId', '==', user.uid));
      const snapshot = await getDocs(cartQuery);

      const guesses = [];
      const raffleCache = {};

      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        const raffleId = data.raffleId;

        if (!raffleCache[raffleId]) {
          const raffleRef = doc(db, 'raffles', raffleId);
          const raffleSnap = await getDoc(raffleRef);
          raffleCache[raffleId] = raffleSnap.exists() ? raffleSnap.data() : {};
        }

        guesses.push({
          id: docSnap.id,
          ...data,
          raffleId,
          raffleTitle: raffleCache[raffleId]?.title || 'Untitled Raffle',
          rafflePicture: raffleCache[raffleId]?.editedGamePicture || null,
          raffleExpiry: raffleCache[raffleId]?.expiryDate?.toDate?.(),
          costPer: raffleCache[raffleId]?.costPer || 0
        });
      }

      const grouped = guesses.reduce((acc, item) => {
        acc[item.raffleId] = acc[item.raffleId] || {
          raffleTitle: item.raffleTitle,
          rafflePicture: item.rafflePicture,
          raffleExpiry: item.raffleExpiry,
          guesses: []
        };
        acc[item.raffleId].guesses.push(item);
        return acc;
      }, {});

      const total = guesses.reduce((sum, item) => sum + item.costPer, 0);

      setCartItems(grouped);
      setTotalCost(total);
      setLoading(false);
    };

    fetchCart();
  }, []);

  const handleDelete = async (id) => {
    await deleteDoc(doc(db, 'cart_guesses', id));
    setCartItems((prev) => {
      const updated = { ...prev };
      for (const raffleId in updated) {
        updated[raffleId].guesses = updated[raffleId].guesses.filter(item => item.id !== id);
        if (updated[raffleId].guesses.length === 0) delete updated[raffleId];
      }
      return updated;
    });
    const newTotal = Object.values(cartItems).flatMap(group => group.guesses).filter(item => item.id !== id)
      .reduce((sum, item) => sum + item.costPer, 0);
    setTotalCost(newTotal);
  };

  const handleConfirmCheckout = async () => {
    const user = auth.currentUser;
    if (!user) return;

    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) return;

    const userCoins = userSnap.data().credits || 0;
    if (userCoins < totalCost) {
      alert('Insufficient gold coins. Redirecting to top-up page...');
      return navigate('/topup');
    }

    const allGuesses = Object.values(cartItems).flatMap(group => group.guesses);

    try {
      for (const guess of allGuesses) {
        const raffleRef = doc(db, 'raffles', guess.raffleId);
        const raffleSnap = await getDoc(raffleRef);
        if (!raffleSnap.exists()) continue;

        const raffle = raffleSnap.data();
        const cost = raffle.costPer || 0;

        await updateDoc(userRef, { credits: userCoins - cost });

        await addDoc(collection(db, 'raffle_tickets'), {
          raffleId: guess.raffleId,
          userId: user.uid,
          xCoord: guess.xCoord,
          yCoord: guess.yCoord,
          createdAt: new Date(),
          raffleTitle: raffle.title || 'Untitled Raffle',
          raffleExpiryDate: raffle.expiryDate || null
        });

        await deleteDoc(doc(db, 'cart_guesses', guess.id));
      }

      alert('Checkout successful!');
      setCartItems([]);
      setTotalCost(0);
      setShowModal(false);
    } catch (err) {
      console.error(err);
      alert('Error processing checkout. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="cart-wrapper">
        <TopNavBar />
        <div className="cart-loading">Loading your cart...</div>
      </div>
    );
  }

  return (
    <div className="cart-wrapper">
      <TopNavBar />
      <div className="cart-container">
        <h2>Your Saved Guesses</h2>
        {Object.keys(cartItems).length === 0 ? (
          <p className="empty-cart">You have no guesses saved in your cart.</p>
        ) : (
          <>
            {Object.entries(cartItems).map(([raffleId, { raffleTitle, rafflePicture, raffleExpiry, guesses }]) => (
              <div key={raffleId} className="entry raffle" id="raffle-red">
                <div className="ticket-wrapper">
                  <div className="ticket-header">
                    <div className="ticket-title">{raffleTitle}</div>
                    <div className="ticket-subtitle">
                      {guesses.length} {guesses.length > 1 ? 'guesses' : 'guess'} • Total: {guesses.reduce((sum, g) => sum + g.costPer, 0)} gold coins
                    </div>
                    {raffleExpiry && (
                      <div className="ticket-expiry">
                        {raffleExpiry < new Date() ? 'Expired' : `Valid Until ${raffleExpiry.toLocaleDateString()}`}
                      </div>
                    )}
                  </div>
                  <div className="ticket-dashed" />
                  {guesses.map(item => (
                    <div key={item.id} className="guess-entry">
                      {rafflePicture && (
                        <div className="guess-image-wrapper">
                          <img src={rafflePicture} alt="Guess preview" />
                          <div
                            className="guess-dot"
                            style={{
                              left: `${(item.xCoord / 352) * 100}%`,
                              top: `${(item.yCoord / 492) * 100}%`
                            }}
                          />
                        </div>
                      )}
                      <div className="guess-details">
                        <div><strong>X:</strong> {item.xCoord}</div>
                        <div><strong>Y:</strong> {item.yCoord}</div>
                        <div><strong>Date:</strong> {item.createdAt?.seconds ? new Date(item.createdAt.seconds * 1000).toLocaleString() : 'Unknown'}</div>
                        <div><strong>Cost:</strong> {item.costPer} gold coins</div>
                      </div>
                      <button className="delete-btn" onClick={() => handleDelete(item.id)}>Delete</button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <div className="cart-summary">
              <p><strong>Total Cost:</strong> {totalCost} gold coins</p>
              <button className="checkout-btn" onClick={() => setShowModal(true)}>Proceed to Checkout</button>
            </div>
          </>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Confirm Checkout</h3>
            <p>You are about to checkout with <strong>{totalCost} gold coins</strong> worth of guesses.</p>
            <div className="modal-buttons">
              <button onClick={handleConfirmCheckout}>Yes, Confirm</button>
              <button onClick={() => setShowModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CartScreen;
