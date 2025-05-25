import React from 'react';
import { useAuth } from '../../contexts/AuthContext';

const UserInfo: React.FC = () => {
  const { currentUser, logout } = useAuth();

  // Render nothing if there is no current user (user is logged out)
  if (!currentUser) {
    return null;
  }

  // Simple placeholder for the profile picture based on the original logic
  const userPfpUrl = currentUser.photoURL || `https://ui-avatars.com/api/?name=${currentUser.email?.charAt(0).toUpperCase()}&background=random&color=fff`;

  return (
    <div>
      <h2>User Information</h2>
      <div>
        <img 
          src={userPfpUrl}
          alt="User Profile"
          style={{ width: '40px', height: '40px', borderRadius: '50%', marginRight: '10px' }} // Basic styling
        />
        <p>Logged in as: <span id="user-email-display">{currentUser.email}</span></p>
      </div>
      <button onClick={logout}>
        Logout
      </button>
    </div>
  );
};

export default UserInfo;