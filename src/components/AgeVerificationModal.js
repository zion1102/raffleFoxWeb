import React from 'react';
import '../styles/AgeVerificationModal.css'; // You can style it however you want

const AgeVerificationModal = ({ onConfirm }) => {
  return (
    <div className="age-modal-overlay">
      <div className="age-modal-content">
        <h2>Age Verification</h2>
        <p>You must be at least 18 years old to use this application.</p>
        <button onClick={onConfirm} className="confirm-button">
          I am 18 or older
        </button>
      </div>
    </div>
  );
};

export default AgeVerificationModal;
