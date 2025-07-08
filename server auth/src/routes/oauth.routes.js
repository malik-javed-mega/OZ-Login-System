const express = require("express");
const router = express.Router();
const { v4: uuidv4 } = require("uuid");
const jwt = require("jsonwebtoken");
const User = require("../models/user.model");
const { AuthCode, AccessToken } = require("../models/oauth.model");
const path = require("path");

// Middleware to verify client credentials
const verifyClient = (req, res, next) => {
  const clientId = req.body.client_id || req.query.client_id;
  const clientSecret = req.body.client_secret;

  console.log('Verifying client:', {
    receivedClientId: clientId,
    expectedClientId: process.env.CLIENT_ID,
    hasSecret: !!clientSecret
  });

  // Only check client_secret for token endpoint
  if (req.path === '/token') {
    if (!clientSecret || clientSecret !== process.env.CLIENT_SECRET) {
      console.log('Invalid client secret for token endpoint');
      return res.status(401).json({ error: 'Invalid client secret' });
    }
  }

  // Check client_id
  if (!clientId || clientId !== process.env.CLIENT_ID) {
    console.log('Invalid client ID');
    return res.status(401).json({ error: 'Invalid client', 
      details: `Expected ${process.env.CLIENT_ID}, got ${clientId}`
    });
  }

  next();
};

// Authorization endpoint - shows login page or generates auth code
router.get("/authorize", verifyClient, async (req, res) => {
  const { client_id, redirect_uri, state } = req.query;
  const authHeader = req.headers.authorization;

  // Validate redirect_uri (in production, check against registered URIs)
  if (!redirect_uri) {
    return res.status(400).json({ error: "Missing redirect_uri" });
  }

  // If no auth token, show login page
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.sendFile(path.join(__dirname, "../public/login.html"));
  }

  try {
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your-secret-key"
    );
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    // Generate authorization code
    const authCode = new AuthCode({
      code: uuidv4(),
      userId: user._id,
      clientId: client_id,
    });

    await authCode.save();

    // Redirect back to client with code
    const redirectUrl = new URL(redirect_uri);
    redirectUrl.searchParams.append("code", authCode.code);
    if (state) redirectUrl.searchParams.append("state", state);

    res.redirect(redirectUrl.toString());
  } catch (error) {
    console.error("Authorization error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Token endpoint - exchanges auth code for access token
router.post("/token", verifyClient, async (req, res) => {
  const { code, grant_type } = req.body;

  if (grant_type !== "authorization_code") {
    return res.status(400).json({ error: "Unsupported grant type" });
  }

  try {
    const authCode = await AuthCode.findOne({ code, isUsed: false });

    if (!authCode || authCode.expiresAt < new Date()) {
      return res.status(400).json({ error: "Invalid or expired code" });
    }

    // Mark code as used
    authCode.isUsed = true;
    await authCode.save();

    // Generate access token
    const accessToken = new AccessToken({
      token: jwt.sign(
        { userId: authCode.userId },
        process.env.JWT_SECRET || "your-secret-key"
      ),
      userId: authCode.userId,
      clientId: authCode.clientId,
    });

    await accessToken.save();

    res.json({
      access_token: accessToken.token,
      token_type: "Bearer",
      expires_in: 86400, // 24 hours
    });
  } catch (error) {
    console.error("Token exchange error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// User info endpoint - returns user data using access token
router.get("/userinfo", async (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid token" });
  }

  const token = authHeader.split(" ")[1];

  try {
    // Verify token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your-secret-key"
    );
    const accessToken = await AccessToken.findOne({ token });

    if (!accessToken || accessToken.expiresAt < new Date()) {
      return res.status(401).json({ error: "Token expired" });
    }

    // Get user info
    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(user);
  } catch (error) {
    console.error("User info error:", error);
    res.status(401).json({ error: "Invalid token" });
  }
});

module.exports = router;
