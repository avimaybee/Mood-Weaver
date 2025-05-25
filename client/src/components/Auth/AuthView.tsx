import React, { useState } from 'react';
import type { FormEvent } from 'react';
import { useAuth } from '../../contexts/AuthContext';
// import LoginForm from './LoginForm'; // Removed unused import
// import SignupForm from './SignupForm'; // Removed unused import
import UserInfo from './UserInfo';

const AuthView: React.FC = () => {
  const { currentUser, loading, login, signup } = useAuth();
  const [showLogin, setShowLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(''); // Clear previous errors

    try {
      if (showLogin) {
        await login(email, password);
      } else {
        await signup(email, password);
      }
    } catch (err: any) {
      setError(err.message); // Display error message
    }
  };

  // Show loading indicator while checking auth state
  if (loading) {
    return <div>Loading authentication...</div>;
  }

  if (currentUser) {
    // If user is logged in, show user info
    return <UserInfo />;
  } else {
    // If user is logged out, show login or signup form
    return (
      <div className="auth-view max-w-md mx-auto mt-10 p-4 sm:p-6 bg-surface rounded-lg border border-border shadow-card">
        <h2 className="text-textPrimary text-2xl font-semibold mb-6 text-center">{showLogin ? 'Login' : 'Sign Up'}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-textPrimary text-sm font-medium mb-1">Email:</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="block w-full border border-border rounded-md shadow-sm p-2 text-textPrimary focus:ring-primary focus:border-primary"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-textPrimary text-sm font-medium mb-1">Password:</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="block w-full border border-border rounded-md shadow-sm p-2 text-textPrimary focus:ring-primary focus:border-primary"
            />
          </div>

          {error && <p className="text-red-600 text-sm mb-4 text-center">{error}</p>}

          {/* Login/Sign Up Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          >
            {showLogin ? 'Login' : 'Sign Up'}
          </button>
        </form>

        {/* Toggle between Login and Sign Up */}
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => setShowLogin(!showLogin)}
            className="text-sm text-primary hover:underline focus:outline-none"
          >
            {showLogin ? 'Need an account? Sign Up' : 'Already have an account? Login'}
          </button>
        </div>
      </div>
    );
  }
};

export default AuthView;