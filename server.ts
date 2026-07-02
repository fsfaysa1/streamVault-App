/**
 * StreamVault IPTV Platform
 * Express Full-Stack Server
 */

import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import crypto from 'crypto';
import http from 'http';
import https from 'https';
import { URL } from 'url';
import { createServer as createViteServer } from 'vite';
import { DB, hashPassword } from './src/server-db';
import { User, Channel, SubscriptionRequest, WatchHistoryEntry, LoginHistoryEntry, FavouriteEntry } from './src/types';

// In-memory Session Manager for instant, secure authentication
const SESSIONS = new Map<string, { userId: string; expiresAt: number }>();
const SESSION_TTL = 24 * 60 * 60 * 1000; // 24 hours

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize database
DB.init();

// Middleware to parse and validate user authentication from Headers
function authenticateUser(req: any, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required. Please login.' });
  }

  const token = authHeader.substring(7);
  const session = SESSIONS.get(token);

  if (!session) {
    return res.status(401).json({ error: 'Session expired or invalid. Please login again.' });
  }

  if (Date.now() > session.expiresAt) {
    SESSIONS.delete(token);
    return res.status(401).json({ error: 'Session expired. Please login again.' });
  }

  const users = DB.getUsers();
  const user = users.find(u => u.id === session.userId);

  if (!user) {
    return res.status(401).json({ error: 'User no longer exists.' });
  }

  if (user.isBanned) {
    return res.status(403).json({ error: 'Your account has been banned. Please contact support.' });
  }

  // Recalculate dynamic premium status based on expiry date
  if (user.premiumStatus && user.premiumExpiryDate) {
    const expiry = new Date(user.premiumExpiryDate);
    if (Date.now() > expiry.getTime()) {
      user.premiumStatus = false;
      DB.saveUsers(users); // Save updated status
    }
  }

  req.user = user;
  req.token = token;
  next();
}

// Middleware to restrict access to Admins only
function requireAdmin(req: any, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied. Administrator role required.' });
  }
  next();
}

// ================= AUTH ENDPOINTS =================

// POST /api/auth/register
app.post('/api/auth/register', (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Username, email and password are required.' });
  }

  const cleanUsername = username.trim().toLowerCase();
  const cleanEmail = email.trim().toLowerCase();

  if (cleanUsername.length < 3) {
    return res.status(400).json({ error: 'Username must be at least 3 characters long.' });
  }

  if (password.length < 5) {
    return res.status(400).json({ error: 'Password must be at least 5 characters long.' });
  }

  const users = DB.getUsers();

  const usernameExists = users.some(u => u.username.toLowerCase() === cleanUsername);
  if (usernameExists) {
    return res.status(400).json({ error: 'Username is already taken.' });
  }

  const emailExists = users.some(u => u.email.toLowerCase() === cleanEmail);
  if (emailExists) {
    return res.status(400).json({ error: 'Email is already registered.' });
  }

  const newUser: User = {
    id: crypto.randomUUID(),
    username: username.trim(),
    email: cleanEmail,
    passwordHash: hashPassword(password),
    role: 'user',
    isBanned: false,
    createdAt: new Date().toISOString(),
    lastLoginAt: null,
    lastLoginIp: null,
    lastLoginDevice: null,
    lastLoginBrowser: null,
    lastLoginOS: null,
    premiumStatus: false,
    premiumStartDate: null,
    premiumExpiryDate: null
  };

  users.push(newUser);
  DB.saveUsers(users);

  // Generate session token immediately
  const token = crypto.randomBytes(32).toString('hex');
  SESSIONS.set(token, {
    userId: newUser.id,
    expiresAt: Date.now() + SESSION_TTL
  });

  const { passwordHash, ...userResponse } = newUser;
  res.status(201).json({
    message: 'Registration successful',
    token,
    user: userResponse
  });
});

// POST /api/auth/login
app.post('/api/auth/login', (req, res) => {
  const { credential, password } = req.body; // credential can be email or username

  if (!credential || !password) {
    return res.status(400).json({ error: 'Email/Username and password are required.' });
  }

  const cleanCredential = credential.trim().toLowerCase();
  const hashedInput = hashPassword(password);
  
  const users = DB.getUsers();
  const user = users.find(u => 
    u.email.toLowerCase() === cleanCredential || 
    u.username.toLowerCase() === cleanCredential
  );

  if (!user || user.passwordHash !== hashedInput) {
    return res.status(401).json({ error: 'Invalid username/email or password.' });
  }

  if (user.isBanned) {
    return res.status(403).json({ error: 'Your account has been banned. Please contact support.' });
  }

  // Recalculate premium status on login
  if (user.premiumStatus && user.premiumExpiryDate) {
    const expiry = new Date(user.premiumExpiryDate);
    if (Date.now() > expiry.getTime()) {
      user.premiumStatus = false;
    }
  }

  // Gather audit and geo details (from headers or connection)
  const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
  const userAgent = req.headers['user-agent'] || 'Unknown Device';
  
  // Simple regex-based client OS/Browser parsing for auditing
  let browser = 'Unknown Browser';
  if (userAgent.includes('Chrome')) browser = 'Chrome';
  else if (userAgent.includes('Firefox')) browser = 'Firefox';
  else if (userAgent.includes('Safari')) browser = 'Safari';
  else if (userAgent.includes('Edge')) browser = 'Edge';

  let os = 'Unknown OS';
  if (userAgent.includes('Windows')) os = 'Windows';
  else if (userAgent.includes('Macintosh')) os = 'macOS';
  else if (userAgent.includes('Android')) os = 'Android';
  else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) os = 'iOS';
  else if (userAgent.includes('Linux')) os = 'Linux';

  user.lastLoginAt = new Date().toISOString();
  user.lastLoginIp = ip;
  user.lastLoginDevice = userAgent.substring(0, 150);
  user.lastLoginBrowser = browser;
  user.lastLoginOS = os;

  DB.saveUsers(users);

  // Create session
  const token = crypto.randomBytes(32).toString('hex');
  SESSIONS.set(token, {
    userId: user.id,
    expiresAt: Date.now() + SESSION_TTL
  });

  // Log to login history
  const loginHistory = DB.getLoginHistory();
  const newLog: LoginHistoryEntry = {
    id: crypto.randomUUID(),
    userId: user.id,
    username: user.username,
    ip,
    device: userAgent.substring(0, 100),
    browser,
    os,
    loginAt: new Date().toISOString()
  };
  loginHistory.push(newLog);
  DB.saveLoginHistory(loginHistory);

  const { passwordHash, ...userResponse } = user;
  res.json({
    message: 'Login successful',
    token,
    user: userResponse
  });
});

// GET /api/auth/me
app.get('/api/auth/me', authenticateUser, (req: any, res) => {
  const { passwordHash, ...userResponse } = req.user;
  res.json({
    user: userResponse,
    token: req.token
  });
});

// POST /api/auth/logout
app.post('/api/auth/logout', authenticateUser, (req: any, res) => {
  SESSIONS.delete(req.token);
  res.json({ message: 'Logged out successfully' });
});

// POST /api/auth/change-password
app.post('/api/auth/change-password', authenticateUser, (req: any, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current password and new password are required.' });
  }

  if (newPassword.length < 5) {
    return res.status(400).json({ error: 'New password must be at least 5 characters long.' });
  }

  const users = DB.getUsers();
  const user = users.find(u => u.id === req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found.' });
  }

  const hashedCurrent = hashPassword(currentPassword);
  if (user.passwordHash !== hashedCurrent) {
    return res.status(401).json({ error: 'Incorrect current password.' });
  }

  user.passwordHash = hashPassword(newPassword);
  DB.saveUsers(users);

  res.json({ message: 'Password changed successfully.' });
});


// ================= PUBLIC SETTINGS ENDPOINT =================

// GET /api/settings
app.get('/api/settings', (req, res) => {
  const settings = DB.getSettings();
  // Don't leak playlistUrl to unauthenticated users if site requires registration
  const { playlistUrl, ...publicSettings } = settings;
  res.json(settings); // Return settings
});


// ================= CHANNELS ENDPOINTS =================

// GET /api/channels (Requires login. Locks premium streams for free users)
app.get('/api/channels', authenticateUser, (req: any, res) => {
  const channels = DB.getChannels();
  const isPremiumUser = req.user.premiumStatus || req.user.role === 'admin';

  // Format channels based on authorization
  const processedChannels = channels
    .filter(c => c.isActive && c.isVisible)
    .map(c => {
      if (c.isPremium && !isPremiumUser) {
        // Return channel info but hide/obfuscate the stream URL
        return {
          ...c,
          url: '', // Empty stream URL for free users to prevent direct extraction
          locked: true
        };
      }
      return {
        ...c,
        locked: false
      };
    });

  res.json(processedChannels);
});

// GET /api/favourites (Returns logged user's favourites)
app.get('/api/favourites', authenticateUser, (req: any, res) => {
  const favourites = DB.getFavourites();
  const userFavourites = favourites
    .filter(f => f.userId === req.user.id)
    .map(f => f.channelId);

  res.json(userFavourites);
});

// POST /api/channels/:id/favourite (Toggle favourite state)
app.post('/api/channels/:id/favourite', authenticateUser, (req: any, res) => {
  const channelId = req.params.id;
  const userId = req.user.id;

  const favourites = DB.getFavourites();
  const index = favourites.findIndex(f => f.userId === userId && f.channelId === channelId);

  let isFavourite = false;
  if (index !== -1) {
    favourites.splice(index, 1);
  } else {
    favourites.push({ userId, channelId });
    isFavourite = true;
  }

  DB.saveFavourites(favourites);
  res.json({ isFavourite });
});

// GET /api/watch-history (Get history for logged user)
app.get('/api/watch-history', authenticateUser, (req: any, res) => {
  const history = DB.getWatchHistory();
  const userHistory = history
    .filter(h => h.userId === req.user.id)
    .sort((a, b) => new Date(b.watchedAt).getTime() - new Date(a.watchedAt).getTime())
    .slice(0, 50); // Last 50 items

  res.json(userHistory);
});

// POST /api/channels/:id/watch (Log channel play/watch event)
app.post('/api/channels/:id/watch', authenticateUser, (req: any, res) => {
  const channelId = req.params.id;
  const channels = DB.getChannels();
  const channel = channels.find(c => c.id === channelId);

  if (!channel) {
    return res.status(404).json({ error: 'Channel not found' });
  }

  // Check premium access
  if (channel.isPremium && !(req.user.premiumStatus || req.user.role === 'admin')) {
    return res.status(403).json({ error: 'This is a Premium channel. Please subscribe.' });
  }

  const history = DB.getWatchHistory();
  
  // Create or update watch entry
  const newEntry: WatchHistoryEntry = {
    id: crypto.randomUUID(),
    userId: req.user.id,
    username: req.user.username,
    channelId: channel.id,
    channelName: channel.name,
    watchedAt: new Date().toISOString(),
    durationSeconds: 120 // Estimated initial duration
  };

  history.push(newEntry);
  DB.saveWatchHistory(history);

  res.json({ success: true, message: 'Watch event logged.' });
});


// ================= PREMIUM PAYMENTS & SUBSCRIPTIONS =================

// POST /api/payments/verify-bKash (Submit subscription request)
app.post('/api/payments/verify-bKash', authenticateUser, (req: any, res) => {
  const { senderNumber, amount, reference, durationDays } = req.body;

  if (!senderNumber || !amount || !reference || !durationDays) {
    return res.status(400).json({ error: 'bKash number, amount, reference and plan duration are required.' });
  }

  const subscriptions = DB.getSubscriptions();

  const newRequest: SubscriptionRequest = {
    id: crypto.randomUUID(),
    userId: req.user.id,
    username: req.user.username,
    paymentMethod: 'bKash',
    senderNumber,
    amount: Number(amount),
    reference: reference.trim(),
    status: 'pending',
    durationDays: Number(durationDays),
    createdAt: new Date().toISOString(),
    resolvedAt: null
  };

  subscriptions.push(newRequest);
  DB.saveSubscriptions(subscriptions);

  // Add system notification for user
  const notifications = DB.getNotifications();
  notifications.push({
    id: crypto.randomUUID(),
    userId: req.user.id,
    title: 'Verification Request Received',
    message: `Your bKash payment verification for standard premium (${durationDays} days) has been received. Admin is verifying your subscription.`,
    type: 'info',
    isReadBy: [],
    createdAt: new Date().toISOString()
  });
  DB.saveNotifications(notifications);

  res.status(201).json({
    message: 'Verification request submitted successfully. Admin will review and activate within minutes.',
    request: newRequest
  });
});

// GET /api/payments/my-requests
app.get('/api/payments/my-requests', authenticateUser, (req: any, res) => {
  const subscriptions = DB.getSubscriptions();
  const myRequests = subscriptions
    .filter(s => s.userId === req.user.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  res.json(myRequests);
});

// GET /api/notifications
app.get('/api/notifications', authenticateUser, (req: any, res) => {
  const notifications = DB.getNotifications();
  const userNotifications = notifications
    .filter(n => n.userId === req.user.id || n.userId === 'all')
    .map(n => ({
      ...n,
      isRead: n.isReadBy.includes(req.user.id)
    }))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  res.json(userNotifications);
});

// POST /api/notifications/read-all
app.post('/api/notifications/read-all', authenticateUser, (req: any, res) => {
  const notifications = DB.getNotifications();
  let updated = false;

  notifications.forEach(n => {
    if ((n.userId === req.user.id || n.userId === 'all') && !n.isReadBy.includes(req.user.id)) {
      n.isReadBy.push(req.user.id);
      updated = true;
    }
  });

  if (updated) {
    DB.saveNotifications(notifications);
  }

  res.json({ success: true });
});


// ================= SECURE MEDIA STREAM PROXY =================
// Helper to rewrite M3U8 URLs so that nested playlists and segment paths are proxied
function rewriteM3u8(playlistContent: string, originalUrl: string): string {
  const lines = playlistContent.split(/\r?\n/);
  const rewrittenLines = lines.map(line => {
    const trimmed = line.trim();
    if (!trimmed) return line;

    if (trimmed.startsWith('#')) {
      // It's a comment or tag. Rewrite any URI="url" attributes
      return trimmed.replace(/URI="([^"]+)"/g, (match, p1) => {
        try {
          const resolved = new URL(p1, originalUrl).href;
          return `URI="/api/proxy-stream?url=${encodeURIComponent(resolved)}"`;
        } catch (e) {
          return match;
        }
      });
    }

    // Direct segment/sub-playlist link, rewrite entirely
    try {
      const resolved = new URL(trimmed, originalUrl).href;
      return `/api/proxy-stream?url=${encodeURIComponent(resolved)}`;
    } catch (e) {
      return line;
    }
  });

  return rewrittenLines.join('\n');
}

// Recursive stream loader that follows redirects up to 5 times
function makeProxyRequest(
  urlStr: string,
  incomingHeaders: Record<string, any>,
  res: any,
  redirectCount = 0
): void {
  if (redirectCount > 5) {
    if (!res.headersSent) {
      res.status(502).json({ error: 'Too many redirects from stream CDN' });
    }
    return;
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(urlStr);
  } catch (err) {
    if (!res.headersSent) {
      res.status(400).json({ error: 'Malformed stream URL' });
    }
    return;
  }

  const requester = urlStr.startsWith('https://') ? https : http;

  const requestHeaders: Record<string, string> = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': '*/*',
  };

  // Pass range header if available
  if (incomingHeaders.range) {
    requestHeaders['Range'] = incomingHeaders.range;
  }

  const options: http.RequestOptions = {
    method: 'GET',
    headers: requestHeaders,
    timeout: 8000, // 8 seconds connection/response timeout
  };

  const proxyRequest = requester.request(urlStr, options, (proxyResponse) => {
    const statusCode = proxyResponse.statusCode || 200;

    // Follow redirects
    if (statusCode >= 300 && statusCode < 400 && proxyResponse.headers.location) {
      const redirectUrl = new URL(proxyResponse.headers.location, urlStr).href;
      proxyResponse.resume(); // discard remaining body of redirect
      makeProxyRequest(redirectUrl, incomingHeaders, res, redirectCount + 1);
      return;
    }

    const contentType = (proxyResponse.headers['content-type'] || '').toLowerCase();
    const isPlaylist = contentType.includes('mpegurl') || 
                      contentType.includes('m3u8') || 
                      urlStr.split('?')[0].endsWith('.m3u8');

    if (isPlaylist) {
      let body = '';
      proxyResponse.setEncoding('utf8');
      proxyResponse.on('data', (chunk) => {
        body += chunk;
      });
      proxyResponse.on('end', () => {
        const rewrittenBody = rewriteM3u8(body, urlStr);
        const cleanHeaders: Record<string, string> = {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': '*',
          'Access-Control-Expose-Headers': 'Content-Length, Content-Range',
          'Content-Type': 'application/vnd.apple.mpegurl',
        };
        res.writeHead(statusCode, cleanHeaders);
        res.end(rewrittenBody);
      });
    } else {
      // Stream binary ts/mp4 segments directly
      const cleanHeaders: Record<string, string> = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Expose-Headers': 'Content-Length, Content-Range',
        'Content-Type': proxyResponse.headers['content-type'] || 'application/octet-stream',
      };

      if (proxyResponse.headers['content-length']) {
        cleanHeaders['Content-Length'] = proxyResponse.headers['content-length'] as string;
      }
      if (proxyResponse.headers['content-range']) {
        cleanHeaders['Content-Range'] = proxyResponse.headers['content-range'] as string;
      }
      if (proxyResponse.headers['accept-ranges']) {
        cleanHeaders['Accept-Ranges'] = proxyResponse.headers['accept-ranges'] as string;
      }

      res.writeHead(statusCode, cleanHeaders);
      proxyResponse.pipe(res);
    }
  });

  proxyRequest.on('timeout', () => {
    proxyRequest.destroy();
  });

  proxyRequest.on('error', (err) => {
    console.error(`Stream proxy failed for URL ${urlStr}:`, err.message);
    if (!res.headersSent) {
      res.status(502).json({ error: 'IPTV Stream provider unreachable' });
    }
  });

  // Support client disconnects
  res.on('close', () => {
    proxyRequest.destroy();
  });

  proxyRequest.end();
}

app.get('/api/proxy-stream', (req, res) => {
  const rawUrl = req.query.url as string;
  if (!rawUrl) {
    return res.status(400).json({ error: 'Streaming URL is required as "url" query parameter' });
  }

  let decodedUrl: string;
  try {
    decodedUrl = decodeURIComponent(rawUrl);
    if (!decodedUrl.startsWith('http://') && !decodedUrl.startsWith('https://')) {
      return res.status(400).json({ error: 'Invalid stream URL protocol' });
    }
  } catch (err) {
    return res.status(400).json({ error: 'Malformed stream URL' });
  }

  console.log(`Proxying IPTV stream: ${decodedUrl}`);
  makeProxyRequest(decodedUrl, req.headers, res);
});


// ================= ADMIN MANAGEMENT ENDPOINTS =================

// GET /api/admin/analytics
app.get('/api/admin/analytics', authenticateUser, requireAdmin, (req, res) => {
  const users = DB.getUsers();
  const channels = DB.getChannels();
  const subscriptions = DB.getSubscriptions();
  const logins = DB.getLoginHistory();

  const totalUsers = users.length;
  const premiumUsers = users.filter(u => u.premiumStatus).length;
  const freeUsers = totalUsers - premiumUsers;
  const bannedUsers = users.filter(u => u.isBanned).length;

  const today = new Date().toDateString();
  const todayLogins = logins.filter(l => new Date(l.loginAt).toDateString() === today).length;

  const totalChannels = channels.length;
  const approvedSubs = subscriptions.filter(s => s.status === 'approved');
  const revenueSummary = approvedSubs.reduce((sum, s) => sum + s.amount, 0);

  // Expiring soon in next 3 days
  const soonLimit = Date.now() + (3 * 24 * 60 * 60 * 1000);
  const premiumExpiringSoon = users.filter(u => {
    if (!u.premiumStatus || !u.premiumExpiryDate) return false;
    const exp = new Date(u.premiumExpiryDate).getTime();
    return exp > Date.now() && exp < soonLimit;
  }).length;

  // Let's mock online users and active sessions based on logins in the last hour
  const hourAgo = Date.now() - (60 * 60 * 1000);
  const activeSessions = logins.filter(l => new Date(l.loginAt).getTime() > hourAgo).length || 1;
  const onlineUsers = activeSessions;

  res.json({
    totalUsers,
    premiumUsers,
    freeUsers,
    onlineUsers,
    todayLogins,
    totalChannels,
    premiumExpiringSoon,
    bannedUsers,
    revenueSummary,
    activeSessions
  });
});

// GET /api/admin/users
app.get('/api/admin/users', authenticateUser, requireAdmin, (req, res) => {
  const users = DB.getUsers();
  // Strip password hash for safety
  const safeUsers = users.map(({ passwordHash, ...u }) => u);
  res.json(safeUsers);
});

// PUT /api/admin/users/:id
app.put('/api/admin/users/:id', authenticateUser, requireAdmin, (req: any, res) => {
  const userId = req.params.id;
  const { role, isBanned, premiumStatus, premiumExpiryDate } = req.body;

  const users = DB.getUsers();
  const user = users.find(u => u.id === userId);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (user.username === 'admin' && req.user.id !== user.id) {
    return res.status(403).json({ error: 'Cannot modify primary administrator.' });
  }

  if (role !== undefined) user.role = role;
  if (isBanned !== undefined) user.isBanned = isBanned;
  if (premiumStatus !== undefined) {
    user.premiumStatus = premiumStatus;
    if (premiumStatus) {
      user.premiumStartDate = user.premiumStartDate || new Date().toISOString();
      user.premiumExpiryDate = premiumExpiryDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // Default 30 days
    } else {
      user.premiumStartDate = null;
      user.premiumExpiryDate = null;
    }
  } else if (premiumExpiryDate !== undefined) {
    user.premiumExpiryDate = premiumExpiryDate;
    if (premiumExpiryDate) {
      user.premiumStatus = new Date(premiumExpiryDate).getTime() > Date.now();
      user.premiumStartDate = user.premiumStartDate || new Date().toISOString();
    } else {
      user.premiumStatus = false;
      user.premiumStartDate = null;
    }
  }

  DB.saveUsers(users);

  // Send system notification
  const notifications = DB.getNotifications();
  notifications.push({
    id: crypto.randomUUID(),
    userId: user.id,
    title: 'Account Status Updated',
    message: `Admin has updated your profile settings. Premium Status: ${user.premiumStatus ? 'Active' : 'Inactive'}. Expiry: ${user.premiumExpiryDate ? new Date(user.premiumExpiryDate).toLocaleDateString() : 'N/A'}.`,
    type: 'success',
    isReadBy: [],
    createdAt: new Date().toISOString()
  });
  DB.saveNotifications(notifications);

  const { passwordHash, ...userResponse } = user;
  res.json({ message: 'User updated successfully', user: userResponse });
});

// DELETE /api/admin/users/:id
app.delete('/api/admin/users/:id', authenticateUser, requireAdmin, (req, res) => {
  const userId = req.params.id;
  const users = DB.getUsers();
  
  const user = users.find(u => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (user.username === 'admin') {
    return res.status(403).json({ error: 'Cannot delete primary admin.' });
  }

  const updatedUsers = users.filter(u => u.id !== userId);
  DB.saveUsers(updatedUsers);

  res.json({ message: 'User deleted successfully' });
});

// GET /api/admin/subscriptions
app.get('/api/admin/subscriptions', authenticateUser, requireAdmin, (req, res) => {
  const subscriptions = DB.getSubscriptions();
  res.json(subscriptions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
});

// PUT /api/admin/subscriptions/:id (Verify / approve subscription manual payments)
app.put('/api/admin/subscriptions/:id', authenticateUser, requireAdmin, (req, res) => {
  const requestId = req.params.id;
  const { status, notes } = req.body; // 'approved' or 'rejected'

  if (!status || (status !== 'approved' && status !== 'rejected')) {
    return res.status(400).json({ error: 'Status must be approved or rejected.' });
  }

  const subscriptions = DB.getSubscriptions();
  const subRequest = subscriptions.find(s => s.id === requestId);

  if (!subRequest) {
    return res.status(404).json({ error: 'Subscription request not found' });
  }

  if (subRequest.status !== 'pending') {
    return res.status(400).json({ error: 'This payment request was already resolved.' });
  }

  subRequest.status = status;
  subRequest.resolvedAt = new Date().toISOString();
  subRequest.notes = notes;

  DB.saveSubscriptions(subscriptions);

  // If approved, activate the user's premium package!
  if (status === 'approved') {
    const users = DB.getUsers();
    const user = users.find(u => u.id === subRequest.userId);

    if (user) {
      user.premiumStatus = true;
      user.premiumStartDate = new Date().toISOString();
      
      // Calculate new expiry date. If already premium, extend it! Otherwise start fresh.
      let currentExpiry = Date.now();
      if (user.premiumExpiryDate) {
        const parsedExp = new Date(user.premiumExpiryDate).getTime();
        if (parsedExp > Date.now()) {
          currentExpiry = parsedExp;
        }
      }

      const additionalMs = subRequest.durationDays * 24 * 60 * 60 * 1000;
      user.premiumExpiryDate = new Date(currentExpiry + additionalMs).toISOString();
      DB.saveUsers(users);

      // Notify user
      const notifications = DB.getNotifications();
      notifications.push({
        id: crypto.randomUUID(),
        userId: user.id,
        title: 'Premium Activated! 🎉',
        message: `Your bKash payment verification of ৳${subRequest.amount} succeeded. Premium activated for ${subRequest.durationDays} days. Expiry: ${new Date(user.premiumExpiryDate).toLocaleDateString()}`,
        type: 'success',
        isReadBy: [],
        createdAt: new Date().toISOString()
      });
      DB.saveNotifications(notifications);
    }
  } else {
    // Rejected subscription
    const notifications = DB.getNotifications();
    notifications.push({
      id: crypto.randomUUID(),
      userId: subRequest.userId,
      title: 'Payment Verification Failed ❌',
      message: `Your payment request of ৳${subRequest.amount} from number ${subRequest.senderNumber} was rejected. Note: ${notes || 'Reference details match failed.'}`,
      type: 'danger',
      isReadBy: [],
      createdAt: new Date().toISOString()
    });
    DB.saveNotifications(notifications);
  }

  res.json({ message: `Request successfully ${status}.`, request: subRequest });
});

// GET /api/admin/channels (Admin raw list including inactive ones)
app.get('/api/admin/channels', authenticateUser, requireAdmin, (req, res) => {
  const channels = DB.getChannels();
  res.json(channels.sort((a, b) => a.number - b.number));
});

// POST /api/admin/channels (Add manual custom channel)
app.post('/api/admin/channels', authenticateUser, requireAdmin, (req, res) => {
  const { name, url, logo, category, country, language, isPremium, isActive, isVisible, tags } = req.body;

  if (!name || !url) {
    return res.status(400).json({ error: 'Channel Name and Stream URL are required.' });
  }

  const channels = DB.getChannels();
  const nextNumber = channels.reduce((max, c) => c.number > max ? c.number : max, 0) + 1;

  let parsedTags: string[] = [];
  if (Array.isArray(tags)) {
    parsedTags = tags.map(t => String(t).trim()).filter(Boolean);
  } else if (typeof tags === 'string') {
    parsedTags = tags.split(',').map(t => t.trim()).filter(Boolean);
  }

  const newChannel: Channel = {
    id: crypto.randomUUID(),
    name,
    url,
    logo: logo || 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?w=100&h=100&fit=crop&q=80',
    category: category || 'Entertainment',
    country: country || 'Bangladesh',
    language: language || 'Bengali',
    number: nextNumber,
    isPremium: !!isPremium,
    isActive: isActive !== undefined ? !!isActive : true,
    isVisible: isVisible !== undefined ? !!isVisible : true,
    tags: parsedTags
  };

  channels.push(newChannel);
  DB.saveChannels(channels);

  res.status(201).json({ message: 'Channel added successfully', channel: newChannel });
});

// PUT /api/admin/channels/:id (Update custom channel)
app.put('/api/admin/channels/:id', authenticateUser, requireAdmin, (req, res) => {
  const channelId = req.params.id;
  const { name, url, logo, category, country, language, isPremium, isActive, isVisible, number, tags } = req.body;

  const channels = DB.getChannels();
  const channel = channels.find(c => c.id === channelId);

  if (!channel) {
    return res.status(404).json({ error: 'Channel not found' });
  }

  if (name !== undefined) channel.name = name;
  if (url !== undefined) channel.url = url;
  if (logo !== undefined) channel.logo = logo;
  if (category !== undefined) channel.category = category;
  if (country !== undefined) channel.country = country;
  if (language !== undefined) channel.language = language;
  if (isPremium !== undefined) channel.isPremium = isPremium;
  if (isActive !== undefined) channel.isActive = isActive;
  if (isVisible !== undefined) channel.isVisible = isVisible;
  if (number !== undefined) channel.number = Number(number);
  
  if (tags !== undefined) {
    let parsedTags: string[] = [];
    if (Array.isArray(tags)) {
      parsedTags = tags.map(t => String(t).trim()).filter(Boolean);
    } else if (typeof tags === 'string') {
      parsedTags = tags.split(',').map(t => t.trim()).filter(Boolean);
    }
    channel.tags = parsedTags;
  }

  DB.saveChannels(channels);
  res.json({ message: 'Channel updated successfully', channel });
});

// DELETE /api/admin/channels/:id
app.delete('/api/admin/channels/:id', authenticateUser, requireAdmin, (req, res) => {
  const channelId = req.params.id;
  const channels = DB.getChannels();

  const exists = channels.some(c => c.id === channelId);
  if (!exists) {
    return res.status(404).json({ error: 'Channel not found' });
  }

  const updated = channels.filter(c => c.id !== channelId);
  DB.saveChannels(updated);

  res.json({ message: 'Channel deleted successfully' });
});

// POST /api/admin/channels/refresh (Force refresh from Github Playlist URL)
app.post('/api/admin/channels/refresh', authenticateUser, requireAdmin, (req, res) => {
  const settings = DB.getSettings();
  DB.refreshChannelsFromPlaylist(settings.playlistUrl)
    .then((count) => {
      res.json({ message: `Successfully loaded and synced ${count} channels from GitHub!` });
    })
    .catch((err) => {
      res.status(500).json({ error: `Sync failed: ${err.message}` });
    });
});

// PUT /api/admin/settings (Update server settings)
app.put('/api/admin/settings', authenticateUser, requireAdmin, (req, res) => {
  const { 
    siteName, siteLogo, playlistUrl, paymentNumber, paymentMethod, 
    contactEmail, supportPhone, maintenanceMode, theme, announcementBanner,
    githubToken, githubRepo, githubBranch 
  } = req.body;

  const settings = DB.getSettings();

  if (siteName !== undefined) settings.siteName = siteName;
  if (siteLogo !== undefined) settings.siteLogo = siteLogo;
  if (playlistUrl !== undefined) settings.playlistUrl = playlistUrl;
  if (paymentNumber !== undefined) settings.paymentNumber = paymentNumber;
  if (paymentMethod !== undefined) settings.paymentMethod = paymentMethod;
  if (contactEmail !== undefined) settings.contactEmail = contactEmail;
  if (supportPhone !== undefined) settings.supportPhone = supportPhone;
  if (maintenanceMode !== undefined) settings.maintenanceMode = maintenanceMode;
  if (theme !== undefined) settings.theme = theme;
  if (announcementBanner !== undefined) settings.announcementBanner = announcementBanner;
  if (githubToken !== undefined) settings.githubToken = githubToken;
  if (githubRepo !== undefined) settings.githubRepo = githubRepo;
  if (githubBranch !== undefined) settings.githubBranch = githubBranch;

  DB.saveSettings(settings);

  // Broadcast system notification
  const notifications = DB.getNotifications();
  notifications.push({
    id: crypto.randomUUID(),
    userId: 'all',
    title: 'Platform Updated 📢',
    message: announcementBanner || 'Site settings have been updated by Administrator.',
    type: 'info',
    isReadBy: [],
    createdAt: new Date().toISOString()
  });
  DB.saveNotifications(notifications);

  res.json({ message: 'Settings updated successfully', settings });
});

// POST /api/admin/notifications (Send custom notification to all or a single user)
app.post('/api/admin/notifications', authenticateUser, requireAdmin, (req, res) => {
  const { targetUsername, title, message, type } = req.body;

  if (!title || !message) {
    return res.status(400).json({ error: 'Title and message are required' });
  }

  let targetUserId = 'all';
  if (targetUsername && targetUsername.trim() !== 'all' && targetUsername.trim() !== '') {
    const users = DB.getUsers();
    const foundUser = users.find(u => u.username.toLowerCase() === targetUsername.trim().toLowerCase());
    if (!foundUser) {
      return res.status(404).json({ error: `User with username "${targetUsername}" not found` });
    }
    targetUserId = foundUser.id;
  }

  const notifications = DB.getNotifications();
  const newNotif = {
    id: crypto.randomUUID(),
    userId: targetUserId,
    title,
    message,
    type: type || 'info',
    isReadBy: [],
    createdAt: new Date().toISOString()
  };
  notifications.push(newNotif);
  DB.saveNotifications(notifications);

  res.json({ message: 'Notification sent successfully!', notification: newNotif });
});

// GET /api/admin/backup (Export entire JSON database)
app.get('/api/admin/backup', authenticateUser, requireAdmin, (req, res) => {
  try {
    const backupData = {
      settings: DB.getSettings(),
      users: DB.getUsers(),
      channels: DB.getChannels(),
      subscriptions: DB.getSubscriptions(),
      watchHistory: DB.getWatchHistory(),
      loginHistory: DB.getLoginHistory(),
      favourites: DB.getFavourites(),
      notifications: DB.getNotifications()
    };
    res.json(backupData);
  } catch (err: any) {
    res.status(500).json({ error: `Backup failed: ${err.message}` });
  }
});

// POST /api/admin/restore (Restore entire JSON database)
app.post('/api/admin/restore', authenticateUser, requireAdmin, (req, res) => {
  const backupData = req.body;
  if (!backupData || typeof backupData !== 'object') {
    return res.status(400).json({ error: 'No backup data provided' });
  }

  try {
    if (backupData.settings) DB.saveSettings(backupData.settings);
    if (backupData.users) DB.saveUsers(backupData.users);
    if (backupData.channels) DB.saveChannels(backupData.channels);
    if (backupData.subscriptions) DB.saveSubscriptions(backupData.subscriptions);
    if (backupData.watchHistory) DB.saveWatchHistory(backupData.watchHistory);
    if (backupData.loginHistory) DB.saveLoginHistory(backupData.loginHistory);
    if (backupData.favourites) DB.saveFavourites(backupData.favourites);
    if (backupData.notifications) DB.saveNotifications(backupData.notifications);

    res.json({ message: 'Backup restored successfully! All tables reloaded.' });
  } catch (err: any) {
    res.status(500).json({ error: `Restore failed: ${err.message}` });
  }
});

// ================= VITE OR PRODUCTION BUILD MIDDLEWARE =================

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`StreamVault Server booted successfully and listening on http://localhost:${PORT}`);
  });
}

startServer();
