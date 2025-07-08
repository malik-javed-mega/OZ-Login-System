import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Login.css";

const Login = () => {
  const { login, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  return (
    <div className="login-container">
      <div className="login-box">
        <h1>Welcome to MyGigsters</h1>
        <p>Sign in with your Outsized account to continue</p>
        <button className="login-button" onClick={login}>
          Sign in with Outsized
        </button>
      </div>
    </div>
  );
};

export default Login;
