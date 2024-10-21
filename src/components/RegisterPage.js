import React, { useState } from 'react';
import '../styles/RegisterPage.css';
import '../styles/TopNavBar.css';
import TopNavBar from './TopNavBar';

const RegisterPage = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    // Handle registration logic
    console.log('Registering:', { name, email, password });
  };

  return (
    <div><TopNavBar/>
    <div className="register-container">
      <h2>Register</h2>
      <form onSubmit={handleSubmit} className="register-form">
        <label>Name</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />

        <label>Email</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />

        <label>Password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />

        <button type="submit" className="submit-button">Register</button>
      </form>
    </div>
    </div>
  );
};

export default RegisterPage;
