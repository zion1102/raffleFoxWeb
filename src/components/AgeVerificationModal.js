// src/components/AgeVerificationModal.js

import React from 'react';
import '../styles/AgeVerificationModal.css';

const AgeVerificationModal = ({ onConfirm }) => {
  const handleReject = () => {
    window.location.href = 'https://www.google.com';
  };

  return (
    <div className="age-modal-overlay">
      <div className="age-modal">
        <h2>Age Verification</h2>
        <p>You must be 18 years or older to enter this website.</p>
        <div className="age-modal-buttons">
          <button className="confirm" onClick={onConfirm}>I am 18 or older</button>
          <button className="reject" onClick={handleReject}>No, I am under 18</button>
        </div>
      </div>
    </div>
  );
};

export default AgeVerificationModal;
