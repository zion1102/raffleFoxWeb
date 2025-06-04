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
          raffleExpiry: raffleCache[raffleId]?.expiryDate?.toDate?.(),
          costPer: raffleCache[raffleId]?.costPer || 0
        });
      }

      const grouped = guesses.reduce((acc, item) => {
        acc[item.raffleId] = acc[item.raffleId] || {
          raffleTitle: item.raffleTitle,
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
            {Object.entries(cartItems).map(([raffleId, { raffleTitle, raffleExpiry, guesses }]) => (
              <div key={raffleId} className="raffle-ticket-wrapper">
                <svg className="raffle-ticket-svg" viewBox="0 0 700 300" preserveAspectRatio="none">
                  <path
                    fill="white"
                    stroke="#ff5f00"
                    strokeWidth="2"
                    d="
                      M20,1 
                      h660 
                      a19,19 0 0 1 19,19 
                      v100 
                      a30,30 0 0 0 0,60 
                      v100 
                      a19,19 0 0 1 -19,19 
                      h-660 
                      a19,19 0 0 1 -19,-19 
                      v-100 
                      a30,30 0 0 0 0,-60 
                      v-100 
                      a19,19 0 0 1 19,-19 
                      z"
                  />
                </svg>

                <div className="raffle-ticket-content-inside">
                  <div className="raffle-ticket-id">#{raffleId}</div>
                  <div className="raffle-ticket-date">
                    {raffleExpiry ? `Valid Until ${raffleExpiry.toISOString().split('T')[0]}` : ''}
                  </div>
                  <div className="raffle-ticket-title">{raffleTitle}</div>
                  <div className="raffle-ticket-divider" />
                  <div className="raffle-ticket-info">
                    <div>
                      <div>{guesses.length} {guesses.length === 1 ? 'Ticket' : 'Tickets'}</div>
                      <div>Total: {guesses.reduce((sum, g) => sum + g.costPer, 0)} gold coins</div>
                    </div>
                    <button
  className="raffle-ticket-button"
  onClick={() => navigate(`/raffle/${raffleId}/guesses`, { state: { source: 'cart' } })}
>
  View
</button>

                  </div>
                </div>
              </div>
            ))}

            <div className="checkout-bar">
              <div className="total">
                Total Cost: <span>{totalCost} gold coins</span>
              </div>
              <button className="checkout-btn" onClick={() => setShowModal(true)}>Checkout</button>
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
