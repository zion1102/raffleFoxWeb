import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getRaffleById, saveGuessToCart, saveGuessToFirestore } from '../services/RaffleService';
import { collection, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../config/firebaseConfig';
import TopNavBar from './TopNavBar';
import '../styles/GameScreen.css';
import coinImg from '../assets/dollar.png';
import { FiEdit2, FiTrash2, FiCheck, FiX } from 'react-icons/fi';

const GameScreen = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [raffle, setRaffle] = useState(null);
  const [dotPos, setDotPos] = useState(null);
  const [confirmedSpots, setConfirmedSpots] = useState([]);
  const [editingIndex, setEditingIndex] = useState(null);
  const [leftAds, setLeftAds] = useState([]);
  const [rightAds, setRightAds] = useState([]);
  const [countdowns, setCountdowns] = useState({});
  const [modalType, setModalType] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showInsufficientModal, setShowInsufficientModal] = useState(false);

  const imageRef = useRef(null);
  const isDragging = useRef(false);
  const [mouseDown, setMouseDown] = useState(false);

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
  
    if (editingIndex !== null) {
      // Edit mode: update guess in real-time as you drag
      setConfirmedSpots(prev =>
        prev.map((spot, i) => (i === editingIndex ? { x, y } : spot))
      );
      setDotPos({ x, y });
    }
  };
  

  const scaleCoords = ({ x, y }) => {
    const rect = imageRef.current.getBoundingClientRect();
    return {
      x: (x / rect.width) * 352,
      y: (y / rect.height) * 492,
    };
  };

  const handleEdit = (index) => {
    setEditingIndex(index);
    setDotPos(confirmedSpots[index]);
  };

  const handleConfirmEdit = () => {
    setEditingIndex(null);
    setDotPos(null);
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setDotPos(null);
  };

  const handleDeleteSpot = (index) => {
    setConfirmedSpots(prev => prev.filter((_, i) => i !== index));
    if (editingIndex === index) {
      setEditingIndex(null);
      setDotPos(null);
    }
  };

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
      setShowInsufficientModal(true);
      return;
    }

    if (modalType === 'checkout') {
      await updateDoc(userRef, {
        credits: userData.credits - totalCost
      });
    }

    const promises = confirmedSpots.map(pos => {
      const coords = scaleCoords(pos);
      return modalType === 'cart'
        ? saveGuessToCart(id, coords, raffle.editedGamePicture)
        : saveGuessToFirestore(id, coords, raffle.editedGamePicture, false);
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
            <div className="game-date">⏰ {new Date(raffle.expiryDate.toDate()).toLocaleString()}</div>
            <div className="game-cost"><img src={coinImg} alt="coin" className="coin-icon" /> {raffle.costPer} gold coins</div>
          </div>

          <div className="instructions">
            <h4>🎯 How to Play</h4>
            <ul>
              <li>Click or drag on the image to choose your guess.</li>
              <li>Your guess is confirmed immediately when clicked.</li>
              <li>You can edit or remove guesses anytime before saving.</li>
            </ul>
          </div>

          <div className="game-and-coords">
            <div
              className="image-wrapper"
              onMouseDown={() => { isDragging.current = true; setMouseDown(true); }}
              onMouseUp={() => { isDragging.current = false; setMouseDown(false); }}
              onMouseLeave={() => { isDragging.current = false; setMouseDown(false); }}
              onMouseMove={(e) => {
                if (isDragging.current && editingIndex !== null) {
                  handleImageInteraction(e);
                }
              }}
              
              onClick={(e) => {
                if (editingIndex === null) {
                  // Only allow one click to add guess when not editing
                  const rect = imageRef.current.getBoundingClientRect();
                  const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
                  const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;
                  setConfirmedSpots(prev => [...prev, { x, y }]);
                }
              }}
              
            >
              <img ref={imageRef} src={raffle.editedGamePicture} alt="Guess Target" />
              {dotPos && <div className="target-dot" style={{ left: dotPos.x, top: dotPos.y }} />}
              {confirmedSpots.map((spot, i) => (
  <div
    key={i}
    className={`confirmed-dot ${editingIndex === i ? 'editing-dot' : ''}`}
    style={{ left: spot.x, top: spot.y }}
  >
    <span className="dot-number">{i + 1}</span>
  </div>
))}

            </div>

            <div className="coord-list">
              <h4>Your Guesses</h4>
              {confirmedSpots.map((spot, i) => (
                <div key={i} className={`coord-item${editingIndex === i ? ' editing' : ''}`}>
                <div className="coord-info">
                  <span className="coord-emoji">📍</span>
                  <span className="coord-number-badge">{i + 1}</span>
                  <div className="coord-xy-group">
  <div className="coord-row">
    <span className="coord-label">X:</span>
    <span className="coord-value">{spot.x.toFixed(1)}</span>
    <span className="coord-label">Y:</span>
    <span className="coord-value">{spot.y.toFixed(1)}</span>
  </div>
</div>

                </div>
              
                <div className="coord-actions">
                  {editingIndex === i ? (
                    <>
                      <FiCheck onClick={handleConfirmEdit} title="Confirm" />
                      <FiX onClick={handleCancelEdit} title="Cancel" />
                    </>
                  ) : (
                    <>
                      <FiEdit2 onClick={() => handleEdit(i)} title="Edit" />
                      <FiTrash2 onClick={() => handleDeleteSpot(i)} title="Delete" />
                    </>
                  )}
                </div>
              </div>
              
              ))}
            </div>
          </div>

          <div className="controls">
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
      {modalType === 'checkout' ? (
        <>
          <h3>Checkout</h3>
          <p>Are you ready - These are your confirmed position(s) - happy?</p>
          <p>
            You have <strong>{confirmedSpots.length}</strong> guess
            {confirmedSpots.length > 1 ? 'es' : ''}.
          </p>
          <p>
            Total Cost:{' '}
            <strong>{(raffle.costPer || 0) * confirmedSpots.length} gold coins</strong>
          </p>
          <div className="modal-buttons">
            <button onClick={confirmAction}>Yes, Checkout</button>
            <button onClick={() => setModalType(null)}>No, Change my position(s)</button>
          </div>
        </>
      ) : (
        <>
          <h3>Save to Cart</h3>
          <p>
            You have <strong>{confirmedSpots.length}</strong> guess
            {confirmedSpots.length > 1 ? 'es' : ''}.
          </p>
          <p>
            Total Cost:{' '}
            <strong>{(raffle.costPer || 0) * confirmedSpots.length} gold coins</strong>
          </p>
          <div className="modal-buttons">
            <button onClick={confirmAction}>Yes, Proceed</button>
            <button onClick={() => setModalType(null)}>Cancel</button>
          </div>
        </>
      )}
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
      {showInsufficientModal && (
  <div className="modal-overlay">
    <div className="modal">
      <h3>Oops! Looks like you don’t have enough credit. 😬</h3>
      <p>You can delete your guesses or add more credit to make sure you can play</p>
      <div className="modal-buttons">
        <button onClick={() => navigate('/topup')}>Top Up</button>
        <button onClick={() => setShowInsufficientModal(false)}>Remove Guesses</button>
      </div>
    </div>
  </div>
)}

    </div>
  );
};

export default GameScreen;
