import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';

import { auth } from './config/firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';

import LandingPage from './components/LandingPage';
import LoginPage from './components/LoginPage';
import RegisterPage from './components/RegisterPage';
import TopUpCreditsPage from './components/TopUpPage';
import ProfileScreen from './components/ProfileScreen';
import EmailPasswordUpdate from "./components/EmailPasswordUpdate";
import AuthCallback from './components/AuthCallback';
import HomeScreen from './components/HomeScreen';
import TopUpSuccess from './components/TopUpSuccess';
import RaffleDetail from './components/RaffleDetails';
import GameScreen from './components/GameScreen';
import CartScreen from './components/CartScreen';
import AgeVerificationModal from './components/AgeVerificationModal';
import ProtectedRoute from './components/ProtectedRoute';
import EditProfilePage from './components/EditProfilePage';
import GuessDetailsPage from './components/GuessDetailsPage';
import ChatWidget from './components/ChatWidget';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ageVerified, setAgeVerified] = useState(false);

  useEffect(() => {
    const isVerified = sessionStorage.getItem('ageVerified') === 'true';
    setAgeVerified(isVerified);

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleAgeConfirm = () => {
    sessionStorage.setItem('ageVerified', 'true');
    setAgeVerified(true);
  };

  if (loading) return <div>Loading...</div>;
  if (!ageVerified) return <AgeVerificationModal onConfirm={handleAgeConfirm} />;

  return (
    <Router>
      <>
        <Routes>
          <Route path="/" element={user ? <HomeScreen /> : <LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/auth/callback" element={<AuthCallback />} />

          <Route path="/topup-success" element={<ProtectedRoute user={user}><TopUpSuccess /></ProtectedRoute>} />
          <Route path="/raffle/:id" element={<ProtectedRoute user={user}><RaffleDetail /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute user={user}><ProfileScreen /></ProtectedRoute>} />
          <Route path="/edit-profile" element={<ProtectedRoute user={user}><EditProfilePage /></ProtectedRoute>} />
          <Route path="/raffle/:raffleId/guesses" element={<ProtectedRoute user={user}><GuessDetailsPage /></ProtectedRoute>} />
          <Route path="/update-account" element={<ProtectedRoute user={user}><EmailPasswordUpdate /></ProtectedRoute>} />
          <Route path="/topup" element={<ProtectedRoute user={user}><TopUpCreditsPage /></ProtectedRoute>} />
          <Route path="/home" element={<ProtectedRoute user={user}><HomeScreen /></ProtectedRoute>} />
          <Route path="/game/:id" element={<ProtectedRoute user={user}><GameScreen /></ProtectedRoute>} />
          <Route path="/cart" element={<ProtectedRoute user={user}><CartScreen /></ProtectedRoute>} />
        </Routes>

        {/* Persistent Chat Widget on All Pages */}
        <ChatWidget />
      </>
    </Router>
  );
}

export default App;
