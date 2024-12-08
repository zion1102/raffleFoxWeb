import React, { useEffect, useState } from "react";
import {
  applyActionCode,
  verifyPasswordResetCode,
  confirmPasswordReset,
} from "firebase/auth";
import { auth } from "../config/firebaseConfig";

const EmailPasswordUpdate = () => {
  const [mode, setMode] = useState(null);
  const [oobCode, setOobCode] = useState(null);
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    // Extract query parameters from the URL
    const params = new URLSearchParams(window.location.search);
    setMode(params.get("mode"));
    setOobCode(params.get("oobCode"));
  }, []);

  const handleEmailVerification = async () => {
    try {
      if (!oobCode) throw new Error("Invalid action code.");
      await applyActionCode(auth, oobCode);
      setMessage("Email verified successfully!");
    } catch (error) {
      setMessage(`Error verifying email: ${error.message}`);
    }
  };

  const handlePasswordReset = async () => {
    try {
      if (!oobCode || password.length < 6) throw new Error("Invalid input.");
      await verifyPasswordResetCode(auth, oobCode);
      await confirmPasswordReset(auth, oobCode, password);
      setMessage("Password reset successfully!");
    } catch (error) {
      setMessage(`Error resetting password: ${error.message}`);
    }
  };

  return (
    <div>
      <h1>Update Account</h1>
      {mode === "verifyEmail" ? (
        <button onClick={handleEmailVerification}>Verify Email</button>
      ) : mode === "resetPassword" ? (
        <div>
          <input
            type="password"
            placeholder="Enter new password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button onClick={handlePasswordReset}>Reset Password</button>
        </div>
      ) : (
        <p>Invalid mode.</p>
      )}
      {message && <p>{message}</p>}
    </div>
  );
};

export default EmailPasswordUpdate;
