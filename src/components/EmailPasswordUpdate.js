import React, { useEffect, useState } from "react";
import { applyActionCode, verifyPasswordResetCode, confirmPasswordReset } from "firebase/auth";
import { auth } from "../config/firebaseConfig"; // Adjust path as needed

const EmailPasswordUpdate = () => {
  const [actionCode, setActionCode] = useState(null);
  const [mode, setMode] = useState(null);
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const mode = query.get("mode");
    const actionCode = query.get("oobCode");
  
    console.log("Mode:", mode); // Debugging
    console.log("Action Code:", actionCode); // Debugging
  
    if (!actionCode) {
      setMessage("Invalid or missing action code. Please try again.");
    }
  
    setMode(mode);
    setActionCode(actionCode);
  }, []);
  
  

  const handleEmailVerification = async () => {
    try {
      if (!actionCode) throw new Error("Invalid or missing action code.");
      setLoading(true);
      await applyActionCode(auth, actionCode);
      setMessage("Email successfully verified! You can now log in.");
    } catch (error) {
      console.error("Error verifying email:", error);
      setMessage(`Error verifying email: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (password.length < 6) {
      setMessage("Password must be at least 6 characters long.");
      return;
    }

    try {
      if (!actionCode) throw new Error("Invalid or missing action code.");
      setLoading(true);
      await verifyPasswordResetCode(auth, actionCode); // Verify the code
      await confirmPasswordReset(auth, actionCode, password); // Confirm new password
      setMessage("Password reset successful! You can now log in.");
    } catch (error) {
      console.error("Error resetting password:", error);
      setMessage(`Error resetting password: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "2rem", fontFamily: "Arial, sans-serif" }}>
      <h1>Update Account</h1>
      {loading ? (
        <p>Processing...</p>
      ) : (
        <>
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
          {!mode && <p>Invalid or unsupported action. Please try again.</p>}
          {message && <p>{message}</p>}
        </>
      )}
    </div>
  );
};

export default EmailPasswordUpdate;

