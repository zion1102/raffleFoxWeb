import React, { useState } from 'react';
import '../styles/RegisterPage.css';
import '@fortawesome/fontawesome-free/css/all.min.css';
import TopNavBar from './TopNavBar';
import { auth, db } from '../config/firebaseConfig';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

const RegisterPage = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState('');
  const [profilePic, setProfilePic] = useState('https://www.gravatar.com/avatar/?d=mp&s=200');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const navigate = useNavigate();

  const isValidPassword = (pwd) => {
    return (
      pwd.length >= 8 &&
      /[A-Z]/.test(pwd) &&
      /[a-z]/.test(pwd) &&
      /[^A-Za-z0-9]/.test(pwd)
    );
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setProfilePic(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) return alert('Passwords do not match');
    if (!isValidPassword(password)) return alert('Password does not meet requirements');

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await updateProfile(user, {
        displayName: `${firstName} ${lastName}`,
        photoURL: profilePic,
      });

      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        name: `${firstName} ${lastName}`,
        email,
        phone,
        dateOfBirth: dob,
        profilePicture: profilePic,
        userType: 'player',
        isBanned: false,
        credits: 0,
        createdAt: new Date().toISOString(),
      });

      alert('Account created successfully!');
      navigate('/login');
    } catch (error) {
      console.error('Registration error:', error);
      alert(error.message);
    }
  };

  return (
    <div>
      <TopNavBar />
      <div className="register-wrapper">
        <form className="register-box" onSubmit={handleSubmit}>
          <h2>Create an Account</h2>

          <div className="avatar-container">
            <img src={profilePic} alt="Profile" className="avatar-img" />
            <label className="avatar-upload">
              <input type="file" accept="image/*" onChange={handleImageChange} />
              <i className="fa-solid fa-camera"></i>
            </label>
          </div>

          <div className="name-row">
            <div className="form-group">
              <label>First Name</label>
              <input value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Last Name</label>
              <input value={lastName} onChange={(e) => setLastName(e.target.value)} required />
            </div>
          </div>

          <div className="form-group">
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>

          <div className="form-group">
            <label>Password</label>
            <div className="password-wrap">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <span onClick={() => setShowPassword(!showPassword)}>
                <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
              </span>
            </div>
            <ul className="password-rules">
              <li>• At least 8 characters</li>
              <li>• One uppercase letter</li>
              <li>• One lowercase letter</li>
              <li>• One special character</li>
            </ul>
          </div>

          <div className="form-group">
            <label>Confirm Password</label>
            <div className="password-wrap">
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
              <span onClick={() => setShowConfirm(!showConfirm)}>
                <i className={`fa-solid ${showConfirm ? 'fa-eye-slash' : 'fa-eye'}`}></i>
              </span>
            </div>
          </div>

          <div className="form-group">
            <label>Phone Number</label>
            <input
              type="tel"
              pattern="[0-9]{10,15}"
              placeholder="e.g. 4151234567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Date of Birth</label>
            <input
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="register-btn">Register</button>
        </form>
      </div>
    </div>
  );
};

export default RegisterPage;
