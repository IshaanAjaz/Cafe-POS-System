import React, {createContext, useState, useEffect, useContext} from 'react';
import auth from '@react-native-firebase/auth';

// Create the context
const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({children}) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Listen for auth state changes
  useEffect(() => {
    // FIX: Use onIdTokenChanged instead of onAuthStateChanged.
    // This ensures that when we call user.reload() (to check email verification),
    // the app state actually updates and lets the user in.
    const unsubscribe = auth().onIdTokenChanged(u => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const logout = async () => {
    await auth().signOut();
  };

  return (
    <AuthContext.Provider value={{user, loading, logout}}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
