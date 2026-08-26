import React, { createContext, useContext, useState } from "react";

import { UserProfile } from "../types/email";

interface AuthContextType {
  user: UserProfile | null;
  login: (name: string, email: string, picture?: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = "reachinbox_auth_user";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const login = (name: string, email: string, picture?: string) => {
    const profile: UserProfile = {
      name: name.trim(),
      email: email.trim(),
      picture,
    };
    setUser(profile);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(profile));
  };


  const logout = () => {
    setUser(null);
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
