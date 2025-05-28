import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getRaffleById, saveGuessToCart, saveGuessToFirestore } from '../services/RaffleService';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../config/firebaseConfig';
import TopNavBar from './TopNavBar';
import '../styles/GameScreen.css';
import coinImg from '../assets/dollar.png';

const GameScreen = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [raffle, setRaffle] = useState(null);
  const [dotPos, setDotPos] = useState(null);
  const [confirmedSpots, setConfirmedSpots] = useState([]);
  const [leftAds, setLeftAds] = useState([]);
  const [rightAds, setRightAds] = useState([]);
  const [countdowns, setCountdowns] = useState({});
  const [modalType, setModalType] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [deleteIndex, setDeleteIndex] = useState(null);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const imageRef = useRef(null);
  const isDragging = useRef(false);

  useEffect(() => {
    const loadRaffle = async () => {
      const data = await getRaffleById(id);
      setRaffle(data);
    };

    const loadAds = async () => {
      const now = new Date();
      const snapshot = await getDocs(collection(db, 'raffles'));
      const valid = snapshot.docs
        .filter(doc => {
          const data = doc.data();
          const expiry = data.expiryDate?.toDate?.();
          return doc.id !== id && expiry && expiry > now;
        })
        .map(doc => ({ id: doc.id, ...doc.data() }));

      const shuffled = valid.sort(() => 0.5 - Math.random()).slice(0, 4);
      const mid = Math.ceil(shuffled.length / 2);
      setLeftAds(shuffled.slice(0, mid));
      setRightAds(shuffled.slice(mid));
      startLiveCountdowns(shuffled);
    };

    loadRaffle();
    loadAds();
  }, [id]);

  const startLiveCountdowns = (ads) => {
    const updateCountdowns = () => {
      const now = new Date().getTime();
      const updated = {};
      ads.forEach(ad => {
        const expiry = ad.expiryDate?.toDate?.()?.getTime?.();
        if (expiry) {
          const diff = expiry - now;
          if (diff > 0) {
            const seconds = Math.floor((diff / 1000) % 60);
            const minutes = Math.floor((diff / 1000 / 60) % 60);
            const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            updated[ad.id] = `${days}d ${hours}h ${minutes}m ${seconds}s left`;
          } else {
            updated[ad.id] = 'Expired';
          }
        }
      });
      setCountdowns(updated);
    };

    updateCountdowns();
    const interval = setInterval(updateCountdowns, 1000);
    return () => clearInterval(interval);
  };

  const handleImageInteraction = (e) => {
    if (!imageRef.current) return;
    const rect = imageRef.current.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
    const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;
    setDotPos({ x, y });
  };

  const scaleCoords = ({ x, y }) => {
    const rect = imageRef.current.getBoundingClientRect();
    return {
      x: (x / rect.width) * 352,
      y: (y / rect.height) * 492,
    };
  };

  const confirmPosition = () => {
    if (dotPos) {
      setConfirmedSpots(prev => [...prev, dotPos]);
      setDotPos(null);
    }
  };

  const handleDeleteSpot = (index) => setDeleteIndex(index);
  const confirmDelete = () => {
    setConfirmedSpots(prev => prev.filter((_, i) => i !== deleteIndex));
    setDeleteIndex(null);
  };
  const cancelDelete = () => setDeleteIndex(null);

  const handleAction = (type) => {
    if (confirmedSpots.length === 0) {
      setShowErrorModal(true);
      return;
    }
    setModalType(type);
  };

  const confirmAction = async () => {
    if (!raffle || !auth.currentUser) return;

    const totalCost = confirmedSpots.length * (raffle.costPer || 0);
    const userRef = doc(db, 'users', auth.currentUser.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) return;

    const userData = userSnap.data();
    if (modalType === 'checkout' && userData.credits < totalCost) {
      setModalType(null);
      alert('Insufficient gold coins. Redirecting to top-up page.');
      navigate('/topup');
      return;
    }

    const promises = confirmedSpots.map(pos => {
      const coords = scaleCoords(pos);
      return modalType === 'cart'
        ? saveGuessToCart(id, coords, raffle.editedGamePicture)
        : saveGuessToFirestore(id, coords, raffle.editedGamePicture);

    });

    await Promise.all(promises);
    setConfirmedSpots([]);
    setModalType(null);
    setShowSuccess(true);

    setTimeout(() => {
      setShowSuccess(false);
      navigate(modalType === 'cart' ? '/cart' : '/profile');
    }, 2000);
  };

  const renderAd = (r, side) => (
    <div key={r.id} className={`ad-card ${side.length === 1 ? 'tall' : ''}`}>
      <img src={r.picture || 'https://via.placeholder.com/150'} alt={r.title} />
      <div className="ad-content">
        <div className="ad-timer">{countdowns[r.id]}</div>
        <div className="ad-title">{r.title}</div>
        <button className="ad-button" onClick={() => navigate(`/game/${r.id}`)}>Play Now</button>
      </div>
    </div>
  );

  if (!raffle) return <div className="game-wrapper"><TopNavBar /><p>Loading...</p></div>;

  return (
    <div className="game-wrapper">
      <TopNavBar />
      <div className="game-layout">
        <div className="sidebar">{leftAds.map(r => renderAd(r, leftAds))}</div>

        <div className="game-screen">
          <h2 className="raffle-title">{raffle.title}</h2>

          <div className="game-meta">
            <div className="game-date">
              ⏰ {new Date(raffle.expiryDate.toDate()).toLocaleString()}
            </div>
            <div className="game-cost">
              <img src={coinImg} alt="coin" className="coin-icon" /> {raffle.costPer} gold coins
            </div>
          </div>

          <div className="instructions">
            <h4>🎯 How to Play</h4>
            <ul>
              <li>Click or drag on the image to choose your guess.</li>
              <li>Click “Confirm Position” to lock in each guess.</li>
              <li>You can place multiple guesses before saving or checking out.</li>
            </ul>
          </div>

          <div
            className="image-wrapper"
            onClick={handleImageInteraction}
            onMouseMove={(e) => isDragging.current && handleImageInteraction(e)}
            onMouseDown={() => isDragging.current = true}
            onMouseUp={() => isDragging.current = false}
            onMouseLeave={() => isDragging.current = false}
          >
            <img ref={imageRef} src={raffle.editedGamePicture} alt="Guess Target" />
            {dotPos && <div className="target-dot" style={{ left: dotPos.x, top: dotPos.y }} />}
            {confirmedSpots.map((spot, i) => (
              <div
                key={i}
                className="confirmed-dot"
                style={{ left: spot.x, top: spot.y }}
                onClick={() => handleDeleteSpot(i)}
              />
            ))}
          </div>

          {dotPos && (
            <p className="live-coords">📍 X: {dotPos.x.toFixed(1)}, Y: {dotPos.y.toFixed(1)}</p>
          )}

          <div className="controls">
            <button onClick={confirmPosition}>Confirm Position</button>
            <button onClick={() => handleAction('cart')}>Save to Cart</button>
            <button onClick={() => handleAction('checkout')}>Checkout</button>
          </div>
        </div>

        <div className="sidebar">{rightAds.map(r => renderAd(r, rightAds))}</div>
      </div>

      {/* Modals (confirmation, delete, error, success) */}
      {modalType && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Confirm {modalType === 'cart' ? 'Save to Cart' : 'Checkout'}</h3>
            <p>You have <strong>{confirmedSpots.length}</strong> guess{confirmedSpots.length > 1 ? 'es' : ''}.</p>
            <p>Total Cost: <strong>{(raffle.costPer || 0) * confirmedSpots.length} gold coins</strong></p>
            <div className="modal-buttons">
              <button onClick={confirmAction}>Yes, Proceed</button>
              <button onClick={() => setModalType(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {deleteIndex !== null && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Remove Guess?</h3>
            <p>Are you sure you want to delete this guess?</p>
            <div className="modal-buttons">
              <button onClick={confirmDelete}>Yes, Remove</button>
              <button onClick={cancelDelete}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showErrorModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>No Guesses Placed</h3>
            <p>Please place at least one guess on the image before continuing.</p>
            <div className="modal-buttons">
              <button onClick={() => setShowErrorModal(false)}>Okay</button>
            </div>
          </div>
        </div>
      )}

      {showSuccess && (
        <div className="success-overlay">
          <div className="success-animation">✅</div>
          <p className="success-message">Success!</p>
        </div>
      )}
    </div>
  );
};

export default GameScreen;
