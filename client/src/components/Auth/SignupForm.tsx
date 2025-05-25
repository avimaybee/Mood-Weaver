import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

const SignupForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { signup } = useAuth();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signup(email, password);
      // Optionally redirect user or show success message on successful signup
    } catch (err: any) {
      console.error("Failed to sign up:", err);
      // Display a user-friendly error message based on Firebase error codes
      let errorMessage = "Failed to sign up. Please try again.";
       if (err.code) {
        switch (err.code) {
          case 'auth/email-already-in-use':
            errorMessage = 'The email address is already in use.';
            break;
          case 'auth/invalid-email':
            errorMessage = 'The email address is not valid.';
            break;
          case 'auth/weak-password':
            errorMessage = 'The password is too weak (minimum 6 characters).';
            break;
          case 'auth/operation-not-allowed':
            errorMessage = 'Email/password sign-up is not enabled.';
            break;
          default:
            errorMessage = err.message; // Fallback to Firebase message
        }
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Sign Up</h2>
      {error && <div style={{ color: 'red' }}>{error}</div>}
      <div>
        <label htmlFor="signup-email">Email:</label>
        <input
          type="email"
          id="signup-email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div>
        <label htmlFor="signup-password">Password:</label>
        <input
          type="password"
          id="signup-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      <button type="submit" disabled={loading}>
        {loading ? 'Signing Up...' : 'Sign Up'}
      </button>
    </form>
  );
};

export default SignupForm; 