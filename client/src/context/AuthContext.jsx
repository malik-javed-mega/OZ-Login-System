import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";

const AuthContext = createContext(null);

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authWindow, setAuthWindow] = useState(null);
  const [exchangingToken, setExchangingToken] = useState(false);
  const processedCodes = useRef(new Set());

  const handleMessage = useCallback(async (event) => {
    console.log("Received postMessage event:", event.data);
    
    // Verify origin in production
    if (event.data.type === "AUTH_CALLBACK" && 
        event.data.code && 
        !exchangingToken && 
        !processedCodes.current.has(event.data.code)) {
      
      console.log("Starting token exchange with code:", event.data.code);
      setExchangingToken(true);
      processedCodes.current.add(event.data.code);
      
      try {
        console.log("Making token exchange request to:", `${API_URL}/api/auth/exchange-token`);
        const response = await axios.post(
          `${API_URL}/api/auth/exchange-token`,
          {
            code: event.data.code,
          }
        );

        console.log("Token exchange successful:", response.data);
        const { token, user } = response.data;
        localStorage.setItem("token", token);
        setUser(user);

        // Close the auth window if it's still open
        if (authWindow && !authWindow.closed) {
          authWindow.close();
        }
      } catch (error) {
        console.error("Token exchange failed:", {
          error: error.response?.data || error,
          status: error.response?.status,
          headers: error.response?.headers
        });
        // Clear any existing token on error
        localStorage.removeItem("token");
        setUser(null);
      } finally {
        setExchangingToken(false);
      }
    }
  }, [authWindow, exchangingToken]);

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem("token");
    if (token) {
      console.log("Found existing token, verifying...");
      verifyToken(token);
    } else {
      setLoading(false);
    }

    // Add message event listener
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [handleMessage]);

  const verifyToken = async (token) => {
    try {
      console.log("Verifying token...");
      const response = await axios.get(`${API_URL}/api/auth/verify`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log("Token verification successful:", response.data);
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
      console.log("Requesting login URL from:", `${API_URL}/api/auth/login-url`);
      const response = await axios.get(`${API_URL}/api/auth/login-url`);
      const { url } = response.data;
      console.log("Received login URL:", url);

      // Open popup window for OAuth
      const width = 600;
      const height = 600;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      console.log("Opening popup window...");
      const popup = window.open(
        url,
        "OZ Login",
        `width=${width},height=${height},left=${left},top=${top}`
      );

      // Store the popup reference
      setAuthWindow(popup);

      // Check if popup was blocked
      if (!popup || popup.closed || typeof popup.closed === "undefined") {
        throw new Error("Popup was blocked. Please allow popups for this site.");
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
