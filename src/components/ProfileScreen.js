import React, { useState, useEffect } from 'react';
import { db, auth } from '../config/firebaseConfig'; // Import Firestore and Auth
import { doc, getDoc } from 'firebase/firestore';
import TopNavBar from './TopNavBar'; // Import the top navbar
import '../styles/ProfileScreen.css'; // Import custom CSS

const ProfileScreen = () => {
  const [user, setUser] = useState(null); // State to hold user data
  const [loading, setLoading] = useState(true); // State to handle loading

  useEffect(() => {
    const fetchUserData = async () => {
      const currentUser = auth.currentUser;
      if (currentUser) {
        const userRef = doc(db, 'users', currentUser.uid); // Reference to the user's document
        const userSnap = await getDoc(userRef); // Get the user document
        if (userSnap.exists()) {
          setUser(userSnap.data()); // Set user data in state
        } else {
          console.error('No such user!');
        }
      }
      setLoading(false); // Set loading to false when data is fetched
    };

    fetchUserData();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <TopNavBar />
      <div className="profile-container">
        <div className="profile-header">
          <img
            className="profile-picture"
            src={user?.profilePicture || "https://via.placeholder.com/150"} // Default profile picture
            alt="Profile"
          />
          <h2>{user?.name || 'User'}</h2>
          <p>{user?.email || 'No email provided'}</p>
        </div>
        
        <div className="profile-details">
          <h3>Account Details</h3>
          <div className="profile-card">
            <div className="profile-item">
              <strong>Phone:</strong> {user?.phone || 'N/A'}
            </div>
            <div className="profile-item">
              <strong>Credits:</strong> {user?.credits || 0}
            </div>
            <div className="profile-item">
              <strong>User Type:</strong> {user?.userType || 'N/A'}
            </div>
            <div className="profile-item">
              <strong>Age:</strong> {user?.age || 'N/A'}
            </div>
            <div className="profile-item">
              <strong>Account Created At:</strong>{' '}
              {new Date(user?.createdAt?.seconds * 1000).toLocaleDateString() || 'N/A'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileScreen;
