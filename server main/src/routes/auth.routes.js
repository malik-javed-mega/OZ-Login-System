const express = require("express");
const router = express.Router();
const axios = require("axios");
const jwt = require("jsonwebtoken");
const User = require("../models/user.model");

// OAuth configuration
const OZ_AUTH_SERVER = process.env.OZ_AUTH_SERVER || "http://localhost:5001";
const CLIENT_ID = process.env.CLIENT_ID || "mygisters-app";
const CLIENT_SECRET =
  process.env.CLIENT_SECRET || "mygisters-secret-change-this-in-production";
const REDIRECT_URI =
  process.env.REDIRECT_URI || "http://localhost:5173/auth/callback";

// Exchange authorization code for access token
router.post("/exchange-token", async (req, res) => {
  const { code } = req.body;

  try {
    console.log("Exchanging token with params:", {
      grant_type: "authorization_code",
      client_id: CLIENT_ID,
      code,
    });

    // Exchange code for access token
    const tokenResponse = await axios.post(`${OZ_AUTH_SERVER}/oauth/token`, {
      grant_type: "authorization_code",
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code,
    });

    const { access_token } = tokenResponse.data;

    // Get user info using access token
    const userResponse = await axios.get(`${OZ_AUTH_SERVER}/oauth/userinfo`, {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    const ozUserData = userResponse.data;

    // Find or create user in our database
    let user = await User.findOne({ ozId: ozUserData._id });

    if (!user) {
      user = new User({
        email: ozUserData.email,
        name: ozUserData.name,
        ozId: ozUserData._id,
        profile: ozUserData,
      });
      await user.save();
    }

    // Generate session token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "7d" }
    );

    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error) {
    console.error(
      "Token exchange error:",
      error.response?.data || error.message
    );
    res.status(500).json({ message: "Error exchanging token" });
  }
});

// Get OAuth login URL
router.get("/login-url", (req, res) => {
  const authUrl = new URL(`${OZ_AUTH_SERVER}/oauth/authorize`);
  authUrl.searchParams.append("client_id", CLIENT_ID);
  authUrl.searchParams.append("redirect_uri", REDIRECT_URI);
  authUrl.searchParams.append("response_type", "code");
  authUrl.searchParams.append("state", Math.random().toString(36).substring(7));

  res.json({ url: authUrl.toString() });
});

// Verify session token
router.get("/verify", async (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your-secret-key"
    );
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error) {
    res.status(401).json({ message: "Invalid token" });
  }
});

module.exports = router;
