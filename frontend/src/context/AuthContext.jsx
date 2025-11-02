import { createContext, useContext, useEffect, useState } from "react";
import { api } from "../lib/api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => {
    if (typeof window === "undefined") {
      return null;
    }
    return localStorage.getItem("token") || null;
  });
  const [user, setUser] = useState(() => {
    if (typeof window === "undefined") {
      return null;
    }
    const saved = localStorage.getItem("user");
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(false);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (!token) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      return;
    }

    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));
  }, [token, user]);

  const login = async (identifier, password) => {
    setLoading(true);
    setError(null);

    try {
      const payload = {
        identifier: typeof identifier === "string" ? identifier.trim() : "",
        password,
      };

      const { data } = await api.post("/api/login", payload);
      const tokenValue = data?.token ?? null;
      const userData = data?.user ?? null;

      if (!tokenValue || !userData) {
        throw new Error("Credenciais invalidas.");
      }

      setToken(tokenValue);
      setUser(userData);
      if (typeof window !== "undefined") {
        localStorage.setItem("token", tokenValue);
        localStorage.setItem("user", JSON.stringify(userData));
      }

      return userData;
    } catch (authError) {
      const message =
        authError.response?.data?.message ||
        authError.response?.data?.error ||
        "Login failed.";
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    }
  };

  return (
    <AuthContext.Provider value={{ token, user, login, logout, loading, error, setError }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
