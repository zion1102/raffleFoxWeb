import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../config/firebaseConfig';
import {
  updateEmail,
  updatePassword,
  sendPasswordResetEmail,
  onAuthStateChanged
} from 'firebase/auth';
import {
  doc,
  getDoc,
  updateDoc
} from 'firebase/firestore';
import TopNavBar from './TopNavBar';
import '../styles/EditProfilePage.css';

const EditProfilePage = () => {
  const [userData, setUserData] = useState(null);
  const [providerId, setProviderId] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    age: '',
    phone: ''
  });

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate('/login');
        return;
      }

      const provider = user.providerData[0]?.providerId || '';
      setProviderId(provider);

      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const data = userSnap.data();
        setUserData(data);
        setFormData({
          name: data.name || '',
          email: user.email || '',
          password: '',
          age: data.age || '',
          phone: data.phone || ''
        });
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const validatePhone = (phone) => {
    const phoneRegex = /^[0-9\-\+\(\) ]{7,20}$/;
    return phoneRegex.test(phone);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    try {
      const user = auth.currentUser;
      const updates = {};

      if (providerId === 'password') {
        if (formData.email !== user.email) {
          await updateEmail(user, formData.email);
        }
        if (formData.password) {
          await updatePassword(user, formData.password);
        }
      }

      if (!validatePhone(formData.phone)) {
        throw new Error('Invalid phone number format.');
      }

      if (formData.name !== userData.name) updates.name = formData.name;
      if (formData.age !== userData.age) updates.age = formData.age;
      if (formData.phone !== userData.phone) updates.phone = formData.phone;

      if (Object.keys(updates).length > 0) {
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, updates);
      }

      setMessage('Profile updated successfully!');
      setTimeout(() => navigate('/profile'), 1500);
    } catch (err) {
      console.error(err);
      setError('Error updating profile: ' + err.message);
    }

    setLoading(false);
  };

  const handleForgotPassword = async () => {
    try {
      await sendPasswordResetEmail(auth, formData.email);
      setMessage('Password reset email sent.');
    } catch (err) {
      setError('Failed to send reset email: ' + err.message);
    }
  };

  const isPasswordProvider = providerId === 'password';

  return (
    <>
      <TopNavBar />
      <div className="edit-profile-container">
        <h2>Edit Your Profile</h2>

        <form className="edit-profile-form" onSubmit={handleSave}>
          <div className="form-group">
            <label>Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Phone</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="(e.g. 555-555-1234)"
              required
            />
          </div>

          {isPasswordProvider && (
            <>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>New Password</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Leave blank to keep current password"
                />
              </div>

              <div className="form-inline-button-row">
                <button type="button" onClick={handleForgotPassword}>Reset Password</button>
                <button type="button" onClick={() => alert('Change email logic pending...')}>
                  Change Email
                </button>
              </div>
            </>
          )}

          <div className="form-group">
            <label>Age</label>
            <input
              type="number"
              name="age"
              value={formData.age}
              onChange={handleChange}
              min="0"
              max="120"
            />
          </div>

          <button type="submit" className="save-button" disabled={loading}>
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </form>

        <button className="back-button" onClick={() => navigate('/profile')}>
          ⬅ Back to Profile
        </button>

        {message && <p className="success-message">{message}</p>}
        {error && <p className="error-message">{error}</p>}
      </div>
    </>
  );
};

export default EditProfilePage;
