import { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

const AuthContext = createContext(null);

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authWindow, setAuthWindow] = useState(null);

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem("token");
    if (token) {
      verifyToken(token);
    } else {
      setLoading(false);
    }

    // Add message event listener
    const handleMessage = async (event) => {
      // Verify origin in production
      if (event.data.type === "AUTH_CALLBACK" && event.data.code) {
        try {
          const response = await axios.post(
            `${API_URL}/api/auth/exchange-token`,
            {
              code: event.data.code,
            }
          );

          const { token, user } = response.data;
          localStorage.setItem("token", token);
          setUser(user);

          // Close the auth window if it's still open
          if (authWindow && !authWindow.closed) {
            authWindow.close();
          }
        } catch (error) {
          console.error("Token exchange failed:", error);
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [authWindow]);

  const verifyToken = async (token) => {
    try {
      const response = await axios.get(`${API_URL}/api/auth/verify`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUser(response.data.user);
    } catch (error) {
      console.error("Token verification failed:", error);
      localStorage.removeItem("token");
    } finally {
      setLoading(false);
    }
  };

  const login = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/auth/login-url`);
      const { url } = response.data;

      // Open popup window for OAuth
      const width = 600;
      const height = 600;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      const popup = window.open(
        url,
        "OZ Login",
        `width=${width},height=${height},left=${left},top=${top}`
      );

      // Store the popup reference
      setAuthWindow(popup);

      // Check if popup was blocked
      if (!popup || popup.closed || typeof popup.closed === "undefined") {
        throw new Error(
          "Popup was blocked. Please allow popups for this site."
        );
      }
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
