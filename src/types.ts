/**
 * StreamVault IPTV Platform
 * Shared TypeScript Types & Interface definitions
 */

export interface User {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  role: 'admin' | 'user';
  isBanned: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  lastLoginIp: string | null;
  lastLoginDevice: string | null;
  lastLoginBrowser: string | null;
  lastLoginOS: string | null;
  premiumStatus: boolean;
  premiumStartDate: string | null;
  premiumExpiryDate: string | null;
}

export interface Channel {
  id: string;
  name: string;
  logo: string;
  url: string;
  category: string;
  country: string;
  language: string;
  number: number;
  isPremium: boolean;
  isActive: boolean;
  isVisible: boolean;
  tags?: string[];
}

export interface SubscriptionRequest {
  id: string;
  userId: string;
  username: string;
  paymentMethod: string; // e.g. bKash
  senderNumber: string; // User's payment number
  amount: number;
  reference: string; // Reference (Username)
  status: 'pending' | 'approved' | 'rejected';
  durationDays: number;
  createdAt: string;
  resolvedAt: string | null;
  notes?: string;
}

export interface WatchHistoryEntry {
  id: string;
  userId: string;
  username: string;
  channelId: string;
  channelName: string;
  watchedAt: string;
  durationSeconds: number;
}

export interface LoginHistoryEntry {
  id: string;
  userId: string;
  username: string;
  ip: string;
  device: string;
  browser: string;
  os: string;
  loginAt: string;
}

export interface FavouriteEntry {
  userId: string;
  channelId: string;
}

export interface AppSettings {
  siteName: string;
  siteLogo: string;
  playlistUrl: string;
  paymentNumber: string;
  paymentMethod: string;
  contactEmail: string;
  maintenanceMode: boolean;
  theme: 'slate' | 'cosmic' | 'emerald' | 'amber';
  announcementBanner: string;
}

export interface SystemNotification {
  id: string;
  userId: string; // userId or 'all'
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'danger';
  isReadBy: string[]; // List of userIds who read it, or isRead flag for personal notification
  isRead?: boolean; // For personal notifications
  createdAt: string;
}

export interface AnalyticsSummary {
  totalUsers: number;
  premiumUsers: number;
  freeUsers: number;
  onlineUsers: number;
  todayLogins: number;
  totalChannels: number;
  premiumExpiringSoon: number;
  bannedUsers: number;
  revenueSummary: number;
  activeSessions: number;
}

export interface ActiveSession {
  userId: string;
  username: string;
  lastActive: string;
  currentChannelId?: string;
  currentChannelName?: string;
  ip: string;
  device: string;
}
