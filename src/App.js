import React from 'react';
import { HashRouter as Router, Route, Routes } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import LoginPage from './components/LoginPage';
import RegisterPage from './components/RegisterPage';
import TopUpCreditsPage from './components/TopUpPage';
import ProfileScreen from './components/ProfileScreen';
import EmailPasswordUpdate from "./components/EmailPasswordUpdate";
import AuthCallback from './components/AuthCallback';
import HomeScreen from './components/HomeScreen';





function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/topup" element={<TopUpCreditsPage />} />
        <Route path="/profile" element={<ProfileScreen />} />
        <Route path="/update-account" element={<EmailPasswordUpdate />} />
        <Route path="/auth/callback" element={<AuthCallback />} /> {/* Add this */}

        <Route path="/home" element={<HomeScreen />} />
      </Routes>
    </Router>
  );
}

export default App;
