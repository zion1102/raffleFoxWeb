import React from 'react';
import '../styles/RaffleTicketCard.css';

const RaffleTicketCard = ({ raffleId, title, expiryDate, guesses, totalPrice }) => {
  const expiry = expiryDate?.seconds ? new Date(expiryDate.seconds * 1000) : null;
  const isExpired = expiry ? expiry < new Date() : false;

  return (
    <div className={`raffle-ticket-card ${isExpired ? 'expired' : ''}`}>
      <div className="raffle-ticket-id">#{raffleId}</div>
      <div className="raffle-ticket-date">
        {isExpired
          ? `Expired on ${expiry?.toLocaleDateString()}`
          : `Valid Until ${expiry?.toLocaleDateString()}`}
      </div>
      <div className="raffle-ticket-title">{title}</div>
      <div className="raffle-ticket-divider" />
      <div className="raffle-ticket-info">
        <div>
          <div>{guesses} {guesses === 1 ? 'Ticket' : 'Tickets'}</div>
          <div>Total: ${totalPrice.toFixed(2)}</div>
        </div>
        <button className="raffle-ticket-button" disabled={isExpired}>View</button>
      </div>
    </div>
  );
};

export default RaffleTicketCard;
