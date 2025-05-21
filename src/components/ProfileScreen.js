import React, { useState, useEffect } from 'react';
import { db, auth } from '../config/firebaseConfig';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import TopNavBar from './TopNavBar';
import '../styles/ProfileScreen.css';

const ProfileScreen = () => {
  const [user, setUser] = useState(null);
  const [groupedTickets, setGroupedTickets] = useState({});
  const [expandedRaffles, setExpandedRaffles] = useState({});
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
        const enriched = {
          ...ticket,
          raffleTitle: raffle.title || 'Untitled Raffle',
          raffleExpiryDate: raffle.expiryDate
        };
        if (!grouped[ticket.raffleId]) grouped[ticket.raffleId] = [];
        grouped[ticket.raffleId].push(enriched);
      }

      setGroupedTickets(grouped);
      setLoading(false);
    };

    fetchData();
  }, []);

  const toggleExpand = (raffleId) => {
    setExpandedRaffles(prev => ({
      ...prev,
      [raffleId]: !prev[raffleId]
    }));
  };

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
            <div className="profile-item"><strong>User Type:</strong> {user?.userType || 'N/A'}</div>
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
            Object.entries(groupedTickets).map(([raffleId, tickets]) => (
              <div key={raffleId} className="ticket-group">
                <div className="group-header" onClick={() => toggleExpand(raffleId)}>
                  <h4>{tickets[0].raffleTitle}</h4>
                  <span>{expandedRaffles[raffleId] ? '▼' : '▶'}</span>
                </div>
                {expandedRaffles[raffleId] && (
                  <div className="group-entries">
                    {tickets.map(ticket => (
                      <div key={ticket.id} className="ticket-card">
                        <p><strong>📍 Guess:</strong> ({ticket.xCoord.toFixed(1)}, {ticket.yCoord.toFixed(1)})</p>
                        <p><strong>🗓 Entered:</strong> {new Date(ticket.createdAt.seconds * 1000).toLocaleString()}</p>
                        <p><strong>⏰ Expires:</strong> {ticket.raffleExpiryDate?.seconds
                          ? new Date(ticket.raffleExpiryDate.seconds * 1000).toLocaleDateString()
                          : 'Unknown'}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileScreen;
