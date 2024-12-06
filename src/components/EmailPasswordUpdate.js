import React, { useEffect, useState } from "react";
import {applyActionCode, verifyPasswordResetCode, confirmPasswordReset } from "firebase/auth";

const EmailPasswordUpdate = () => {
  const [actionCode, setActionCode] = useState(null);
  const [mode, setMode] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const mode = query.get("mode");
    const actionCode = query.get("oobCode");

    setMode(mode);
    setActionCode(actionCode);
  }, []);

  const handleEmailVerification = async () => {
    try {
      if (!actionCode) throw new Error("Invalid action code.");
      await applyActionCode(auth, actionCode);
      setMessage("Email successfully verified! You can now log in.");
    } catch (error) {
      setMessage(`Error verifying email: ${error.message}`);
    }
  };

  const handlePasswordReset = async () => {
    try {
      if (!actionCode) throw new Error("Invalid action code.");
      await verifyPasswordResetCode(auth, actionCode); // Verify the code
      await confirmPasswordReset(auth, actionCode, password); // Confirm new password
      setMessage("Password reset successful! You can now log in.");
    } catch (error) {
      setMessage(`Error resetting password: ${error.message}`);
    }
  };

  return (
    <div style={{ padding: "2rem", fontFamily: "Arial, sans-serif" }}>
      <h1>Update Account</h1>
      {mode === "verifyEmail" && (
        <>
          <p>Verifying your email...</p>
          <button onClick={handleEmailVerification}>Verify Email</button>
        </>
      )}
      {mode === "resetPassword" && (
        <>
          <p>Enter your new password below:</p>
          <input
            type="password"
            placeholder="New Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ padding: "0.5rem", margin: "1rem 0", width: "100%" }}
          />
          <button onClick={handlePasswordReset} style={{ padding: "0.5rem 1rem" }}>
            Reset Password
          </button>
        </>
      )}
      {message && <p>{message}</p>}
    </div>
  );
};

export default EmailPasswordUpdate;
