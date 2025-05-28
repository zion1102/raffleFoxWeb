import React, { useState, useEffect } from 'react';
import { db, auth } from '../config/firebaseConfig';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import TopNavBar from './TopNavBar';
import '../styles/ProfileScreen.css';

const ProfileScreen = () => {
  const [user, setUser] = useState(null);
  const [groupedTickets, setGroupedTickets] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const userRef = doc(db, 'users', currentUser.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) setUser(userSnap.data());

      const ticketQuery = query(
        collection(db, 'raffle_tickets'),
        where('userId', '==', currentUser.uid)
      );
      const ticketSnap = await getDocs(ticketQuery);
      const ticketData = ticketSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const raffleIds = [...new Set(ticketData.map(ticket => ticket.raffleId))];
      const raffleMap = {};

      for (const raffleId of raffleIds) {
        const raffleDoc = await getDoc(doc(db, 'raffles', raffleId));
        if (raffleDoc.exists()) raffleMap[raffleId] = raffleDoc.data();
      }

      const grouped = {};
      for (const ticket of ticketData) {
        const raffle = raffleMap[ticket.raffleId] || {};
        const id = ticket.raffleId;

        if (!grouped[id]) {
          const relatedTickets = ticketData.filter(t => t.raffleId === id);
          grouped[id] = {
            raffleId: id,
            title: raffle.title || 'Untitled Raffle',
            expiryDate: raffle.expiryDate,
            guesses: relatedTickets.length,
            totalPrice: (raffle.costPer || 0) * relatedTickets.length
          };
          
        }
      }

      setGroupedTickets(grouped);
      setLoading(false);
    };

    fetchData();
  }, []);

  const handleLogout = async () => {
    await auth.signOut();
    window.location.href = '/login';
  };

  const handleEditProfile = () => {
    window.location.href = '/edit-profile';
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <TopNavBar />
      <div className="profile-container">
        <div className="profile-header">
          <img
            className="profile-picture"
            src={user?.profilePicture || "https://cdn-icons-png.flaticon.com/512/149/149071.png"}
            alt="Profile"
          />
          <h2>{user?.name || 'User'}</h2>
          <p>{user?.email || 'No email provided'}</p>
          <div className="profile-buttons">
            <button onClick={handleEditProfile}>Edit Profile</button>
            <button onClick={handleLogout}>Log Out</button>
          </div>
        </div>

        <div className="profile-details">
          <h3>Account Details</h3>
          <div className="profile-card">
            <div className="profile-item"><strong>Phone:</strong> {user?.phone || 'N/A'}</div>
            <div className="profile-item"><strong>Gold Coins:</strong> {user?.credits || 0}</div>
            <div className="profile-item"><strong>Age:</strong> {user?.age || 'N/A'}</div>
            <div className="profile-item">
              <strong>Account Created At:</strong>{' '}
              {user?.createdAt?.seconds
                ? new Date(user.createdAt.seconds * 1000).toLocaleDateString()
                : 'N/A'}
            </div>
          </div>
        </div>
        <div className="profile-tickets">
  <h3>🎟 Your Raffle Entries</h3>
  {Object.keys(groupedTickets).length === 0 ? (
    <p>You haven’t entered any raffles yet.</p>
  ) : (
    Object.entries(groupedTickets).map(([raffleId, ticket]) => (
      <div key={raffleId} className="raffle-ticket-svg-wrapper">
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
            Valid Until {new Date(ticket.expiryDate.seconds * 1000).toISOString().split('T')[0]}
          </div>
          <div className="raffle-ticket-title">{ticket.title}</div>
          <div className="raffle-ticket-divider" />
          <div className="raffle-ticket-info">
            <div>
              <div>{ticket.guesses} {ticket.guesses === 1 ? 'Ticket' : 'Tickets'}</div>
              <div>Total: ${ticket.totalPrice.toFixed(2)}</div>
            </div>
            <button
  className="raffle-ticket-button"
  onClick={() => window.location.href = `/raffle/${raffleId}/guesses`}
>
  View
</button>

          </div>
        </div>
      </div>
    ))
  )}
</div>


      </div>
    </div>
  );
};

export default ProfileScreen;
