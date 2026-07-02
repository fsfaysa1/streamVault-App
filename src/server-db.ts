/**
 * StreamVault IPTV Platform
 * Server-side JSON File Database Engine
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import http from 'http';
import https from 'https';
import { 
  User, Channel, SubscriptionRequest, WatchHistoryEntry, 
  LoginHistoryEntry, FavouriteEntry, AppSettings, 
  SystemNotification, AnalyticsSummary, ActiveSession 
} from './types';

const DATA_DIR = path.join(process.cwd(), 'data');

// Ensure database files exist
const FILES = {
  settings: path.join(DATA_DIR, 'settings.json'),
  users: path.join(DATA_DIR, 'users.json'),
  channels: path.join(DATA_DIR, 'channels.json'),
  subscriptions: path.join(DATA_DIR, 'subscriptions.json'),
  watchHistory: path.join(DATA_DIR, 'watchHistory.json'),
  loginHistory: path.join(DATA_DIR, 'loginHistory.json'),
  favourites: path.join(DATA_DIR, 'favourites.json'),
  notifications: path.join(DATA_DIR, 'notifications.json'),
  analytics: path.join(DATA_DIR, 'analytics.json'),
};

export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password + 'streamvault_salt_123').digest('hex');
}

// Default settings
const DEFAULT_SETTINGS: AppSettings = {
  siteName: 'StreamVault',
  siteLogo: 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?w=80&h=80&fit=crop&q=80',
  playlistUrl: 'https://raw.githubusercontent.com/fsfaysa1/StreamVault/refs/heads/main/old.m3u',
  paymentNumber: '01736705156',
  paymentMethod: 'bKash',
  contactEmail: 'support@streamvault.com',
  supportPhone: '01736705156',
  maintenanceMode: false,
  theme: 'cosmic',
  announcementBanner: 'Welcome to StreamVault Premium IPTV! Send bKash to 01736705156 and use your username as reference, then submit verification request.',
  githubToken: '',
  githubRepo: '',
  githubBranch: 'main'
};

// Simple read helper
function readJson<T>(filePath: string, defaultValue: T): T {
  try {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2), 'utf8');
      return defaultValue;
    }
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data) as T;
  } catch (error) {
    console.error(`Error reading database file ${filePath}:`, error);
    return defaultValue;
  }
}

function httpsRequest(options: any, postData?: string): Promise<{ statusCode?: number, body: string }> {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => resolve({ statusCode: res.statusCode, body }));
    });
    req.on('error', (err) => reject(err));
    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function syncToGitHub(filePath: string): Promise<void> {
  try {
    const settings = DB.getSettings();
    if (!settings.githubToken || !settings.githubRepo) {
      return; // GitHub Sync not configured
    }

    const token = settings.githubToken.trim();
    const repo = settings.githubRepo.trim();
    if (!token || !repo) return;

    const branch = (settings.githubBranch || 'main').trim();
    const relPath = path.relative(process.cwd(), filePath).replace(/\\/g, '/');

    const fileContent = fs.readFileSync(filePath, 'utf8');
    const contentBase64 = Buffer.from(fileContent).toString('base64');

    // 1. Get current SHA if the file exists on GitHub
    const getOptions = {
      hostname: 'api.github.com',
      path: `/repos/${repo}/contents/${relPath}?ref=${branch}`,
      method: 'GET',
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'StreamVault-Sync-Engine'
      }
    };

    let sha: string | undefined;
    try {
      const getRes = await httpsRequest(getOptions);
      if (getRes.statusCode === 200) {
        const data = JSON.parse(getRes.body);
        sha = data.sha;
      }
    } catch (e) {
      // File probably doesn't exist yet, which is fine
    }

    // 2. Upload file
    const putBody = JSON.stringify({
      message: `auto-sync: update ${relPath} [skip ci]`,
      content: contentBase64,
      branch: branch,
      sha: sha
    });

    const putOptions = {
      hostname: 'api.github.com',
      path: `/repos/${repo}/contents/${relPath}`,
      method: 'PUT',
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'StreamVault-Sync-Engine',
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(putBody)
      }
    };

    const putRes = await httpsRequest(putOptions, putBody);
    if (putRes.statusCode === 200 || putRes.statusCode === 201) {
      console.log(`[GitHub Sync] Successfully pushed ${relPath} to GitHub!`);
    } else {
      console.error(`[GitHub Sync] Failed to push ${relPath} to GitHub (Status ${putRes.statusCode}):`, putRes.body);
    }
  } catch (error: any) {
    console.error(`[GitHub Sync] Error syncing ${filePath} to GitHub:`, error.message);
  }
}

// Simple write helper
function writeJson<T>(filePath: string, data: T): void {
  try {
    // Ensure directory exists
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    
    // Auto sync to GitHub in the background
    syncToGitHub(filePath).catch(err => {
      console.error('[GitHub Sync Background Error]:', err);
    });
  } catch (error) {
    console.error(`Error writing database file ${filePath}:`, error);
  }
}

export class DB {
  // Read operations
  static getSettings(): AppSettings {
    return readJson<AppSettings>(FILES.settings, DEFAULT_SETTINGS);
  }

  static saveSettings(settings: AppSettings): void {
    writeJson<AppSettings>(FILES.settings, settings);
  }

  static getUsers(): User[] {
    return readJson<User[]>(FILES.users, []);
  }

  static saveUsers(users: User[]): void {
    writeJson<User[]>(FILES.users, users);
  }

  static getChannels(): Channel[] {
    return readJson<Channel[]>(FILES.channels, []);
  }

  static saveChannels(channels: Channel[]): void {
    writeJson<Channel[]>(FILES.channels, channels);
  }

  static getSubscriptions(): SubscriptionRequest[] {
    return readJson<SubscriptionRequest[]>(FILES.subscriptions, []);
  }

  static saveSubscriptions(subscriptions: SubscriptionRequest[]): void {
    writeJson<SubscriptionRequest[]>(FILES.subscriptions, subscriptions);
  }

  static getWatchHistory(): WatchHistoryEntry[] {
    return readJson<WatchHistoryEntry[]>(FILES.watchHistory, []);
  }

  static saveWatchHistory(watchHistory: WatchHistoryEntry[]): void {
    writeJson<WatchHistoryEntry[]>(FILES.watchHistory, watchHistory);
  }

  static getLoginHistory(): LoginHistoryEntry[] {
    return readJson<LoginHistoryEntry[]>(FILES.loginHistory, []);
  }

  static saveLoginHistory(loginHistory: LoginHistoryEntry[]): void {
    writeJson<LoginHistoryEntry[]>(FILES.loginHistory, loginHistory);
  }

  static getFavourites(): FavouriteEntry[] {
    return readJson<FavouriteEntry[]>(FILES.favourites, []);
  }

  static saveFavourites(favourites: FavouriteEntry[]): void {
    writeJson<FavouriteEntry[]>(FILES.favourites, favourites);
  }

  static getNotifications(): SystemNotification[] {
    return readJson<SystemNotification[]>(FILES.notifications, []);
  }

  static saveNotifications(notifications: SystemNotification[]): void {
    writeJson<SystemNotification[]>(FILES.notifications, notifications);
  }

  // Initialize DB and Seed default admin
  static init(): void {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    // Load settings
    const settings = this.getSettings();

    // Ensure at least one admin exists
    const users = this.getUsers();
    const adminExists = users.some(u => u.role === 'admin');
    if (!adminExists) {
      const defaultAdmin: User = {
        id: crypto.randomUUID(),
        username: 'admin',
        email: 'admin@streamvault.com',
        passwordHash: hashPassword('admin'), // default password is 'admin'
        role: 'admin',
        isBanned: false,
        createdAt: new Date().toISOString(),
        lastLoginAt: null,
        lastLoginIp: null,
        lastLoginDevice: null,
        lastLoginBrowser: null,
        lastLoginOS: null,
        premiumStatus: true, // Admin is always premium
        premiumStartDate: new Date().toISOString(),
        premiumExpiryDate: '2030-01-01T00:00:00.000Z'
      };
      users.push(defaultAdmin);
      this.saveUsers(users);
      console.log('Seeded default admin user: admin / admin');
    }

    // Ensure standard collections are initialized
    this.getSubscriptions();
    this.getWatchHistory();
    this.getLoginHistory();
    this.getFavourites();
    this.getNotifications();

    // Fetch and Parse IPTV Playlist on startup if channels list is empty
    const channels = this.getChannels();
    if (channels.length === 0) {
      console.log('No channels found. Triggering auto-fetch from playlist URL...');
      this.refreshChannelsFromPlaylist(settings.playlistUrl).then(count => {
        console.log(`Successfully fetched and parsed ${count} initial channels!`);
      }).catch(err => {
        console.error('Failed to parse initial channels on startup:', err.message);
      });
    }
  }

  // M3U Playlist Parser
  static async refreshChannelsFromPlaylist(url: string): Promise<number> {
    return new Promise((resolve, reject) => {
      const fetchUrl = url || this.getSettings().playlistUrl;
      console.log(`Downloading playlist from URL: ${fetchUrl}`);

      const requester = fetchUrl.startsWith('https') ? https : http;
      requester.get(fetchUrl, (response) => {
        if (response.statusCode && (response.statusCode < 200 || response.statusCode >= 300)) {
          reject(new Error(`Failed to load playlist: HTTP ${response.statusCode}`));
          return;
        }

        let body = '';
        response.on('data', (chunk) => { body += chunk; });
        response.on('end', () => {
          try {
            const parsedChannels = this.parseM3UContent(body);
            if (parsedChannels.length > 0) {
              // Merge with existing customized settings if channels existed previously, 
              // or just save the fresh parsed channels
              const existingChannels = this.getChannels();
              const channelMap = new Map(existingChannels.map(c => [c.url, c]));

              const finalChannels: Channel[] = parsedChannels.map((newChan, index) => {
                const existing = channelMap.get(newChan.url);
                return {
                  id: existing?.id || crypto.randomUUID(),
                  name: newChan.name,
                  logo: newChan.logo || 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?w=100&h=100&fit=crop&q=80',
                  url: newChan.url,
                  category: newChan.category || 'Other',
                  country: existing?.country || newChan.country || 'International',
                  language: existing?.language || newChan.language || 'Bengali',
                  number: existing?.number || (index + 1),
                  isPremium: existing ? existing.isPremium : (index % 5 === 0), // Default some channels to premium for testing
                  isActive: existing ? existing.isActive : true,
                  isVisible: existing ? existing.isVisible : true,
                  tags: existing?.tags || []
                };
              });

              this.saveChannels(finalChannels);
              resolve(finalChannels.length);
            } else {
              resolve(0);
            }
          } catch (error: any) {
            reject(new Error(`Parsing error: ${error.message}`));
          }
        });
      }).on('error', (err) => {
        reject(err);
      });
    });
  }

  // Parse direct M3U content helper
  static parseM3UContent(content: string): Partial<Channel>[] {
    const lines = content.split('\n');
    const channels: Partial<Channel>[] = [];
    
    let currentInfo: {
      name?: string;
      logo?: string;
      category?: string;
      country?: string;
      language?: string;
    } | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      if (line.startsWith('#EXTM3U')) {
        continue;
      }

      if (line.startsWith('#EXTINF:')) {
        // Parse metadata
        // Example: #EXTINF:-1 tvg-id="id" tvg-name="Channel Name" tvg-logo="http://logo.png" group-title="Category",Channel Name
        const logoMatch = line.match(/tvg-logo="([^"]+)"/);
        const groupMatch = line.match(/group-title="([^"]+)"/);
        const countryMatch = line.match(/tvg-country="([^"]+)"/);
        const languageMatch = line.match(/tvg-language="([^"]+)"/);
        
        // Extract channel name which is after the last comma on the line
        const commaIndex = line.lastIndexOf(',');
        let name = 'Unknown Channel';
        if (commaIndex !== -1) {
          name = line.substring(commaIndex + 1).trim();
        }

        currentInfo = {
          name,
          logo: logoMatch ? logoMatch[1] : '',
          category: groupMatch ? groupMatch[1] : 'Entertainment',
          country: countryMatch ? countryMatch[1] : 'International',
          language: languageMatch ? languageMatch[1] : 'Bengali'
        };
      } else if (!line.startsWith('#') && currentInfo) {
        // This is the URL line for the channel info parsed on previous lines
        channels.push({
          name: currentInfo.name,
          logo: currentInfo.logo,
          url: line,
          category: currentInfo.category,
          country: currentInfo.country,
          language: currentInfo.language
        });
        currentInfo = null;
      }
    }

    return channels;
  }
}
