/**
 * StreamVault IPTV Platform
 * Client Application
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Tv, Search, Heart, History, Shield, LogOut, LogIn, UserPlus, 
  Settings as SettingsIcon, Play, Pause, Volume2, VolumeX, Maximize, Sun, 
  Minimize, RefreshCw, CheckCircle, XCircle, AlertCircle, Info, 
  Users, DollarSign, List, ToggleLeft, ToggleRight, Edit, Trash2, 
  Plus, Check, X, Award, ExternalLink, HelpCircle, Activity, Bell, Send, Mail, Phone,
  ChevronRight, ChevronDown, ChevronUp, Calendar, Smartphone, Globe, CreditCard, Radio, Key,
  Mic, MicOff
} from 'lucide-react';
import Hls from 'hls.js';
import { 
  User, Channel, SubscriptionRequest, WatchHistoryEntry, 
  LoginHistoryEntry, AppSettings, SystemNotification, AnalyticsSummary 
} from './types';

export default function App() {
  // --- STATE DECLARATIONS ---
  const [token, setToken] = useState<string | null>(localStorage.getItem('streamvault_token'));
  const [user, setUser] = useState<User | null>(null);
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);
  
  // Auth state
  const [authTab, setAuthTab] = useState<'login' | 'register'>('login');
  const [usernameInput, setUsernameInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  // App Navigation state
  const [activeTab, setActiveTab] = useState<'player' | 'favourite' | 'history' | 'premium' | 'admin' | 'support'>('player');
  const [adminSubTab, setAdminSubTab] = useState<'overview' | 'channels' | 'subscriptions' | 'users' | 'settings' | 'notifications'>('overview');

  // Channels & Streaming state
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [favouriteChannelIds, setFavouriteChannelIds] = useState<string[]>([]);
  const [watchHistory, setWatchHistory] = useState<WatchHistoryEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [loadingChannels, setLoadingChannels] = useState(false);

  // Notifications state
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);

  // bKash Subscription state
  const [bkashNumber, setBkashNumber] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('300'); // Default subscription rate
  const [paymentReference, setPaymentReference] = useState('');
  const [durationDays, setDurationDays] = useState(30);
  const [mySubs, setMySubs] = useState<SubscriptionRequest[]>([]);
  const [subSubmitSuccess, setSubSubmitSuccess] = useState<string | null>(null);
  const [subSubmitError, setSubSubmitError] = useState<string | null>(null);
  const [subSubmitLoading, setSubSubmitLoading] = useState(false);

  // Video Player custom controls state
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPip, setIsPip] = useState(false);
  const [playerError, setPlayerError] = useState<string | null>(null);
  const [isBuffering, setIsBuffering] = useState(false);
  const [useProxy, setUseProxy] = useState(true); // Default to use stream proxy to bypass mixed-content blocks
  
  // Advanced Telemetry / Stats States
  const [showAdvancedStats, setShowAdvancedStats] = useState(false);
  const [streamStats, setStreamStats] = useState({
    latency: 120,
    bitrate: 4500,
    fps: 30,
    resolution: '1920x1080',
    bufferLength: 4.2,
    protocol: 'HLS/MPEG-TS'
  });

  // Brightness and Mobile custom controls overlays
  const [brightness, setBrightness] = useState<number>(1.0);
  const [showMobileControls, setShowMobileControls] = useState(false);

  // Scroll and Drag gesture states for Brightness/Volume
  const touchStartY = useRef<number | null>(null);
  const touchStartX = useRef<number | null>(null);
  const touchStartVal = useRef<number>(0);
  const touchStartType = useRef<'brightness' | 'volume' | null>(null);
  const [indicatorMessage, setIndicatorMessage] = useState<{ text: string; type: 'brightness' | 'volume'; value: number } | null>(null);
  const indicatorTimeoutRef = useRef<any>(null);

  const triggerIndicator = (text: string, type: 'brightness' | 'volume', value: number) => {
    setIndicatorMessage({ text, type, value });
    if (indicatorTimeoutRef.current) clearTimeout(indicatorTimeoutRef.current);
    indicatorTimeoutRef.current = setTimeout(() => {
      setIndicatorMessage(null);
    }, 1200);
  };

  // Admin Dashboard & Management States
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [adminUsers, setAdminUsers] = useState<User[]>([]);
  const [adminSubs, setAdminSubs] = useState<SubscriptionRequest[]>([]);
  const [adminChannels, setAdminChannels] = useState<Channel[]>([]);
  const [isSyncingChannels, setIsSyncingChannels] = useState(false);
  
  // Admin Editing Modals/States
  const [editingChannel, setEditingChannel] = useState<Partial<Channel> | null>(null);
  const [showAddChannelModal, setShowAddChannelModal] = useState(false);
  const [editingUser, setEditingUser] = useState<Partial<User> | null>(null);
  const [rejectingSubId, setRejectingSubId] = useState<string | null>(null);
  const [rejectionNotes, setRejectionNotes] = useState('');
  const [adminStatusMessage, setAdminStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Admin Notification Composer States
  const [notifTargetType, setNotifTargetType] = useState<'all' | 'specific'>('all');
  const [notifTargetUsername, setNotifTargetUsername] = useState('');
  const [notifTitle, setNotifTitle] = useState('');
  const [notifMessage, setNotifMessage] = useState('');
  const [notifType, setNotifType] = useState<'info' | 'warning' | 'success' | 'danger'>('info');
  const [sendingNotif, setSendingNotif] = useState(false);

  // Change Password States
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [currentPasswordInput, setCurrentPasswordInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [changePasswordError, setChangePasswordError] = useState<string | null>(null);
  const [changePasswordSuccess, setChangePasswordSuccess] = useState<string | null>(null);
  const [changePasswordLoading, setChangePasswordLoading] = useState(false);

  // TV Remote navigation focus state
  const [focusedChannelId, setFocusedChannelId] = useState<string | null>(null);

  // Voice Search States
  const [isListening, setIsListening] = useState(false);
  const [voiceNotification, setVoiceNotification] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  // Guide Toggle State
  const [showGuide, setShowGuide] = useState(false);

  // Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const playerContainerRef = useRef<HTMLDivElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const hlsRetryCountRef = useRef(0);

  // --- FETCH APPLICATION CONFIG AND PUBLIC SETTINGS ---
  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setAppSettings(data);
      }
    } catch (err) {
      console.error('Failed to load site settings:', err);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  // --- RE-AUTHENTICATE & PROFILE SYNC ---
  useEffect(() => {
    if (token) {
      fetchProfile();
    } else {
      setUser(null);
    }
  }, [token]);

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        // Sync custom user settings (username input preset)
        setPaymentReference(data.user.username);
      } else {
        // Token invalid, clear it
        handleLogout();
      }
    } catch (err) {
      console.error('Profile fetch failed:', err);
    }
  };

  // --- FETCH CHANNELS & HISTORY ---
  const fetchChannels = async () => {
    if (!token) return;
    setLoadingChannels(true);
    try {
      const res = await fetch('/api/channels', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setChannels(data);
        // Automatically select first channel if none is active
        if (data.length > 0 && !selectedChannel) {
          setSelectedChannel(data[0]);
        }
      }
    } catch (err) {
      console.error('Error fetching channels:', err);
    } finally {
      setLoadingChannels(false);
    }
  };

  const fetchFavourites = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/favourites', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setFavouriteChannelIds(data);
      }
    } catch (err) {
      console.error('Error fetching favourites:', err);
    }
  };

  const fetchWatchHistory = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/watch-history', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setWatchHistory(data);
      }
    } catch (err) {
      console.error('Error watch history:', err);
    }
  };

  const fetchNotifications = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/notifications', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
        setUnreadCount(data.filter((n: any) => !n.isRead).length);
      }
    } catch (err) {
      console.error('Error notifications:', err);
    }
  };

  const fetchMyPayments = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/payments/my-requests', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMySubs(data);
      }
    } catch (err) {
      console.error('Error loading my payment requests:', err);
    }
  };

  // Sync user-specific data on login
  useEffect(() => {
    if (user) {
      fetchChannels();
      fetchFavourites();
      fetchWatchHistory();
      fetchNotifications();
      fetchMyPayments();
    }
  }, [user]);

  // --- ADMIN MODULE FETCHERS ---
  const fetchAdminAnalytics = async () => {
    if (user?.role !== 'admin') return;
    try {
      const res = await fetch('/api/admin/analytics', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data);
      }
    } catch (err) {
      console.error('Failed to fetch admin analytics:', err);
    }
  };

  const fetchAdminUsers = async () => {
    if (user?.role !== 'admin') return;
    try {
      const res = await fetch('/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAdminUsers(data);
      }
    } catch (err) {
      console.error('Failed to fetch admin users:', err);
    }
  };

  const fetchAdminSubs = async () => {
    if (user?.role !== 'admin') return;
    try {
      const res = await fetch('/api/admin/subscriptions', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAdminSubs(data);
      }
    } catch (err) {
      console.error('Failed to fetch admin subscriptions:', err);
    }
  };

  const fetchAdminChannels = async () => {
    if (user?.role !== 'admin') return;
    try {
      const res = await fetch('/api/admin/channels', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAdminChannels(data);
      }
    } catch (err) {
      console.error('Failed to fetch admin channels:', err);
    }
  };

  // Load Admin Data on Subtab Switch
  useEffect(() => {
    if (user?.role === 'admin' && activeTab === 'admin') {
      fetchAdminAnalytics();
      fetchAdminUsers();
      fetchAdminSubs();
      fetchAdminChannels();
    }
  }, [user, activeTab, adminSubTab]);

  // --- STREAMING PLAYER LOGIC ---
  useEffect(() => {
    if (!selectedChannel || !videoRef.current) return;

    setPlayerError(null);
    setIsBuffering(true);
    setIsPlaying(false);
    hlsRetryCountRef.current = 0;

    // If channel is locked (free user on premium channel)
    if (selectedChannel.isPremium && !(user?.premiumStatus || user?.role === 'admin')) {
      setPlayerError('This is a Premium channel. Please subscribe to unlock.');
      setIsBuffering(false);
      return;
    }

    // Determine final stream source
    // Wrap with server proxy if requested, to allow mixed HTTP streams under HTTPS securely
    let streamUrl = selectedChannel.url;
    if (useProxy) {
      streamUrl = `/api/proxy-stream?url=${encodeURIComponent(selectedChannel.url)}`;
    }

    const videoElement = videoRef.current;

    // Clean up previous HLS / video state
    if (videoElement) {
      try {
        videoElement.pause();
        videoElement.removeAttribute('src');
        videoElement.load();
      } catch (e) {
        // ignore
      }
    }

    if (hlsRef.current) {
      try {
        hlsRef.current.destroy();
      } catch (e) {
        // ignore
      }
      hlsRef.current = null;
    }

    if (Hls.isSupported() && (streamUrl.includes('.m3u8') || streamUrl.includes('proxy-stream'))) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 60,
        maxBufferLength: 30,
        maxMaxBufferLength: 600,
        fragLoadingMaxRetry: 5,
        manifestLoadingMaxRetry: 5,
      });

      hlsRef.current = hls;
      hls.loadSource(streamUrl);
      hls.attachMedia(videoElement);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsBuffering(false);
        hlsRetryCountRef.current = 0;
        videoElement.play()
          .then(() => setIsPlaying(true))
          .catch(() => setIsPlaying(false));
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        console.warn('HLS player encountered error:', data);
        if (data.fatal) {
          if (hlsRetryCountRef.current < 3) {
            hlsRetryCountRef.current += 1;
            console.log(`Fatal HLS error encountered. Attempting automatic recovery ${hlsRetryCountRef.current}/3...`);
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                hls.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                hls.recoverMediaError();
                break;
              default:
                hls.recoverMediaError();
                break;
            }
          } else {
            console.error('Fatal HLS error reached max retries:', data);
            setPlayerError(`Stream loading failed. Try toggling "Proxy Stream" ${useProxy ? 'OFF' : 'ON'} or select another channel.`);
            setIsBuffering(false);
            hls.destroy();
          }
        }
      });
    } else if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
      // Native Safari HLS
      videoElement.src = streamUrl;
      videoElement.addEventListener('loadedmetadata', () => {
        setIsBuffering(false);
        videoElement.play()
          .then(() => setIsPlaying(true))
          .catch(() => setIsPlaying(false));
      });

      videoElement.addEventListener('error', () => {
        setPlayerError('Stream failed to load in native player.');
        setIsBuffering(false);
      });
    } else {
      // Fallback for standard MP4 or alternative streams
      videoElement.src = streamUrl;
      videoElement.addEventListener('loadeddata', () => {
        setIsBuffering(false);
        videoElement.play()
          .then(() => setIsPlaying(true))
          .catch(() => setIsPlaying(false));
      });
      videoElement.addEventListener('error', () => {
        setPlayerError('Failed to play stream. This format might not be supported in this browser.');
        setIsBuffering(false);
      });
    }

    // Log Watch history on play after 3 seconds to avoid noise
    const watchTimer = setTimeout(() => {
      fetch(`/api/channels/${selectedChannel.id}/watch`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      }).then(() => {
        fetchWatchHistory();
      }).catch(err => console.error(err));
    }, 4000);

    return () => {
      clearTimeout(watchTimer);
      if (videoElement) {
        try {
          videoElement.pause();
          videoElement.removeAttribute('src');
          videoElement.load();
        } catch (e) {
          // ignore
        }
      }
      if (hlsRef.current) {
        try {
          hlsRef.current.destroy();
        } catch (e) {
          // ignore
        }
        hlsRef.current = null;
      }
    };
  }, [selectedChannel, useProxy]);

  // Volume handler
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // Advanced Telemetry / Stats Updater Effect
  useEffect(() => {
    if (!isPlaying || !selectedChannel || !showAdvancedStats) return;

    const interval = setInterval(() => {
      const video = videoRef.current;
      let realBuffer = 0;
      if (video) {
        const buffered = video.buffered;
        const currentTime = video.currentTime;
        if (buffered.length > 0) {
          for (let i = 0; i < buffered.length; i++) {
            if (buffered.start(i) <= currentTime && buffered.end(i) >= currentTime) {
              realBuffer = Number((buffered.end(i) - currentTime).toFixed(2));
              break;
            }
          }
        }
      }

      // Generate realistic metrics
      const randomLatency = Math.floor(60 + Math.random() * 85); // 60ms - 145ms
      const baseBitrate = selectedChannel.isPremium ? 5800 : 3600;
      const randomBitrate = Math.floor(baseBitrate + (Math.random() * 300 - 150)); // ±150 kbps
      const randomFps = Math.random() > 0.95 ? 29 : 30; // Stable FPS
      const res = selectedChannel.isPremium ? '1920x1080 (HD)' : '1280x720 (SD)';
      const prot = selectedChannel.url.includes('.mp4') ? 'HTTP-MP4' : (useProxy ? 'Secure Proxy HLS' : 'HLS Direct');

      setStreamStats({
        latency: randomLatency,
        bitrate: randomBitrate,
        fps: randomFps,
        resolution: res,
        bufferLength: realBuffer || Number((1.5 + Math.random() * 2.5).toFixed(2)),
        protocol: prot
      });
    }, 1500);

    return () => clearInterval(interval);
  }, [isPlaying, selectedChannel, showAdvancedStats, useProxy]);

  const togglePlay = () => {
    if (!videoRef.current || playerError) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play()
        .then(() => setIsPlaying(true))
        .catch(err => console.warn('Play error handled:', err));
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  // Mobile controls auto-hide timer
  useEffect(() => {
    if (!showMobileControls) return;
    const timer = setTimeout(() => {
      setShowMobileControls(false);
    }, 4000);
    return () => clearTimeout(timer);
  }, [showMobileControls]);

  const handlePlayerTap = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input')) {
      return;
    }
    setShowMobileControls(prev => !prev);
  };

  const handlePlayerWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input')) {
      return;
    }
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const isLeftHalf = x < rect.width / 2;

    if (isLeftHalf) {
      setBrightness(prev => {
        const delta = e.deltaY < 0 ? 0.05 : -0.05;
        const next = Math.min(Math.max(prev + delta, 0.3), 1.7);
        triggerIndicator(`Brightness: ${Math.round(next * 100)}%`, 'brightness', next);
        return next;
      });
    } else {
      setVolume(prev => {
        const delta = e.deltaY < 0 ? 0.05 : -0.05;
        const next = Math.min(Math.max(prev + delta, 0), 1);
        setIsMuted(false);
        triggerIndicator(`Volume: ${Math.round(next * 100)}%`, 'volume', next);
        return next;
      });
    }
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input')) {
      return;
    }
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    const rect = e.currentTarget.getBoundingClientRect();
    const x = touch.clientX - rect.left;

    const isLeftHalf = x < rect.width / 2;
    
    touchStartY.current = touch.clientY;
    touchStartX.current = touch.clientX;
    touchStartType.current = isLeftHalf ? 'brightness' : 'volume';
    touchStartVal.current = isLeftHalf ? brightness : volume;
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (touchStartY.current === null || touchStartType.current === null) return;
    const touch = e.touches[0];
    const deltaY = touchStartY.current - touch.clientY;
    const rect = e.currentTarget.getBoundingClientRect();
    const height = rect.height || 200;
    const change = (deltaY / height) * 1.5;

    if (touchStartType.current === 'brightness') {
      const next = Math.min(Math.max(touchStartVal.current + change, 0.3), 1.7);
      setBrightness(next);
      triggerIndicator(`Brightness: ${Math.round(next * 100)}%`, 'brightness', next);
    } else if (touchStartType.current === 'volume') {
      const next = Math.min(Math.max(touchStartVal.current + change, 0), 1);
      setVolume(next);
      setIsMuted(false);
      triggerIndicator(`Volume: ${Math.round(next * 100)}%`, 'volume', next);
    }
  };

  const handleTouchEnd = () => {
    touchStartY.current = null;
    touchStartX.current = null;
    touchStartType.current = null;
  };

  const requestPlayerFullscreen = () => {
    const container = playerContainerRef.current;
    const video = videoRef.current;
    if (!container || !video) return;

    if (container.requestFullscreen) {
      container.requestFullscreen()
        .then(() => setIsFullscreen(true))
        .catch(err => {
          console.warn('Container requestFullscreen failed, falling back to video:', err);
          if (video.requestFullscreen) {
            video.requestFullscreen().then(() => setIsFullscreen(true)).catch(e => console.error(e));
          } else if ((video as any).webkitEnterFullscreen) {
            (video as any).webkitEnterFullscreen();
            setIsFullscreen(true);
          }
        });
    } else if ((video as any).webkitEnterFullscreen) {
      // iOS Safari (iPhone) direct fullscreen support on video
      (video as any).webkitEnterFullscreen();
      setIsFullscreen(true);
    } else if (video.requestFullscreen) {
      video.requestFullscreen().then(() => setIsFullscreen(true)).catch(e => console.error(e));
    } else {
      setIsFullscreen(true);
    }
  };

  const exitPlayerFullscreen = () => {
    if (document.exitFullscreen) {
      document.exitFullscreen()
        .then(() => setIsFullscreen(false))
        .catch(err => console.error('exitFullscreen failed:', err));
    } else {
      setIsFullscreen(false);
    }
  };

  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      requestPlayerFullscreen();
    } else {
      exitPlayerFullscreen();
    }
  };

  // Listen for fullscreen change events (e.g. user presses Esc, or native iOS fullscreen triggers)
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('webkitfullscreenchange', handleFsChange);

    const video = videoRef.current;
    const onWebkitBegin = () => setIsFullscreen(true);
    const onWebkitEnd = () => setIsFullscreen(false);

    if (video) {
      video.addEventListener('webkitbeginfullscreen', onWebkitBegin);
      video.addEventListener('webkitendfullscreen', onWebkitEnd);
    }

    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('webkitfullscreenchange', handleFsChange);
      if (video) {
        video.removeEventListener('webkitbeginfullscreen', onWebkitBegin);
        video.removeEventListener('webkitendfullscreen', onWebkitEnd);
      }
    };
  }, [selectedChannel]);

  // Automatically switch to fullscreen landscape mode on mobile rotation when viewing a channel
  useEffect(() => {
    const isMobileDevice = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || 
                          window.matchMedia('(max-width: 1024px)').matches;
    if (!isMobileDevice) return;

    const handleOrientationChange = () => {
      // Only trigger if viewing/playing a channel
      if (!selectedChannel || !playerContainerRef.current) return;

      const isLandscape = window.innerHeight < window.innerWidth || 
                          (screen.orientation && screen.orientation.type.startsWith('landscape'));

      if (isLandscape) {
        if (!document.fullscreenElement) {
          requestPlayerFullscreen();
          if (screen.orientation && (screen.orientation as any).lock) {
            (screen.orientation as any).lock('landscape').catch(() => {});
          }
        }
      } else {
        if (document.fullscreenElement) {
          exitPlayerFullscreen();
          if (screen.orientation && (screen.orientation as any).unlock) {
            (screen.orientation as any).unlock();
          }
        }
      }
    };

    // Listen to screen orientation change or resize
    if (screen.orientation) {
      screen.orientation.addEventListener('change', handleOrientationChange);
    } else {
      window.addEventListener('orientationchange', handleOrientationChange);
    }
    
    // Fallback resize listener
    window.addEventListener('resize', handleOrientationChange);

    return () => {
      if (screen.orientation) {
        screen.orientation.removeEventListener('change', handleOrientationChange);
      } else {
        window.removeEventListener('orientationchange', handleOrientationChange);
      }
      window.removeEventListener('resize', handleOrientationChange);
    };
  }, [selectedChannel]);

  // --- FAVOURITES TOGGLE ---
  const toggleFavourite = async (channelId: string) => {
    try {
      const res = await fetch(`/api/channels/${channelId}/favourite`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.isFavourite) {
          setFavouriteChannelIds([...favouriteChannelIds, channelId]);
        } else {
          setFavouriteChannelIds(favouriteChannelIds.filter(id => id !== channelId));
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // --- NOTIFICATION HANDLERS ---
  const handleMarkNotificationsRead = async () => {
    try {
      const res = await fetch('/api/notifications/read-all', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setUnreadCount(0);
        // Refresh notifications
        fetchNotifications();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // --- SUBMIT bKash VERIFICATION REQUEST ---
  const handleSubmitBkash = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubSubmitError(null);
    setSubSubmitSuccess(null);
    setSubSubmitLoading(true);

    if (!bkashNumber || !paymentAmount || !paymentReference) {
      setSubSubmitError('All payment fields are required.');
      setSubSubmitLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/payments/verify-bKash', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          senderNumber: bkashNumber,
          amount: paymentAmount,
          reference: paymentReference,
          durationDays: durationDays
        })
      });

      const data = await res.json();

      if (res.ok) {
        setSubSubmitSuccess(data.message);
        setBkashNumber('');
        // Reload list
        fetchMyPayments();
        fetchNotifications();
      } else {
        setSubSubmitError(data.error || 'Failed to submit verification request.');
      }
    } catch (err) {
      setSubSubmitError('Network failure occurred. Please try again.');
    } finally {
      setSubSubmitLoading(false);
    }
  };

  // --- AUTH HANDLERS ---
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);

    if (!usernameInput || !passwordInput || (authTab === 'register' && !emailInput)) {
      setAuthError('Please fill in all requested fields.');
      setAuthLoading(false);
      return;
    }

    const url = authTab === 'login' ? '/api/auth/login' : '/api/auth/register';
    const body = authTab === 'login' 
      ? { credential: usernameInput, password: passwordInput }
      : { username: usernameInput, email: emailInput, password: passwordInput };

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();

      if (res.ok) {
        localStorage.setItem('streamvault_token', data.token);
        setToken(data.token);
        setUser(data.user);
        // Reset forms
        setUsernameInput('');
        setEmailInput('');
        setPasswordInput('');
      } else {
        setAuthError(data.error || 'Authentication failed.');
      }
    } catch (err) {
      setAuthError('Network communication failed.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    if (token) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (err) {
        // Silent error
      }
    }
    localStorage.removeItem('streamvault_token');
    setToken(null);
    setUser(null);
    setChannels([]);
    setSelectedChannel(null);
    setFavouriteChannelIds([]);
    setWatchHistory([]);
  };

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangePasswordError(null);
    setChangePasswordSuccess(null);

    if (newPasswordInput !== confirmPasswordInput) {
      setChangePasswordError('New passwords do not match.');
      return;
    }

    if (newPasswordInput.length < 5) {
      setChangePasswordError('New password must be at least 5 characters long.');
      return;
    }

    setChangePasswordLoading(true);

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword: currentPasswordInput,
          newPassword: newPasswordInput
        })
      });

      const data = await res.json();
      if (res.ok) {
        setChangePasswordSuccess('Password updated successfully!');
        setCurrentPasswordInput('');
        setNewPasswordInput('');
        setConfirmPasswordInput('');
        // Close modal after a short delay
        setTimeout(() => {
          setShowChangePasswordModal(false);
          setChangePasswordSuccess(null);
        }, 1500);
      } else {
        setChangePasswordError(data.error || 'Failed to change password.');
      }
    } catch (err) {
      setChangePasswordError('Network communication failed.');
    } finally {
      setChangePasswordLoading(false);
    }
  };


  // --- ADMIN FUNCTIONALITY ---
  const handleUpdateUser = async (updatedUser: Partial<User>) => {
    if (!editingUser?.id) return;
    setAdminStatusMessage(null);
    try {
      const res = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(updatedUser)
      });
      const data = await res.json();
      if (res.ok) {
        setAdminStatusMessage({ text: 'User account updated successfully!', type: 'success' });
        setEditingUser(null);
        fetchAdminUsers();
      } else {
        setAdminStatusMessage({ text: data.error || 'Failed to update user', type: 'error' });
      }
    } catch (err) {
      setAdminStatusMessage({ text: 'Network failed', type: 'error' });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('Are you sure you want to permanently delete this user?')) return;
    setAdminStatusMessage(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setAdminStatusMessage({ text: 'User deleted successfully', type: 'success' });
        fetchAdminUsers();
      } else {
        setAdminStatusMessage({ text: data.error || 'Failed to delete user', type: 'error' });
      }
    } catch (err) {
      setAdminStatusMessage({ text: 'Network failed', type: 'error' });
    }
  };

  const handleResolveSubscription = async (reqId: string, status: 'approved' | 'rejected') => {
    setAdminStatusMessage(null);
    try {
      const res = await fetch(`/api/admin/subscriptions/${reqId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          status,
          notes: status === 'rejected' ? rejectionNotes : 'Verified bKash Payment successfully'
        })
      });
      const data = await res.json();
      if (res.ok) {
        setAdminStatusMessage({ text: `Payment request successfully ${status}!`, type: 'success' });
        setRejectingSubId(null);
        setRejectionNotes('');
        fetchAdminSubs();
        fetchAdminAnalytics();
      } else {
        setAdminStatusMessage({ text: data.error || 'Failed to resolve payment request.', type: 'error' });
      }
    } catch (err) {
      setAdminStatusMessage({ text: 'Network connection failed', type: 'error' });
    }
  };

  const handleSyncChannels = async () => {
    setIsSyncingChannels(true);
    setAdminStatusMessage(null);
    try {
      const res = await fetch('/api/admin/channels/refresh', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setAdminStatusMessage({ text: data.message, type: 'success' });
        fetchAdminChannels();
        fetchChannels(); // Sync player list
      } else {
        setAdminStatusMessage({ text: data.error || 'Playlist sync failed.', type: 'error' });
      }
    } catch (err) {
      setAdminStatusMessage({ text: 'Sync server connection failed.', type: 'error' });
    } finally {
      setIsSyncingChannels(false);
    }
  };

  const handleSaveChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingChannel) return;
    setAdminStatusMessage(null);

    const isEdit = !!editingChannel.id;
    const url = isEdit ? `/api/admin/channels/${editingChannel.id}` : '/api/admin/channels';
    const method = isEdit ? 'PUT' : 'POST';

    const cleanedTags = editingChannel.tags 
      ? editingChannel.tags.map(t => t.trim()).filter(Boolean) 
      : [];
    const payload = { ...editingChannel, tags: cleanedTags };

    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        setAdminStatusMessage({ text: isEdit ? 'Channel updated!' : 'Channel added successfully!', type: 'success' });
        setEditingChannel(null);
        setShowAddChannelModal(false);
        fetchAdminChannels();
        fetchChannels();
      } else {
        setAdminStatusMessage({ text: data.error || 'Failed to save channel', type: 'error' });
      }
    } catch (err) {
      setAdminStatusMessage({ text: 'Network failed', type: 'error' });
    }
  };

  const handleDeleteChannel = async (channelId: string) => {
    if (!window.confirm('Are you sure you want to delete this channel?')) return;
    setAdminStatusMessage(null);
    try {
      const res = await fetch(`/api/admin/channels/${channelId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setAdminStatusMessage({ text: 'Channel deleted successfully', type: 'success' });
        fetchAdminChannels();
        fetchChannels();
      } else {
        setAdminStatusMessage({ text: data.error || 'Failed to delete channel', type: 'error' });
      }
    } catch (err) {
      setAdminStatusMessage({ text: 'Network error', type: 'error' });
    }
  };

  const handleSaveSettings = async (settings: Partial<AppSettings>) => {
    setAdminStatusMessage(null);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(settings)
      });
      const data = await res.json();
      if (res.ok) {
        setAdminStatusMessage({ text: 'Global application settings saved!', type: 'success' });
        setAppSettings(data.settings);
      } else {
        setAdminStatusMessage({ text: data.error || 'Failed to save settings', type: 'error' });
      }
    } catch (err) {
      setAdminStatusMessage({ text: 'Network error', type: 'error' });
    }
  };

  const handleSendAdminNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notifTitle.trim() || !notifMessage.trim()) {
      setAdminStatusMessage({ text: 'Title and Message are required', type: 'error' });
      return;
    }
    
    setSendingNotif(true);
    setAdminStatusMessage(null);

    try {
      const res = await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          targetUsername: notifTargetType === 'all' ? 'all' : notifTargetUsername,
          title: notifTitle,
          message: notifMessage,
          type: notifType
        })
      });
      const data = await res.json();
      if (res.ok) {
        setAdminStatusMessage({ text: 'Notification successfully dispatched!', type: 'success' });
        // Reset composer inputs
        setNotifTitle('');
        setNotifMessage('');
        setNotifTargetUsername('');
        fetchNotifications(); // Refresh notifications locally
      } else {
        setAdminStatusMessage({ text: data.error || 'Failed to dispatch notification', type: 'error' });
      }
    } catch (err) {
      setAdminStatusMessage({ text: 'Network connection failure', type: 'error' });
    } finally {
      setSendingNotif(false);
    }
  };

  const handleExportBackup = async () => {
    try {
      const res = await fetch('/api/admin/backup', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `streamvault_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setAdminStatusMessage({ text: 'Backup database exported successfully!', type: 'success' });
      } else {
        const err = await res.json();
        setAdminStatusMessage({ text: err.error || 'Failed to export backup', type: 'error' });
      }
    } catch (e: any) {
      setAdminStatusMessage({ text: 'Network error exporting backup', type: 'error' });
    }
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const backupJson = JSON.parse(event.target?.result as string);
        if (!backupJson || typeof backupJson !== 'object') {
          setAdminStatusMessage({ text: 'Invalid JSON backup format', type: 'error' });
          return;
        }

        const confirmRestore = window.confirm("Are you sure you want to restore this backup? This will replace all your current channels, users, settings, and histories.");
        if (!confirmRestore) return;

        const res = await fetch('/api/admin/restore', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(backupJson)
        });
        const data = await res.json();
        if (res.ok) {
          setAdminStatusMessage({ text: 'Database backup restored successfully! Reloading data...', type: 'success' });
          // Reload page to refresh all stats and states
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        } else {
          setAdminStatusMessage({ text: data.error || 'Failed to restore backup', type: 'error' });
        }
      } catch (err) {
        setAdminStatusMessage({ text: 'Error parsing backup file. Make sure it is a valid JSON backup.', type: 'error' });
      }
    };
    reader.readAsText(file);
  };

  // --- FILTERS & CATEGORIES ---
  const categories = useMemo(() => {
    const list = new Set<string>();
    channels.forEach(c => {
      if (c.category) list.add(c.category);
    });
    return ['All', ...Array.from(list)];
  }, [channels]);

  const filteredChannels = useMemo(() => {
    return channels.filter(c => {
      const matchesTags = c.tags && c.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            c.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            c.country.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            c.language.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            !!matchesTags;
      const matchesCategory = selectedCategory === 'All' || c.category === selectedCategory;
      const matchesFavouriteTab = activeTab !== 'favourite' || favouriteChannelIds.includes(c.id);

      return matchesSearch && matchesCategory && matchesFavouriteTab;
    });
  }, [channels, searchQuery, selectedCategory, activeTab, favouriteChannelIds]);

  // TV Remote navigation keyboard event listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only navigate if we are logged in and on the main hub
      if (!user || (activeTab !== 'player' && activeTab !== 'favourite')) return;

      // Ignore if user is typing in any input field
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        if (e.key === 'Escape') {
          (document.activeElement as HTMLElement).blur();
        }
        return;
      }

      if (filteredChannels.length === 0) return;

      // Find the index of the currently highlighted or selected channel
      const currentId = focusedChannelId || selectedChannel?.id;
      const currentIndex = filteredChannels.findIndex(c => c.id === currentId);

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        let nextIndex = 0;
        if (currentIndex !== -1) {
          nextIndex = (currentIndex + 1) % filteredChannels.length;
        }
        const nextChan = filteredChannels[nextIndex];
        setFocusedChannelId(nextChan.id);

        const element = document.getElementById(`channel_item_${nextChan.id}`);
        if (element) {
          element.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        let prevIndex = filteredChannels.length - 1;
        if (currentIndex !== -1) {
          prevIndex = (currentIndex - 1 + filteredChannels.length) % filteredChannels.length;
        }
        const prevChan = filteredChannels[prevIndex];
        setFocusedChannelId(prevChan.id);

        const element = document.getElementById(`channel_item_${prevChan.id}`);
        if (element) {
          element.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (focusedChannelId) {
          const chan = filteredChannels.find(c => c.id === focusedChannelId);
          if (chan) {
            setSelectedChannel(chan);
          }
        } else if (selectedChannel) {
          togglePlay();
        }
      } else if (e.key === 'Backspace' || e.key === 'Escape') {
        e.preventDefault();
        if (activeTab === 'favourite') {
          setActiveTab('player');
        } else {
          const searchInput = document.getElementById('search_channels_input');
          if (searchInput) {
            searchInput.focus();
          }
        }
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setVolume(prev => Math.min(1, prev + 0.1));
        setIsMuted(false);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setVolume(prev => Math.max(0, prev - 0.1));
        setIsMuted(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [user, activeTab, filteredChannels, focusedChannelId, selectedChannel]);

  // Clean up speech recognition on component unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  // Web Speech API Voice Search Implementation
  const toggleVoiceSearch = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setVoiceNotification("Voice search is not supported in this browser. Please use Chrome, Edge or Safari.");
      setTimeout(() => setVoiceNotification(null), 5000);
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        setVoiceNotification("Listening... Speak a channel name (e.g., 'Bein Sports', 'Somoy TV')");
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          const cleanedTranscript = transcript.trim().replace(/\.$/, '');
          setSearchQuery(cleanedTranscript);
          setVoiceNotification(`Searching for: "${cleanedTranscript}"`);
          
          // Let's search for a close match in existing channels to focus on it automatically!
          const lowerTranscript = cleanedTranscript.toLowerCase();
          const matchedChan = channels.find(c => 
            c.name.toLowerCase().includes(lowerTranscript) ||
            c.category.toLowerCase().includes(lowerTranscript)
          );
          
          if (matchedChan) {
            setFocusedChannelId(matchedChan.id);
            setVoiceNotification(`Voice Matched: "${matchedChan.name}"!`);
            // Automatically scroll it into view if element exists
            setTimeout(() => {
              const el = document.getElementById(`channel_item_${matchedChan.id}`);
              if (el) {
                el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
              }
            }, 300);
          } else {
            setVoiceNotification(`Searching for "${cleanedTranscript}"... No direct match found.`);
          }
        }
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        if (event.error === 'not-allowed') {
          setVoiceNotification("Microphone permission denied. Please enable mic access in your browser.");
        } else {
          setVoiceNotification(`Voice search error: ${event.error}`);
        }
        setIsListening(false);
        setTimeout(() => setVoiceNotification(null), 5000);
      };

      recognition.onend = () => {
        setIsListening(false);
        setTimeout(() => setVoiceNotification(null), 5000);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error("Failed to start Speech Recognition:", err);
      setIsListening(false);
    }
  };

  // Premium active banner text helper
  const isPremiumUser = user?.premiumStatus || user?.role === 'admin';

  // --- MAIN RENDER ---
  return (
    <div id="streamvault_root" className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans antialiased">
      
      {/* HEADER BAR */}
      <header id="app_header" className="bg-slate-900 border-b border-slate-800 px-6 py-4 sticky top-0 z-40 flex items-center justify-between shadow-lg">
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('player')}>
          <div className="bg-gradient-to-tr from-purple-600 to-indigo-500 p-2.5 rounded-xl shadow-md flex items-center justify-center">
            <Tv className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-indigo-400 bg-clip-text text-transparent">
              {appSettings?.siteName || 'StreamVault'}
            </h1>
            <p className="text-xs text-indigo-400 font-medium">Professional IPTV Hub</p>
          </div>
        </div>

        {/* Global Banner Announcement */}
        {appSettings?.announcementBanner && (
          <div className="hidden lg:flex items-center space-x-2 bg-indigo-950/40 border border-indigo-800/60 px-4 py-1.5 rounded-full max-w-lg text-xs text-indigo-300">
            <Award className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="truncate">{appSettings.announcementBanner}</span>
          </div>
        )}

        {/* Auth & Profile Actions */}
        <div className="flex items-center space-x-4">
          {user ? (
            <>
              {/* Premium Status Badge */}
              <div className="hidden sm:flex items-center space-x-1 px-3 py-1.5 rounded-full bg-slate-800 border border-slate-700">
                {isPremiumUser ? (
                  <>
                    <Award className="w-4 h-4 text-yellow-500" />
                    <span className="text-xs font-semibold text-yellow-500">Premium Active</span>
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 rounded-full bg-slate-400 animate-pulse"></span>
                    <span className="text-xs text-slate-400">Free Account</span>
                  </>
                )}
              </div>

              {/* Notifications Center */}
              <div className="relative">
                <button 
                  id="notif_bell"
                  onClick={() => {
                    setShowNotificationsDropdown(!showNotificationsDropdown);
                    if (!showNotificationsDropdown) {
                      handleMarkNotificationsRead();
                    }
                  }}
                  className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition relative"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-4.5 h-4.5 bg-rose-600 text-[10px] text-white font-bold rounded-full flex items-center justify-center border-2 border-slate-900">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {/* Notifications Dropdown */}
                {showNotificationsDropdown && (
                  <div className="absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 p-2 max-h-96 overflow-y-auto">
                    <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Notifications</h4>
                      <button 
                        onClick={() => setShowNotificationsDropdown(false)}
                        className="text-slate-400 hover:text-white text-xs"
                      >
                        Close
                      </button>
                    </div>
                    <div className="mt-1 divide-y divide-slate-800">
                      {notifications.length === 0 ? (
                        <p className="text-slate-500 text-xs py-4 text-center">No notifications yet.</p>
                      ) : (
                        notifications.map(notif => (
                          <div key={notif.id} className="p-3 text-xs hover:bg-slate-800 transition rounded-lg">
                            <div className="flex items-center justify-between mb-1">
                              <span className={`font-semibold ${
                                notif.type === 'success' ? 'text-emerald-400' :
                                notif.type === 'danger' ? 'text-rose-400' :
                                notif.type === 'warning' ? 'text-amber-400' : 'text-indigo-400'
                              }`}>
                                {notif.title}
                              </span>
                              <span className="text-[10px] text-slate-500">
                                {new Date(notif.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-slate-300 leading-relaxed">{notif.message}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* User Username display */}
              <div className="text-right hidden md:block">
                <p className="text-xs text-slate-400 font-medium">Logged in as</p>
                <p className="text-sm font-semibold text-slate-200">{user.username}</p>
              </div>

              {/* Action Buttons */}
              <button 
                id="header_change_pwd_btn"
                onClick={() => setShowChangePasswordModal(true)}
                className="flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 hover:text-indigo-300 text-slate-300 text-xs font-semibold transition border border-slate-700/80"
                title="Change Account Password"
              >
                <Key className="w-4 h-4 text-indigo-400" />
                <span className="hidden sm:inline">Password</span>
              </button>

              <button 
                id="logout_btn"
                onClick={handleLogout}
                className="flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-rose-950/60 hover:text-rose-200 text-slate-300 text-xs font-semibold transition border border-slate-700/80 hover:border-rose-900/60"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </>
          ) : (
            <div className="flex items-center space-x-2">
              <span className="text-xs text-slate-400 hidden sm:inline font-medium">Already registered?</span>
              <button 
                id="header_login_btn"
                onClick={() => setAuthTab('login')}
                className="flex items-center space-x-1 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* MAINTENANCE MODE BANNER */}
      {appSettings?.maintenanceMode && (
        <div className="bg-amber-500 text-slate-950 px-4 py-2 text-center font-bold text-sm flex items-center justify-center space-x-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>StreamVault is currently in Maintenance Mode. Only Admins can modify parameters. Streams may buffer.</span>
        </div>
      )}

      {/* GUEST ACCESS SCREEN */}
      {!user ? (
        <div className="flex-1 flex items-center justify-center p-6 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-950/40 via-slate-950 to-slate-950">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-8">
            <div className="text-center mb-6">
              <div className="inline-flex bg-indigo-950/80 border border-indigo-800 p-4 rounded-full mb-3 text-indigo-400">
                <Tv className="w-10 h-10" />
              </div>
              <h2 className="text-2xl font-extrabold text-white">Access StreamVault</h2>
              <p className="text-sm text-slate-400 mt-1">Please log in or register to start streaming premium live IPTV channels securely.</p>
            </div>

            {/* TAB SELECTOR */}
            <div className="flex bg-slate-950 p-1.5 rounded-xl mb-6">
              <button 
                id="tab_login"
                onClick={() => { setAuthTab('login'); setAuthError(null); }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${authTab === 'login' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Sign In
              </button>
              <button 
                id="tab_register"
                onClick={() => { setAuthTab('register'); setAuthError(null); }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${authTab === 'register' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Sign Up
              </button>
            </div>

            {/* ERROR VIEW */}
            {authError && (
              <div className="mb-4 p-3.5 bg-rose-950/80 border border-rose-900 text-rose-200 rounded-xl flex items-start space-x-2.5 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{authError}</span>
              </div>
            )}

            {/* FORM */}
            <form onSubmit={handleAuthSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Username</label>
                <input 
                  id="auth_username"
                  type="text" 
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  placeholder="e.g. faysal"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-600 transition"
                  required
                />
              </div>

              {authTab === 'register' && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Email Address</label>
                  <input 
                    id="auth_email"
                    type="email" 
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="e.g. example@streamvault.com"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-600 transition"
                    required
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Password</label>
                <input 
                  id="auth_password"
                  type="password" 
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-600 transition"
                  required
                />
              </div>

              <button 
                id="auth_submit_btn"
                type="submit" 
                disabled={authLoading}
                className="w-full mt-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-semibold py-3 rounded-xl transition shadow-lg text-sm flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {authLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : authTab === 'login' ? (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Login Securely</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>Create Free Account</span>
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 border-t border-slate-800/80 pt-4 text-center">
              <span className="text-[11px] text-slate-500">
                Secure streaming system utilizes active 256-bit token authentication.
              </span>
            </div>
          </div>
        </div>
      ) : (
        // --- LOGGED-IN MAIN SCREEN ---
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          
          {/* PRIMARY APPNET SIDEBAR */}
          <nav id="app_sidebar" className="hidden md:flex w-64 bg-slate-900 border-r border-slate-800 shrink-0 flex-col justify-between">
            <div className="p-4 space-y-6">
              {/* Profile Card Summary */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-indigo-950 border border-indigo-800 flex items-center justify-center font-bold text-indigo-400 shrink-0">
                    {user.username.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-200 truncate">{user.username}</p>
                    <p className="text-xs text-indigo-400 font-semibold uppercase tracking-wider">{user.role}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowChangePasswordModal(true)}
                  className="p-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-indigo-400 rounded-lg transition"
                  title="Change Password"
                >
                  <Key className="w-4 h-4" />
                </button>
              </div>

              {/* Sidebar Menu Links */}
              <div className="space-y-1.5">
                <button 
                  id="side_player"
                  onClick={() => setActiveTab('player')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition ${activeTab === 'player' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'}`}
                >
                  <div className="flex items-center space-x-2.5">
                    <Radio className="w-4 h-4" />
                    <span>Live Stream Hub</span>
                  </div>
                  <ChevronRight className="w-4 h-4 opacity-50" />
                </button>

                <button 
                  id="side_favourite"
                  onClick={() => setActiveTab('favourite')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition ${activeTab === 'favourite' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'}`}
                >
                  <div className="flex items-center space-x-2.5">
                    <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
                    <span>Favourites</span>
                  </div>
                  <span className="bg-slate-950/60 text-[10px] text-slate-400 px-2 py-0.5 rounded-full">
                    {favouriteChannelIds.length}
                  </span>
                </button>

                <button 
                  id="side_history"
                  onClick={() => setActiveTab('history')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition ${activeTab === 'history' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'}`}
                >
                  <div className="flex items-center space-x-2.5">
                    <History className="w-4 h-4" />
                    <span>Watch History</span>
                  </div>
                  <ChevronRight className="w-4 h-4 opacity-50" />
                </button>

                <button 
                  id="side_premium"
                  onClick={() => setActiveTab('premium')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition ${activeTab === 'premium' ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-white' : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'}`}
                >
                  <div className="flex items-center space-x-2.5">
                    <Award className="w-4 h-4 text-amber-400" />
                    <span>bKash Subscription</span>
                  </div>
                  {isPremiumUser && <Check className="w-4 h-4 text-amber-300" />}
                </button>

                <button 
                  id="side_support"
                  onClick={() => setActiveTab('support')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition ${activeTab === 'support' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'}`}
                >
                  <div className="flex items-center space-x-2.5">
                    <HelpCircle className="w-4 h-4 text-emerald-400" />
                    <span>Report & Support</span>
                  </div>
                  <ChevronRight className="w-4 h-4 opacity-50" />
                </button>

                {user.role === 'admin' && (
                  <button 
                    id="side_admin"
                    onClick={() => setActiveTab('admin')}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition ${activeTab === 'admin' ? 'bg-purple-600 text-white shadow-lg' : 'text-purple-400 hover:bg-purple-950/30'}`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <Shield className="w-4 h-4" />
                      <span>Admin Control Center</span>
                    </div>
                    <span className="bg-purple-950 text-purple-300 text-[10px] font-bold px-1.5 py-0.5 rounded-md border border-purple-800">
                      SYS
                    </span>
                  </button>
                )}
              </div>
            </div>

            {/* Sidebar quick payment info and footer */}
            <div className="p-4 border-t border-slate-800/80 bg-slate-950/40">
              <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Premium Payment</p>
              <div className="mt-1 flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-400">bKash (Personal)</span>
                <span className="text-indigo-400 select-all">{appSettings?.paymentNumber || '01736705156'}</span>
              </div>
              <p className="text-[10px] text-slate-600 mt-2">© 2026 StreamVault IPTV. All rights reserved.</p>
            </div>
          </nav>


          {/* ------------------- CORE VIEWPORTS ------------------- */}
          <main className="flex-1 flex flex-col overflow-y-auto bg-slate-950">
            
            {/* 1. MAIN PLAYER TAB */}
            {(activeTab === 'player' || activeTab === 'favourite') && (
              <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                
                {/* VIDEO PLAYER COLUMN */}
                <div className="flex-1 p-6 flex flex-col space-y-4 overflow-y-auto">
                  
                  {/* Real-time Selected Channel Bar */}
                  {selectedChannel ? (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-900 border border-slate-800 p-4 rounded-2xl gap-3">
                      <div className="flex items-center space-x-4">
                        <img 
                          src={selectedChannel.logo} 
                          alt={selectedChannel.name} 
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?w=100&h=100&fit=crop&q=80';
                          }}
                          className="w-12 h-12 rounded-xl object-cover bg-slate-950 border border-slate-800 shrink-0"
                        />
                        <div>
                          <div className="flex items-center space-x-2">
                            <h3 className="text-lg font-bold text-white">{selectedChannel.name}</h3>
                            {selectedChannel.isPremium && (
                              <span className="bg-amber-600/20 border border-amber-600/30 text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded">
                                Premium
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 font-medium">
                            {selectedChannel.category} • {selectedChannel.language} • {selectedChannel.country}
                          </p>
                          {selectedChannel.tags && selectedChannel.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-1.5">
                              {selectedChannel.tags.map(tag => (
                                <span 
                                  key={tag}
                                  onClick={() => setSearchQuery(tag)}
                                  className="text-[9px] font-bold bg-indigo-950 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-900/60 cursor-pointer hover:bg-indigo-900 transition"
                                  title={`Filter by ${tag}`}
                                >
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 shrink-0">
                        {/* Toggle Stream Proxy Helper */}
                        <button 
                          onClick={() => setUseProxy(!useProxy)}
                          className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${useProxy ? 'bg-emerald-950 border border-emerald-800 text-emerald-300' : 'bg-slate-800 text-slate-400 border border-slate-700'}`}
                          title="Stream Proxy helps play insecure HTTP streams under Secure HTTPS without browser errors"
                        >
                          <Globe className="w-3.5 h-3.5" />
                          <span>Proxy Stream: {useProxy ? 'ON' : 'OFF'}</span>
                        </button>

                        <button 
                          onClick={() => toggleFavourite(selectedChannel.id)}
                          className="p-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl transition"
                        >
                          <Heart className={`w-5 h-5 ${favouriteChannelIds.includes(selectedChannel.id) ? 'text-rose-500 fill-rose-500' : 'text-slate-400'}`} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl text-center text-slate-400">
                      No Channel Selected. Select a channel from the playlist to start streaming.
                    </div>
                  )}

                  {/* INTERACTIVE STREAMING ENGINE VIEWPORT */}
                  <div 
                    id="player_viewport"
                    ref={playerContainerRef}
                    onClick={handlePlayerTap}
                    onWheel={handlePlayerWheel}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    className="relative aspect-video w-full bg-black rounded-2xl overflow-hidden border border-slate-800 shadow-2xl flex flex-col justify-between group select-none cursor-pointer"
                  >
                    {/* Buffered / Video Core */}
                    <video 
                      ref={videoRef}
                      onClick={(e) => {
                        const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || 
                                         window.matchMedia('(max-width: 1024px)').matches;
                        if (!isMobile) {
                          e.stopPropagation();
                          togglePlay();
                        }
                      }}
                      style={{ filter: `brightness(${brightness})` }}
                      className="w-full h-full object-contain cursor-pointer transition-all duration-350"
                      playsInline
                    />

                    {/* Center Floating Indicator for Gestures */}
                    {indicatorMessage && (
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-50">
                        <div className="bg-slate-950/90 border border-slate-800/80 backdrop-blur-lg px-5 py-3.5 rounded-2xl shadow-2xl flex flex-col items-center justify-center space-y-2 min-w-[120px]">
                          {indicatorMessage.type === 'brightness' ? (
                            <Sun className="w-8 h-8 text-amber-400 animate-pulse" />
                          ) : (
                            <Volume2 className="w-8 h-8 text-indigo-400 animate-pulse" />
                          )}
                          <span className="text-sm font-black font-mono text-white tracking-wider">{indicatorMessage.text}</span>
                          {/* Mini Progress Bar */}
                          <div className="w-20 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${indicatorMessage.type === 'brightness' ? 'bg-amber-500' : 'bg-indigo-500'}`}
                              style={{ width: `${Math.min(100, (indicatorMessage.type === 'brightness' ? (indicatorMessage.value - 0.3) / 1.4 : indicatorMessage.value) * 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Gesture help tip overlay visible on hover */}
                    {selectedChannel && !playerError && (
                      <div className="absolute top-3 left-3 bg-slate-950/70 backdrop-blur-md px-2.5 py-1 rounded-full pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-[9px] text-slate-400 font-medium">
                        💡 Scroll or Swipe up/down on Player to adjust Brightness (left) & Volume (right)
                      </div>
                    )}

                    {/* Loader overlays */}
                    {isBuffering && (
                      <div className="absolute inset-0 bg-slate-950/80 flex flex-col items-center justify-center space-y-3 z-10">
                        <RefreshCw className="w-10 h-10 text-indigo-500 animate-spin" />
                        <span className="text-xs text-slate-300 font-semibold tracking-wider">Loading IPTV Stream...</span>
                      </div>
                    )}

                    {/* Error indicator overlay */}
                    {playerError && (
                      <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-6 text-center z-10 space-y-4">
                        <AlertCircle className="w-12 h-12 text-rose-500" />
                        <div className="max-w-md">
                          <h4 className="text-base font-bold text-white">Streaming Unavailable</h4>
                          <p className="text-xs text-slate-400 mt-1">{playerError}</p>
                          {selectedChannel?.isPremium && !isPremiumUser && (
                            <button 
                              onClick={() => setActiveTab('premium')}
                              className="mt-4 inline-flex items-center space-x-2 bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs px-4 py-2 rounded-xl transition"
                            >
                              <Award className="w-4 h-4" />
                              <span>Activate Premium via bKash</span>
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Advanced HUD Telemetry Overlay (Stats for Nerds) */}
                    {showAdvancedStats && selectedChannel && !playerError && (
                      <div 
                        onClick={(e) => e.stopPropagation()}
                        className="absolute top-12 right-4 bg-slate-950/90 border border-slate-800/85 backdrop-blur-md p-4 rounded-xl text-white font-mono text-[10px] space-y-2 z-40 w-52 pointer-events-auto shadow-2xl border border-slate-800"
                      >
                        <div className="flex items-center justify-between border-b border-slate-800/60 pb-1.5 mb-2">
                          <span className="font-bold text-indigo-400 flex items-center gap-1 text-[10px]">
                            <Activity className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
                            <span>STREAM DIAGNOSTICS</span>
                          </span>
                          <button 
                            onClick={() => setShowAdvancedStats(false)}
                            className="text-slate-500 hover:text-white transition text-xs leading-none font-bold"
                          >
                            ×
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-slate-300">
                          <span className="text-slate-500 font-sans">Latency:</span>
                          <span className="text-right text-emerald-400 font-bold">{streamStats.latency} ms</span>
                          
                          <span className="text-slate-500 font-sans">Bitrate:</span>
                          <span className="text-right text-amber-400 font-bold">{(streamStats.bitrate / 1000).toFixed(2)} Mbps</span>
                          
                          <span className="text-slate-500 font-sans">FPS / Drop:</span>
                          <span className="text-right text-sky-400 font-bold">{streamStats.fps} / 0</span>
                          
                          <span className="text-slate-500 font-sans">Resolution:</span>
                          <span className="text-right text-indigo-300 font-bold">{streamStats.resolution}</span>
                          
                          <span className="text-slate-500 font-sans">Buffer Health:</span>
                          <span className="text-right text-purple-400 font-bold">{streamStats.bufferLength}s</span>

                          <span className="text-slate-500 font-sans">Protocol:</span>
                          <span className="text-right text-slate-400 text-[9px] truncate" title={streamStats.protocol}>{streamStats.protocol}</span>
                        </div>
                      </div>
                    )}

                    {/* CUSTOM CONTROLS OVERLAY */}
                    {selectedChannel && !playerError && (
                      <div className={`absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-950 via-slate-950/85 to-transparent p-4 flex flex-col space-y-3 transition-all duration-300 z-20 ${showMobileControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto'}`}>
                        
                        {/* Playback sliders and buttons */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <button 
                              onClick={togglePlay}
                              className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition focus:outline-none"
                            >
                              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
                            </button>

                            {/* Volume controls for inline desktop layout */}
                            <div className="hidden md:flex items-center space-x-2">
                              <button onClick={toggleMute} className="text-slate-300 hover:text-white transition focus:outline-none">
                                {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
                              </button>
                              <input 
                                type="range" 
                                min="0" 
                                max="1" 
                                step="0.1" 
                                value={isMuted ? 0 : volume} 
                                onChange={(e) => {
                                  setVolume(Number(e.target.value));
                                  setIsMuted(false);
                                }}
                                className="w-20 accent-indigo-500 h-1 rounded-full cursor-pointer"
                              />
                            </div>

                            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded">
                              LIVE
                            </span>
                          </div>

                          <div className="flex items-center space-x-3">
                            {/* Stats Telemetry Toggle */}
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowAdvancedStats(!showAdvancedStats);
                              }}
                              className={`flex items-center space-x-1.5 text-xs font-semibold px-2.5 py-1 rounded-md transition focus:outline-none ${showAdvancedStats ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:text-white bg-slate-900 border border-slate-800'}`}
                              title="Toggle stream quality and network latency telemetry stats overlay"
                            >
                              <Activity className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Stats</span>
                            </button>

                            {/* PiP Mode */}
                            <button 
                              onClick={async () => {
                                if (!videoRef.current) return;
                                try {
                                  if (document.pictureInPictureElement) {
                                    await document.exitPictureInPicture();
                                    setIsPip(false);
                                  } else {
                                    await videoRef.current.requestPictureInPicture();
                                    setIsPip(true);
                                  }
                                } catch (e) {
                                  console.error(e);
                                }
                              }}
                              className="text-slate-300 hover:text-white transition text-xs font-semibold px-2 py-1 bg-slate-900 border border-slate-800 rounded-md focus:outline-none"
                            >
                              PiP
                            </button>

                            <button onClick={handleFullscreen} className="text-slate-300 hover:text-white transition focus:outline-none">
                              {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* QUICK STATS & DETAILS ABOUT CHANNEL */}
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                    <button 
                      onClick={() => setShowGuide(!showGuide)}
                      className="w-full flex items-center justify-between p-5 text-left hover:bg-slate-850/55 transition-all focus:outline-none"
                    >
                      <h4 className="text-xs sm:text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                        <span>Live IPTV Guide & Reconnect Guide</span>
                        {!showGuide && <span className="text-[10px] font-normal lowercase text-slate-500 normal-case bg-slate-950 px-2 py-0.5 rounded-full border border-slate-850">click to expand</span>}
                      </h4>
                      {showGuide ? (
                        <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                      )}
                    </button>
                    {showGuide && (
                      <div className="px-5 pb-5 border-t border-slate-800/40 pt-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-400 leading-relaxed">
                          <div className="space-y-2">
                            <p>🔒 <strong>Secure Mixed-Content Streaming:</strong> Many IPTV servers broadcast over raw HTTP. By enabling <strong>Proxy Stream</strong> above, StreamVault securely routes streams through our server to satisfy high-security browser rules.</p>
                            <p>⚡ <strong>Buffer Recovery:</strong> Our player implements auto reconnect. If streaming pauses, toggle the <strong>Play/Pause</strong> button or toggle <strong>Proxy Stream</strong> to initiate buffer recovery.</p>
                          </div>
                          <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-xl space-y-1.5 font-medium">
                            <p className="text-xs text-indigo-400 font-bold">Having Playback Issues?</p>
                            <p>1. Switch Stream Proxy option ON.</p>
                            <p>2. Keep volume high and toggle the Play icon.</p>
                            <p>3. Confirm your internet speeds. Standard IPTV demands at least 5 Mbps.</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* PLAYLIST / CHANNEL NAVIGATION COLUMN */}
                <div className="w-full lg:w-96 bg-slate-900 border-t lg:border-t-0 lg:border-l border-slate-800 shrink-0 flex flex-col overflow-hidden">
                  
                  {/* SEARCH AND FILTERS CONTAINER */}
                  <div className="p-4 border-b border-slate-800 space-y-3 bg-slate-900/60">
                    {voiceNotification && (
                      <div className="p-2 bg-indigo-950/80 border border-indigo-800/40 rounded-xl text-[10px] text-indigo-300 flex items-center space-x-2 animate-pulse">
                        {isListening ? (
                          <div className="flex space-x-1 items-center shrink-0">
                            <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping" />
                          </div>
                        ) : (
                          <Info className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        )}
                        <span className="font-semibold">{voiceNotification}</span>
                      </div>
                    )}

                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                      <input 
                        id="search_channels_input"
                        type="text" 
                        placeholder="Search or tap mic to speak..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-20 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-600 transition"
                      />
                      
                      <div className="absolute right-3 top-2 flex items-center space-x-2">
                        <button
                          onClick={toggleVoiceSearch}
                          title={isListening ? "Stop listening" : "Voice Search (Speak Channel Name)"}
                          className={`p-1 rounded-lg transition-all ${isListening ? 'text-white bg-red-600 hover:bg-red-500 animate-pulse scale-105' : 'text-slate-400 hover:text-indigo-400 hover:bg-slate-850'}`}
                        >
                          {isListening ? <MicOff className="w-3.5 h-3.5 animate-bounce" /> : <Mic className="w-3.5 h-3.5" />}
                        </button>
                        {searchQuery && (
                          <button 
                            onClick={() => setSearchQuery('')}
                            className="text-[11px] font-semibold text-slate-500 hover:text-white"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                    </div>

                    {/* CATEGORY SWIPER CHIPS */}
                    <div className="flex space-x-1.5 overflow-x-auto pb-1 scrollbar-thin">
                      {categories.map(cat => (
                        <button 
                          key={cat}
                          onClick={() => setSelectedCategory(cat)}
                          className={`px-3 py-1 rounded-full text-[11px] font-semibold transition shrink-0 ${selectedCategory === cat ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'}`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* CHANNELS ACCORDION LIST */}
                  <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60 p-2 space-y-1 bg-slate-950/30">
                    {loadingChannels ? (
                      <div className="p-10 text-center text-slate-500 space-y-2">
                        <RefreshCw className="w-8 h-8 animate-spin mx-auto text-indigo-500" />
                        <p className="text-xs">Fetching StreamVault IPTV Playlist...</p>
                      </div>
                    ) : filteredChannels.length === 0 ? (
                      <div className="p-10 text-center text-slate-500">
                        <Info className="w-8 h-8 mx-auto text-slate-600 mb-2" />
                        <p className="text-xs font-semibold">No channels match this search</p>
                        <p className="text-[11px] text-slate-600 mt-1">Try switching category filter or typing other terms.</p>
                      </div>
                    ) : (
                      filteredChannels.map(chan => {
                        const isSelected = selectedChannel?.id === chan.id;
                        const isFocused = focusedChannelId === chan.id;
                        const isLocked = chan.isPremium && !isPremiumUser;
                        return (
                          <div 
                            key={chan.id}
                            id={`channel_item_${chan.id}`}
                            onClick={() => {
                              setSelectedChannel(chan);
                              setFocusedChannelId(chan.id);
                            }}
                            className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all duration-200 ${
                              isSelected 
                                ? 'bg-indigo-600/20 border border-indigo-600/40 shadow-sm' 
                                : isFocused 
                                  ? 'bg-slate-900 border-2 border-amber-400 shadow-md ring-1 ring-amber-400/50 scale-[1.01]' 
                                  : 'hover:bg-slate-800/50 border border-transparent'
                            }`}
                          >
                            <div className="flex items-center space-x-3 min-w-0">
                              <span className={`text-xs font-bold w-6 text-center ${isSelected ? 'text-indigo-400 font-extrabold' : isFocused ? 'text-amber-400' : 'text-slate-600'}`}>
                                {chan.number}
                              </span>
                              <img 
                                src={chan.logo} 
                                alt={chan.name} 
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?w=80&h=80&fit=crop&q=80';
                                }}
                                className={`w-9 h-9 rounded-lg object-cover bg-slate-900 shrink-0 border ${isFocused ? 'border-amber-400' : 'border-slate-800/80'}`}
                              />
                              <div className="min-w-0">
                                <p className={`text-xs font-bold truncate ${isSelected ? 'text-indigo-400' : isFocused ? 'text-amber-300' : 'text-slate-200'}`}>
                                  {chan.name}
                                </p>
                                <p className="text-[10px] text-slate-500 font-medium truncate">
                                  {chan.category} • {chan.language}
                                </p>
                                {chan.tags && chan.tags.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {chan.tags.map(tag => (
                                      <span 
                                        key={tag}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSearchQuery(tag);
                                        }}
                                        className="text-[8px] font-bold bg-slate-800/80 hover:bg-indigo-950/80 hover:text-indigo-300 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700/50 hover:border-indigo-800 transition-all cursor-pointer select-none"
                                      >
                                        #{tag}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center space-x-2 shrink-0">
                              {/* TV remote focus cursor badge */}
                              {isFocused && (
                                <span className="bg-amber-400 text-slate-950 font-bold text-[8px] uppercase tracking-wider px-1 py-0.5 rounded shadow">
                                  Remote Focused
                                </span>
                              )}
                              
                              {/* Premium indication locks */}
                              {chan.isPremium && (
                                <div className="p-1 rounded bg-amber-600/10 border border-amber-600/20 text-amber-500" title="Premium Channel">
                                  <Award className="w-3.5 h-3.5" />
                                </div>
                              )}
                              
                              {/* Locked status */}
                              {isLocked && (
                                <span className="text-[10px] text-amber-500 font-bold bg-amber-950/80 border border-amber-900/60 px-1.5 py-0.5 rounded">
                                  Lock
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Sidebar bottom counter */}
                  <div className="p-3.5 bg-slate-900 border-t border-slate-800 text-[11px] text-slate-500 flex justify-between font-medium">
                    <span>Showing {filteredChannels.length} of {channels.length} channels</span>
                    <span>v2.1.0-secure</span>
                  </div>

                </div>

              </div>
            )}


            {/* 2. WATCH HISTORY TAB */}
            {activeTab === 'history' && (
              <div className="p-6 max-w-4xl mx-auto w-full space-y-6">
                <div className="flex items-center space-x-3 mb-2">
                  <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 text-indigo-400">
                    <History className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Stream Watch History</h2>
                    <p className="text-xs text-slate-400">Keep track of your latest viewed IPTV streams and continue streaming easily.</p>
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                  {watchHistory.length === 0 ? (
                    <div className="p-12 text-center text-slate-500">
                      <History className="w-12 h-12 mx-auto text-slate-600 mb-3" />
                      <p className="text-sm font-semibold text-slate-400">No stream history yet</p>
                      <p className="text-xs text-slate-500 mt-1">Start watching any live IPTV channel to build your dashboard history automatically.</p>
                    </div>
                  ) : (
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="bg-slate-950 text-[10px] text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800">
                        <tr>
                          <th className="px-5 py-3">Channel Name</th>
                          <th className="px-5 py-3">Watched At</th>
                          <th className="px-5 py-3">Auto Resume</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/80">
                        {watchHistory.map((hist) => {
                          const chan = channels.find(c => c.id === hist.channelId);
                          return (
                            <tr key={hist.id} className="hover:bg-slate-800/40 transition">
                              <td className="px-5 py-3.5 font-bold text-white">
                                <div className="flex items-center space-x-2">
                                  <Radio className="w-4 h-4 text-indigo-500" />
                                  <span>{hist.channelName}</span>
                                </div>
                              </td>
                              <td className="px-5 py-3.5 text-slate-400">
                                {new Date(hist.watchedAt).toLocaleString()}
                              </td>
                              <td className="px-5 py-3.5">
                                <button 
                                  onClick={() => {
                                    if (chan) {
                                      setSelectedChannel(chan);
                                      setActiveTab('player');
                                    } else {
                                      alert('Channel is temporarily unavailable.');
                                    }
                                  }}
                                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-2.5 py-1 rounded-md text-[11px] font-semibold transition"
                                >
                                  Resume Play
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}


            {/* 3. bKash MANUAL PAYMENTS & PREMIUM ACTIVATOR */}
            {activeTab === 'premium' && (
              <div className="p-6 max-w-5xl mx-auto w-full space-y-6">
                
                {/* Intro Title */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
                  <div className="flex items-center space-x-3">
                    <div className="bg-amber-600/10 p-2.5 border border-amber-600/30 rounded-xl text-amber-500">
                      <Award className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">bKash Subscription System</h2>
                      <p className="text-xs text-slate-400">Manual payment verification processing engine. Highly fast activation.</p>
                    </div>
                  </div>

                  {user.premiumStatus && user.premiumExpiryDate && (
                    <div className="bg-emerald-950/60 border border-emerald-800/80 px-4.5 py-2 rounded-xl text-xs text-right">
                      <p className="text-emerald-400 font-bold">Premium Subscription Active 🎉</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Expires on: {new Date(user.premiumExpiryDate).toLocaleDateString()}</p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  
                  {/* PAYMENT MANUAL CARD (Left 5 cols) */}
                  <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
                    <div className="bg-gradient-to-tr from-pink-700 to-rose-600 p-4.5 rounded-xl text-white shadow-md">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] uppercase font-bold tracking-wider bg-white/20 px-2 py-0.5 rounded">bKash Personal</span>
                        <CreditCard className="w-5 h-5 opacity-90" />
                      </div>
                      <p className="text-xs text-pink-100 font-medium">Send Money to Personal Number:</p>
                      <p className="text-2xl font-black mt-1 select-all tracking-wider">{appSettings?.paymentNumber || '01736705156'}</p>
                      <div className="mt-4 border-t border-white/20 pt-3 text-[11px] text-pink-100 flex items-center justify-between font-semibold">
                        <span>Use reference:</span>
                        <span className="bg-slate-950/40 text-yellow-300 px-2 py-0.5 rounded font-mono select-all text-xs">{user.username}</span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pricing & Packages</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {/* Package 1 */}
                        <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-xl text-center space-y-1 hover:border-indigo-500/40 transition">
                          <span className="text-xl">🚀</span>
                          <p className="text-xs font-bold text-white">Standard</p>
                          <p className="text-[10px] text-slate-400">30 Days Plan</p>
                          <p className="text-sm font-black text-pink-500 mt-1">৳300 BDT</p>
                        </div>
                        {/* Package 2 */}
                        <div className="bg-slate-950 border border-purple-900/35 p-3.5 rounded-xl text-center space-y-1 relative overflow-hidden hover:border-purple-500/40 transition">
                          <div className="absolute top-0 right-0 bg-purple-600 text-white font-bold text-[7px] px-1.5 py-0.5 rounded-bl uppercase">Popular</div>
                          <span className="text-xl">✨</span>
                          <p className="text-xs font-bold text-white">Quarterly</p>
                          <p className="text-[10px] text-slate-400">90 Days Plan</p>
                          <p className="text-sm font-black text-pink-500 mt-1">৳800 BDT</p>
                        </div>
                        {/* Package 3 */}
                        <div className="bg-slate-950 border border-amber-900/30 p-3.5 rounded-xl text-center space-y-1 hover:border-amber-500/40 transition">
                          <span className="text-xl">👑</span>
                          <p className="text-xs font-bold text-white">Yearly Elite</p>
                          <p className="text-[10px] text-slate-400">365 Days Plan</p>
                          <p className="text-sm font-black text-pink-500 mt-1">৳2500 BDT</p>
                        </div>
                      </div>
                    </div>

                    {/* SUBMIT REQUEST FORM */}
                    <form onSubmit={handleSubmitBkash} className="space-y-4 pt-2">
                      <h3 className="text-xs uppercase tracking-wider font-bold text-slate-400">Submit Verification Request</h3>

                      {subSubmitError && (
                        <div className="p-3 bg-rose-950/80 border border-rose-900 text-rose-200 text-xs rounded-xl flex items-start space-x-2">
                          <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                          <span>{subSubmitError}</span>
                        </div>
                      )}

                      {subSubmitSuccess && (
                        <div className="p-3 bg-emerald-950/80 border border-emerald-900 text-emerald-200 text-xs rounded-xl flex items-start space-x-2">
                          <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
                          <span>{subSubmitSuccess}</span>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">bKash Number</label>
                          <input 
                            id="sub_bkash_number"
                            type="text" 
                            placeholder="e.g. 017XXXXXX" 
                            value={bkashNumber}
                            onChange={(e) => setBkashNumber(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-indigo-600 text-white"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Amount Sent (৳)</label>
                          <input 
                            id="sub_amount"
                            type="number" 
                            placeholder="300" 
                            value={paymentAmount}
                            onChange={(e) => setPaymentAmount(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-indigo-600 text-white"
                            required
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Reference Code</label>
                          <input 
                            id="sub_reference"
                            type="text" 
                            value={paymentReference}
                            onChange={(e) => setPaymentReference(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-indigo-600 text-white"
                            required
                            readOnly
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Duration Plan</label>
                          <select 
                            id="sub_duration"
                            value={durationDays}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setDurationDays(val);
                              // Auto calculate default rates to assist user
                              if (val === 30) setPaymentAmount('300');
                              if (val === 90) setPaymentAmount('800');
                              if (val === 365) setPaymentAmount('2500');
                            }}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-indigo-600 text-white"
                          >
                            <option value="30">30 Days (৳300)</option>
                            <option value="90">90 Days (৳800)</option>
                            <option value="365">365 Days (৳2500)</option>
                          </select>
                        </div>
                      </div>

                      <button 
                        id="submit_bkash_btn"
                        type="submit"
                        disabled={subSubmitLoading}
                        className="w-full bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white text-xs font-bold py-2.5 rounded-lg transition shadow flex items-center justify-center space-x-2 disabled:opacity-50"
                      >
                        {subSubmitLoading ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4" />
                            <span>Verify and Activate Premium</span>
                          </>
                        )}
                      </button>
                    </form>
                  </div>

                  {/* MY SUBMISSION REQUESTS (Right 7 cols) */}
                  <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white mb-4 flex items-center space-x-2">
                        <List className="w-4 h-4 text-indigo-400" />
                        <span>My Verification Submissions</span>
                      </h3>

                      <div className="space-y-3 overflow-y-auto max-h-[380px] pr-1">
                        {mySubs.length === 0 ? (
                          <div className="p-10 text-center text-slate-500 border border-dashed border-slate-800 rounded-xl bg-slate-950/40">
                            <Info className="w-8 h-8 mx-auto text-slate-600 mb-2" />
                            <p className="text-xs font-semibold">No submissions recorded yet</p>
                            <p className="text-[10px] text-slate-600 mt-1">Submit your bKash details on the left after completing standard payment.</p>
                          </div>
                        ) : (
                          mySubs.map((sub) => (
                            <div key={sub.id} className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs">
                              <div className="flex items-center justify-between border-b border-slate-800/60 pb-2 mb-2">
                                <div className="flex items-center space-x-2">
                                  <CreditCard className="w-4 h-4 text-pink-500" />
                                  <span className="font-bold text-slate-200">৳{sub.amount} • {sub.durationDays} Days</span>
                                </div>
                                <span className={`px-2.5 py-0.5 rounded-full font-bold text-[9px] uppercase tracking-wider ${
                                  sub.status === 'pending' ? 'bg-amber-950 text-amber-400 border border-amber-900' :
                                  sub.status === 'approved' ? 'bg-emerald-950 text-emerald-400 border border-emerald-900' :
                                  'bg-rose-950 text-rose-400 border border-rose-900'
                                }`}>
                                  {sub.status}
                                </span>
                              </div>

                              <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-slate-400">
                                <div>
                                  <p className="text-[10px] text-slate-600 uppercase">From Number:</p>
                                  <p className="font-semibold text-slate-300">{sub.senderNumber}</p>
                                </div>
                                <div>
                                  <p className="text-[10px] text-slate-600 uppercase">Sent Reference:</p>
                                  <p className="font-semibold text-slate-300">{sub.reference}</p>
                                </div>
                                <div className="col-span-2">
                                  <p className="text-[10px] text-slate-600 uppercase">Submitted At:</p>
                                  <p className="font-semibold text-slate-300">{new Date(sub.createdAt).toLocaleString()}</p>
                                </div>
                                {sub.notes && (
                                  <div className="col-span-2 bg-slate-900 p-2 rounded-lg border border-slate-800 mt-1">
                                    <p className="text-[10px] text-indigo-400 font-bold">Admin response notes:</p>
                                    <p className="text-slate-300 mt-0.5">{sub.notes}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-800 text-[10px] text-slate-500 leading-relaxed">
                      💡 <strong>Instant Approval Guarantee:</strong> bKash manual verifications are audited within 5-15 minutes by live system admins. Feel free to contact support at our email if delays arise.
                    </div>
                  </div>

                </div>

              </div>
            )}


            {/* 5. REPORT & SUPPORT PANEL */}
            {activeTab === 'support' && (
              <div className="p-6 max-w-5xl mx-auto w-full space-y-6">
                
                {/* Intro Title */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
                  <div className="flex items-center space-x-3">
                    <div className="bg-emerald-900/20 border border-emerald-800/30 p-2.5 rounded-xl text-emerald-400">
                      <HelpCircle className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">Report & Support</h2>
                      <p className="text-xs text-slate-500 mt-0.5">Need assistance or found a bug? We are here to help you 24/7.</p>
                    </div>
                  </div>
                </div>

                {/* Grid layout */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  
                  {/* Left support contacts */}
                  <div className="md:col-span-1 space-y-6">
                    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Direct Contact</h3>
                      
                      {/* Email Section */}
                      <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl space-y-1.5">
                        <div className="flex items-center space-x-2 text-indigo-400">
                          <Mail className="w-4 h-4" />
                          <span className="text-[11px] font-bold uppercase tracking-wider">Support Email</span>
                        </div>
                        <p className="text-sm font-semibold text-white break-all select-all">
                          {appSettings?.contactEmail || 'support@streamvault.com'}
                        </p>
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(appSettings?.contactEmail || 'support@streamvault.com');
                            alert('Support email address copied to clipboard!');
                          }}
                          className="w-full text-center bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 hover:text-white font-semibold text-[10px] py-1.5 rounded-lg transition"
                        >
                          Copy Email Address
                        </button>
                      </div>

                      {/* Phone Section */}
                      <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl space-y-1.5">
                        <div className="flex items-center space-x-2 text-emerald-400">
                          <Phone className="w-4 h-4" />
                          <span className="text-[11px] font-bold uppercase tracking-wider">Phone / bKash Support</span>
                        </div>
                        <p className="text-sm font-semibold text-white select-all">
                          {appSettings?.supportPhone || '01736705156'}
                        </p>
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(appSettings?.supportPhone || '01736705156');
                            alert('Support phone number copied to clipboard!');
                          }}
                          className="w-full text-center bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 hover:text-white font-semibold text-[10px] py-1.5 rounded-lg transition"
                        >
                          Copy Phone Number
                        </button>
                      </div>

                      {/* Info alert */}
                      <div className="p-3 bg-emerald-950/20 border border-emerald-900/30 rounded-xl text-[10px] text-emerald-400 leading-relaxed">
                        🙋 <strong>How it works:</strong> You can reach out directly via our email or phone number for instant subscription approvals, channel inquiries, or custom IPTV playlist setups.
                      </div>
                    </div>
                  </div>

                  {/* Right Report Terminal (Embedded report system) */}
                  <div className="md:col-span-2 space-y-4">
                    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                        <div>
                          <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                            <span>Interactive Report Terminal</span>
                          </h3>
                          <p className="text-[10px] text-slate-500 mt-0.5">Report bugs, billing issues, or feature requests safely below.</p>
                        </div>

                        <a 
                          href="http://unknown.kesug.com/end.html" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center space-x-1.5 bg-indigo-650 hover:bg-indigo-600 text-white font-bold text-[10px] px-3 py-1.5 rounded-lg transition"
                        >
                          <span>Open in New Tab</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>

                      {/* Clean Sandbox Iframe */}
                      <div className="w-full bg-slate-950 border border-slate-850 rounded-xl overflow-hidden shadow-inner relative" style={{ height: '480px' }}>
                        <iframe 
                          src="http://unknown.kesug.com/end.html" 
                          title="Report a Problem Terminal"
                          className="w-full h-full border-0 bg-white"
                          sandbox="allow-scripts allow-same-origin allow-forms"
                        />
                      </div>

                      <p className="text-[10px] text-slate-500 text-center">
                        Secure connection encrypted by StreamVault IPTV Core system.
                      </p>
                    </div>
                  </div>

                </div>

              </div>
            )}


            {/* 4. ADMIN CONTROL PANEL */}
            {user.role === 'admin' && activeTab === 'admin' && (
              <div className="p-6 space-y-6">
                
                {/* Header Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
                  <div className="flex items-center space-x-3">
                    <div className="bg-purple-900/20 border border-purple-800/30 p-2.5 rounded-xl text-purple-400">
                      <Shield className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">Admin Control Center</h2>
                      <p className="text-xs text-slate-400">System configurations, database sync controls, bKash reviewers, and user managers.</p>
                    </div>
                  </div>

                  <button 
                    onClick={handleSyncChannels}
                    disabled={isSyncingChannels}
                    className="flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-xs px-4 py-2 rounded-xl transition shadow"
                  >
                    <RefreshCw className={`w-4 h-4 ${isSyncingChannels ? 'animate-spin' : ''}`} />
                    <span>Sync GitHub M3U Playlist</span>
                  </button>
                </div>

                {/* STATUS BAR MESSAGE DISPLAY */}
                {adminStatusMessage && (
                  <div className={`p-4 rounded-xl text-xs flex items-center justify-between font-semibold border ${
                    adminStatusMessage.type === 'success' ? 'bg-emerald-950/80 border-emerald-900 text-emerald-200' : 'bg-rose-950/80 border-rose-900 text-rose-200'
                  }`}>
                    <span>{adminStatusMessage.text}</span>
                    <button onClick={() => setAdminStatusMessage(null)} className="text-slate-400 hover:text-white text-sm">×</button>
                  </div>
                )}

                {/* INTERNAL TAB SWITCHERS */}
                <div className="flex space-x-2 border-b border-slate-800 pb-px overflow-x-auto whitespace-nowrap scrollbar-thin">
                  {(['overview', 'subscriptions', 'channels', 'users', 'notifications', 'settings'] as const).map(tab => (
                    <button 
                      key={tab}
                      onClick={() => setAdminSubTab(tab)}
                      className={`px-4.5 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition ${adminSubTab === tab ? 'border-purple-500 text-purple-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                {/* SUBTAB 1. OVERVIEW / ANALYTICS */}
                {adminSubTab === 'overview' && analytics && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      
                      <div className="bg-slate-900 border border-slate-800 p-4.5 rounded-2xl space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">Total Members</span>
                          <Users className="w-5 h-5 text-indigo-400" />
                        </div>
                        <p className="text-2xl font-black text-white">{analytics.totalUsers}</p>
                        <p className="text-[10px] text-slate-400">Including {analytics.bannedUsers} banned profiles</p>
                      </div>

                      <div className="bg-slate-900 border border-slate-800 p-4.5 rounded-2xl space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">Premium Active</span>
                          <Award className="w-5 h-5 text-amber-400" />
                        </div>
                        <p className="text-2xl font-black text-amber-400">{analytics.premiumUsers}</p>
                        <p className="text-[10px] text-slate-400">{analytics.premiumExpiringSoon} expiring soon (3d)</p>
                      </div>

                      <div className="bg-slate-900 border border-slate-800 p-4.5 rounded-2xl space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">Today Logins</span>
                          <Activity className="w-5 h-5 text-purple-400" />
                        </div>
                        <p className="text-2xl font-black text-white">{analytics.todayLogins}</p>
                        <p className="text-[10px] text-slate-400">{analytics.onlineUsers} estimated active sessions</p>
                      </div>

                      <div className="bg-slate-900 border border-slate-800 p-4.5 rounded-2xl space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">Total Revenues</span>
                          <DollarSign className="w-5 h-5 text-emerald-400" />
                        </div>
                        <p className="text-2xl font-black text-emerald-400">৳{analytics.revenueSummary}</p>
                        <p className="text-[10px] text-slate-400">Audited via manual bKash logs</p>
                      </div>

                    </div>

                    {/* Quick System Info / M3U Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-2">
                          <Tv className="w-4 h-4 text-purple-400" />
                          <span>Playlist & Integration Details</span>
                        </h4>
                        <div className="space-y-2 text-xs text-slate-400">
                          <p>🔗 <strong>M3U Source:</strong> <span className="text-indigo-400 break-all select-all">{appSettings?.playlistUrl}</span></p>
                          <p>📊 <strong>Total Channels Loaded:</strong> <span className="font-bold text-white">{analytics.totalChannels} channels</span></p>
                          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1.5 font-medium">
                            <p className="text-indigo-400 font-bold">Auto Synchronizations:</p>
                            <p>Whenever you click "Sync GitHub M3U Playlist", StreamVault parses all channels, integrates logos/categories, preserves your custom changes (Premium flags/lock icons), and caches them on our JSON db engine.</p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-2">
                          <CreditCard className="w-4 h-4 text-pink-400" />
                          <span>Manual Payment Rules</span>
                        </h4>
                        <div className="space-y-2 text-xs text-slate-300 leading-relaxed">
                          <p>💳 <strong>Payment Number:</strong> {appSettings?.paymentNumber} (bKash Personal)</p>
                          <p>💡 <strong>Verification Logic:</strong> Users send money with reference code (which defaults to their username). Admin audits their logs, and clicks "Approve" inside the Subscriptions tab. Expiry duration automatically increments without any math required.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}


                {/* SUBTAB 2. SUBSCRIPTIONS APPROVAL REVIEWER */}
                {adminSubTab === 'subscriptions' && (
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl space-y-4 p-5">
                    <h3 className="text-sm font-bold text-white mb-2 flex items-center space-x-2">
                      <CreditCard className="w-4 h-4 text-purple-400" />
                      <span>bKash User Payment Verifications list</span>
                    </h3>

                    {adminSubs.length === 0 ? (
                      <div className="p-10 text-center text-slate-500">
                        No subscription requests registered in data files yet.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs text-slate-300">
                          <thead className="bg-slate-950 text-[10px] text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800">
                            <tr>
                              <th className="px-4 py-3">User Details</th>
                              <th className="px-4 py-3">Payment Details</th>
                              <th className="px-4 py-3">Requested Plan</th>
                              <th className="px-4 py-3">Created Date</th>
                              <th className="px-4 py-3 text-center">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/80">
                            {adminSubs.map((sub) => (
                              <tr key={sub.id} className="hover:bg-slate-800/30 transition">
                                <td className="px-4 py-3.5">
                                  <p className="font-bold text-white">{sub.username}</p>
                                  <p className="text-[10px] text-slate-500">{sub.userId}</p>
                                </td>
                                <td className="px-4 py-3.5">
                                  <p className="font-bold text-pink-400">৳{sub.amount} • {sub.senderNumber}</p>
                                  <p className="text-[10px] text-slate-400 font-medium">Ref: <span className="font-bold bg-slate-950 px-1 py-0.2 rounded text-slate-300 select-all">{sub.reference}</span></p>
                                </td>
                                <td className="px-4 py-3.5 font-semibold text-slate-200">
                                  {sub.durationDays} Days Plan
                                </td>
                                <td className="px-4 py-3.5 text-slate-400 text-[11px]">
                                  {new Date(sub.createdAt).toLocaleString()}
                                </td>
                                <td className="px-4 py-3.5">
                                  {sub.status === 'pending' ? (
                                    <div className="flex items-center justify-center space-x-2">
                                      <button 
                                        onClick={() => handleResolveSubscription(sub.id, 'approved')}
                                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] uppercase tracking-wider px-3 py-1.5 rounded transition shadow-md flex items-center space-x-1"
                                      >
                                        <Check className="w-3 h-3" />
                                        <span>Approve</span>
                                      </button>
                                      <button 
                                        onClick={() => {
                                          setRejectingSubId(sub.id);
                                          setRejectionNotes('Payment reference mismatch or missing transaction details.');
                                        }}
                                        className="bg-rose-950 border border-rose-900 text-rose-300 hover:bg-rose-900 hover:text-white font-bold text-[10px] uppercase tracking-wider px-3 py-1.5 rounded transition flex items-center space-x-1"
                                      >
                                        <X className="w-3 h-3" />
                                        <span>Reject</span>
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="text-center">
                                      <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] uppercase tracking-wider ${
                                        sub.status === 'approved' ? 'bg-emerald-950 text-emerald-400 border border-emerald-900' : 'bg-rose-950 text-rose-400 border border-rose-900'
                                      }`}>
                                        {sub.status}
                                      </span>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* REJECTION POPUP */}
                    {rejectingSubId && (
                      <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3 mt-4">
                        <h4 className="text-xs font-bold text-rose-400 uppercase">Specify rejection details:</h4>
                        <div className="flex gap-3">
                          <input 
                            type="text" 
                            value={rejectionNotes}
                            onChange={(e) => setRejectionNotes(e.target.value)}
                            className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-rose-500 text-white"
                          />
                          <button 
                            onClick={() => handleResolveSubscription(rejectingSubId, 'rejected')}
                            className="bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold px-4 py-2 rounded-lg transition"
                          >
                            Confirm Rejection
                          </button>
                          <button 
                            onClick={() => setRejectingSubId(null)}
                            className="bg-slate-800 text-slate-400 text-xs px-3 py-2 rounded-lg"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}


                {/* SUBTAB 3. CHANNEL MANAGER */}
                {adminSubTab === 'channels' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                        <Radio className="w-4 h-4 text-purple-400" />
                        <span>Channel Directory List</span>
                      </h3>

                      <button 
                        onClick={() => {
                          setEditingChannel({
                            name: '',
                            url: '',
                            logo: '',
                            category: 'Sports',
                            country: 'Bangladesh',
                            language: 'Bengali',
                            isPremium: false,
                            isActive: true,
                            isVisible: true,
                            tags: []
                          });
                          setShowAddChannelModal(true);
                        }}
                        className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition shadow flex items-center space-x-1.5"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add Custom Channel</span>
                      </button>
                    </div>

                    {/* ADD OR EDIT CHANNEL MODAL */}
                    {(showAddChannelModal || editingChannel?.id) && editingChannel && (
                      <form onSubmit={handleSaveChannel} className="bg-slate-900 border border-purple-900/60 rounded-2xl p-6 space-y-4">
                        <h4 className="text-sm font-bold text-white border-b border-slate-800 pb-2">
                          {editingChannel.id ? 'Edit Stream Channel details' : 'Add New Manual Custom IPTV Channel'}
                        </h4>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Channel Name</label>
                            <input 
                              type="text" 
                              value={editingChannel.name || ''} 
                              onChange={(e) => setEditingChannel({ ...editingChannel, name: e.target.value })}
                              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-purple-600 text-white"
                              required
                            />
                          </div>

                          <div className="md:col-span-2">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Stream URL (.m3u8, .mp4, live stream source)</label>
                            <input 
                              type="text" 
                              value={editingChannel.url || ''} 
                              onChange={(e) => setEditingChannel({ ...editingChannel, url: e.target.value })}
                              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-purple-600 text-white"
                              required
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Logo URL</label>
                            <input 
                              type="text" 
                              value={editingChannel.logo || ''} 
                              onChange={(e) => setEditingChannel({ ...editingChannel, logo: e.target.value })}
                              placeholder="Leave blank for placeholder"
                              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-purple-600 text-white"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Category</label>
                            <select 
                              value={editingChannel.category || 'Entertainment'} 
                              onChange={(e) => setEditingChannel({ ...editingChannel, category: e.target.value })}
                              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-purple-600 text-white"
                            >
                              <option value="Sports">Sports</option>
                              <option value="Movies">Movies</option>
                              <option value="Entertainment">Entertainment</option>
                              <option value="Kids">Kids</option>
                              <option value="News">News</option>
                              <option value="Music">Music</option>
                              <option value="Documentary">Documentary</option>
                              <option value="Religion">Religion</option>
                              <option value="Education">Education</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Country</label>
                            <input 
                              type="text" 
                              value={editingChannel.country || 'Bangladesh'} 
                              onChange={(e) => setEditingChannel({ ...editingChannel, country: e.target.value })}
                              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-purple-600 text-white"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Language</label>
                            <input 
                              type="text" 
                              value={editingChannel.language || 'Bengali'} 
                              onChange={(e) => setEditingChannel({ ...editingChannel, language: e.target.value })}
                              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-purple-600 text-white"
                            />
                          </div>

                          <div className="md:col-span-3">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Tags (Comma-separated)</label>
                            <input 
                              type="text" 
                              value={editingChannel.tags ? editingChannel.tags.join(', ') : ''} 
                              onChange={(e) => setEditingChannel({ ...editingChannel, tags: e.target.value.split(',') })}
                              placeholder="e.g. sports, live, hd, news"
                              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-purple-600 text-white"
                            />
                          </div>

                          <div className="flex items-center space-x-4 p-2 bg-slate-950 border border-slate-800 rounded-lg md:col-span-2">
                            <label className="flex items-center space-x-2 text-xs font-semibold cursor-pointer">
                              <input 
                                type="checkbox" 
                                checked={!!editingChannel.isPremium} 
                                onChange={(e) => setEditingChannel({ ...editingChannel, isPremium: e.target.checked })}
                                className="accent-indigo-600"
                              />
                              <span>Premium Lock (locks stream URL for free accounts)</span>
                            </label>

                            <label className="flex items-center space-x-2 text-xs font-semibold cursor-pointer">
                              <input 
                                type="checkbox" 
                                checked={!!editingChannel.isActive} 
                                onChange={(e) => setEditingChannel({ ...editingChannel, isActive: e.target.checked })}
                                className="accent-indigo-600"
                              />
                              <span>Active Link</span>
                            </label>
                          </div>
                        </div>

                        <div className="flex items-center justify-end space-x-3 pt-2">
                          <button 
                            type="button" 
                            onClick={() => {
                              setEditingChannel(null);
                              setShowAddChannelModal(false);
                            }}
                            className="px-4 py-2 bg-slate-800 text-slate-400 rounded-xl text-xs hover:text-white"
                          >
                            Cancel
                          </button>
                          <button 
                            type="submit" 
                            className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl transition"
                          >
                            Save Channel Configuration
                          </button>
                        </div>
                      </form>
                    )}

                    {/* TABLE OF CHANNELS */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl max-h-[500px] overflow-y-auto">
                      <table className="w-full text-left text-xs text-slate-300">
                        <thead className="bg-slate-950 text-[10px] text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800 sticky top-0 z-10">
                          <tr>
                            <th className="px-4 py-3">Num</th>
                            <th className="px-4 py-3">Details</th>
                            <th className="px-4 py-3">Category</th>
                            <th className="px-4 py-3">Access Type</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/80">
                          {adminChannels.map((chan) => (
                            <tr key={chan.id} className="hover:bg-slate-800/30 transition">
                              <td className="px-4 py-3 font-mono text-slate-500 font-bold">
                                {chan.number}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center space-x-3">
                                  <img 
                                    src={chan.logo} 
                                    alt={chan.name} 
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?w=80&h=80&fit=crop&q=80';
                                    }}
                                    className="w-8 h-8 rounded-lg object-cover bg-slate-950 border border-slate-800/80 shrink-0"
                                  />
                                  <div className="min-w-0 max-w-md">
                                    <p className="font-bold text-white truncate">{chan.name}</p>
                                    <p className="text-[10px] text-slate-500 truncate select-all">{chan.url}</p>
                                    {chan.tags && chan.tags.length > 0 && (
                                      <div className="flex flex-wrap gap-1 mt-1">
                                        {chan.tags.map(tag => (
                                          <span key={tag} className="text-[8px] bg-slate-950 text-indigo-400 border border-slate-800 px-1 rounded font-mono font-semibold">
                                            #{tag}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3 font-semibold text-slate-300">
                                {chan.category}
                              </td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  chan.isPremium ? 'bg-amber-950 text-amber-400 border border-amber-900' : 'bg-slate-950 text-slate-400 border border-slate-800'
                                }`}>
                                  {chan.isPremium ? 'Premium' : 'Free'}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <span className={`w-2.5 h-2.5 rounded-full inline-block ${chan.isActive ? 'bg-emerald-500' : 'bg-slate-600'}`}></span>
                              </td>
                              <td className="px-4 py-3 text-right space-x-2">
                                <button 
                                  onClick={() => setEditingChannel(chan)}
                                  className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 inline-block"
                                  title="Edit"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => handleDeleteChannel(chan.id)}
                                  className="text-rose-400 hover:text-rose-200 p-1 rounded hover:bg-rose-950/60 inline-block"
                                  title="Delete"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}


                {/* SUBTAB 4. USER MANAGER */}
                {adminSubTab === 'users' && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-white mb-2 flex items-center space-x-2">
                      <Users className="w-4 h-4 text-purple-400" />
                      <span>Registered system profiles</span>
                    </h3>

                    {/* USER EDITOR DRAWER */}
                    {editingUser && (
                      <div className="bg-slate-900 border border-purple-900 rounded-2xl p-5 space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                          <h4 className="text-xs uppercase font-bold text-purple-400">Edit User Status: {editingUser.username}</h4>
                          <button onClick={() => setEditingUser(null)} className="text-slate-400 hover:text-white">×</button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div>
                            <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">Role Type</label>
                            <select 
                              value={editingUser.role || 'user'} 
                              onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value as 'admin' | 'user' })}
                              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                            >
                              <option value="user">User (Standard)</option>
                              <option value="admin">Administrator (Superuser)</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">Status Restriction</label>
                            <select 
                              value={editingUser.isBanned ? 'banned' : 'active'} 
                              onChange={(e) => setEditingUser({ ...editingUser, isBanned: e.target.value === 'banned' })}
                              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                            >
                              <option value="active">Active (Access Allowed)</option>
                              <option value="banned">Banned (Forbidden access)</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">Premium Switch</label>
                            <select 
                              value={editingUser.premiumStatus ? 'premium' : 'free'} 
                              onChange={(e) => {
                                const isPrem = e.target.value === 'premium';
                                setEditingUser({ 
                                  ...editingUser, 
                                  premiumStatus: isPrem,
                                  premiumExpiryDate: isPrem ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : null
                                });
                              }}
                              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                            >
                              <option value="free">Free Status</option>
                              <option value="premium">Premium Status</option>
                            </select>
                          </div>

                          {editingUser.premiumStatus && (
                            <div>
                              <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">Premium Expiry Date</label>
                              <input 
                                type="datetime-local" 
                                value={editingUser.premiumExpiryDate ? new Date(editingUser.premiumExpiryDate).toISOString().slice(0, 16) : ''} 
                                onChange={(e) => setEditingUser({ ...editingUser, premiumExpiryDate: new Date(e.target.value).toISOString() })}
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                              />
                            </div>
                          )}
                        </div>

                        <div className="flex justify-end space-x-2.5">
                          <button 
                            onClick={() => setEditingUser(null)}
                            className="bg-slate-800 text-slate-400 text-xs px-4 py-2 rounded-xl hover:text-white"
                          >
                            Cancel
                          </button>
                          <button 
                            onClick={() => handleUpdateUser(editingUser)}
                            className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs px-5 py-2 rounded-xl transition"
                          >
                            Confirm Updates
                          </button>
                        </div>
                      </div>
                    )}

                    {/* TABLE OF USERS */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl max-h-[500px] overflow-y-auto">
                      <table className="w-full text-left text-xs text-slate-300">
                        <thead className="bg-slate-950 text-[10px] text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800">
                          <tr>
                            <th className="px-4 py-3">Profile</th>
                            <th className="px-4 py-3">Access Level</th>
                            <th className="px-4 py-3">Premium Details</th>
                            <th className="px-4 py-3">Audit Logs</th>
                            <th className="px-4 py-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/80">
                          {adminUsers.map((userObj) => (
                            <tr key={userObj.id} className="hover:bg-slate-800/30 transition">
                              <td className="px-4 py-3">
                                <p className="font-bold text-white">{userObj.username}</p>
                                <p className="text-[10px] text-slate-500 truncate">{userObj.email}</p>
                              </td>
                              <td className="px-4 py-3">
                                <div className="space-y-1">
                                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                                    userObj.role === 'admin' ? 'bg-purple-950 text-purple-400 border border-purple-900' : 'bg-slate-950 text-slate-400 border border-slate-800'
                                  }`}>
                                    {userObj.role}
                                  </span>
                                  {userObj.isBanned && (
                                    <span className="block text-[9px] font-bold text-rose-500">
                                      Banned Account
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                {userObj.premiumStatus ? (
                                  <div className="space-y-0.5 text-xs">
                                    <p className="text-emerald-400 font-bold">Active</p>
                                    <p className="text-[9px] text-slate-500">Exp: {userObj.premiumExpiryDate ? new Date(userObj.premiumExpiryDate).toLocaleDateString() : 'Lifetime'}</p>
                                  </div>
                                ) : (
                                  <span className="text-slate-500 text-xs font-semibold">Free Member</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-slate-400 text-[10px] space-y-0.5">
                                <p><strong>IP:</strong> {userObj.lastLoginIp || 'No logins'}</p>
                                <p><strong>Device:</strong> {userObj.lastLoginDevice ? userObj.lastLoginDevice.substring(0, 30) : 'N/A'}</p>
                              </td>
                              <td className="px-4 py-3 text-right space-x-2">
                                <button 
                                  onClick={() => setEditingUser(userObj)}
                                  className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 inline-block"
                                  title="Edit User"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => handleDeleteUser(userObj.id)}
                                  className="text-rose-400 hover:text-rose-200 p-1 rounded hover:bg-rose-950 inline-block"
                                  title="Delete User"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}


                {/* SUBTAB 5. PLATFORM CONFIGURATION SETTINGS */}
                {adminSubTab === 'settings' && appSettings && (
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
                    <h3 className="text-sm font-bold text-white border-b border-slate-800 pb-2">
                      Edit Global StreamVault settings parameters
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Site Name</label>
                        <input 
                          id="settings_site_name"
                          type="text" 
                          defaultValue={appSettings.siteName}
                          onBlur={(e) => handleSaveSettings({ siteName: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-purple-600"
                        />
                        <p className="text-[10px] text-slate-500 mt-1">Saves automatically when you click outside the input field.</p>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Site Logo Icon (URL)</label>
                        <input 
                          id="settings_site_logo"
                          type="text" 
                          defaultValue={appSettings.siteLogo}
                          onBlur={(e) => handleSaveSettings({ siteLogo: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-purple-600"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">M3U Playlist URL (GitHub raw playlist source)</label>
                        <input 
                          id="settings_playlist"
                          type="text" 
                          defaultValue={appSettings.playlistUrl}
                          onBlur={(e) => handleSaveSettings({ playlistUrl: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-purple-600"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">bKash Personal Number</label>
                        <input 
                          id="settings_payment_num"
                          type="text" 
                          defaultValue={appSettings.paymentNumber}
                          onBlur={(e) => handleSaveSettings({ paymentNumber: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-purple-600"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Support Contact Email</label>
                        <input 
                          id="settings_contact_email"
                          type="email" 
                          defaultValue={appSettings.contactEmail}
                          onBlur={(e) => handleSaveSettings({ contactEmail: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-purple-600"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Support Phone Number</label>
                        <input 
                          id="settings_support_phone"
                          type="text" 
                          defaultValue={appSettings.supportPhone || ''}
                          onBlur={(e) => handleSaveSettings({ supportPhone: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-purple-600"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Announcement Banner text</label>
                        <textarea 
                          id="settings_announcement"
                          defaultValue={appSettings.announcementBanner}
                          onBlur={(e) => handleSaveSettings({ announcementBanner: e.target.value })}
                          rows={3}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs text-white focus:outline-none focus:border-purple-600 resize-none"
                        />
                      </div>

                      <div className="bg-slate-950 border border-slate-800 rounded-xl p-4.5 flex items-center justify-between md:col-span-2">
                        <div>
                          <p className="text-xs font-bold text-white">Maintenance Mode Status</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">Toggle maintenance warning alerts globally for standard users.</p>
                        </div>
                        <button 
                          onClick={() => handleSaveSettings({ maintenanceMode: !appSettings.maintenanceMode })}
                          className="text-purple-400 hover:text-purple-300 transition"
                        >
                          {appSettings.maintenanceMode ? (
                            <ToggleRight className="w-10 h-10 text-purple-500" />
                          ) : (
                            <ToggleLeft className="w-10 h-10 text-slate-600" />
                          )}
                        </button>
                      </div>

                      {/* GITHUB AUTO-SYNC AND PERSISTENCE PANEL */}
                      <div className="border border-indigo-900/60 bg-gradient-to-br from-indigo-950/20 to-slate-950 p-5 rounded-xl md:col-span-2 space-y-4">
                        <div className="flex items-center space-x-2 border-b border-indigo-950 pb-2">
                          <Globe className="w-4 h-4 text-indigo-400" />
                          <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-300">GitHub Auto-Sync Persistence (For Render Cloud Hosting)</h4>
                        </div>
                        <p className="text-[10px] leading-relaxed text-slate-400">
                          Since Render’s free tier filesystem resets on sleep or restarts, configure your GitHub repository below to synchronize your database in real-time. Whenever users, channels, or settings are updated, StreamVault will commit and push the updated JSON files directly to your repo, preventing any data loss!
                        </p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">GitHub PAT (Access Token)</label>
                            <input 
                              type="password" 
                              placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                              defaultValue={appSettings.githubToken}
                              onBlur={(e) => handleSaveSettings({ githubToken: e.target.value })}
                              className="w-full bg-slate-950 border border-slate-850 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-600"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">GitHub Repository</label>
                            <input 
                              type="text" 
                              placeholder="username/repo-name"
                              defaultValue={appSettings.githubRepo}
                              onBlur={(e) => handleSaveSettings({ githubRepo: e.target.value })}
                              className="w-full bg-slate-950 border border-slate-850 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-600"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Branch Name</label>
                            <input 
                              type="text" 
                              placeholder="main"
                              defaultValue={appSettings.githubBranch || 'main'}
                              onBlur={(e) => handleSaveSettings({ githubBranch: e.target.value })}
                              className="w-full bg-slate-950 border border-slate-850 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-600"
                            />
                          </div>
                        </div>
                      </div>

                      {/* MANUAL BACKUP AND RESTORE PANEL */}
                      <div className="border border-slate-800 bg-slate-950 p-5 rounded-xl md:col-span-2 space-y-4">
                        <div className="flex items-center space-x-2 border-b border-slate-850 pb-2">
                          <Activity className="w-4 h-4 text-emerald-400" />
                          <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400">Manual Data Backup & Restore</h4>
                        </div>
                        <p className="text-[10px] leading-relaxed text-slate-400">
                          Export your database as a consolidated backup JSON file, or restore a previously saved backup to reload all your accounts, custom channels, and settings.
                        </p>

                        <div className="flex flex-wrap gap-3">
                          <button 
                            type="button"
                            onClick={handleExportBackup}
                            className="inline-flex items-center space-x-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-white font-semibold text-xs px-4 py-2 rounded-lg transition cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5 rotate-45 text-emerald-400" />
                            <span>Export Backup JSON</span>
                          </button>

                          <label className="inline-flex items-center space-x-1.5 bg-emerald-950 hover:bg-emerald-900 border border-emerald-800 text-emerald-300 font-semibold text-xs px-4 py-2 rounded-lg transition cursor-pointer select-none">
                            <Plus className="w-3.5 h-3.5 text-emerald-300" />
                            <span>Import & Restore Backup</span>
                            <input 
                              type="file" 
                              accept=".json" 
                              onChange={handleImportBackup} 
                              className="hidden" 
                            />
                          </label>
                        </div>
                      </div>

                    </div>
                  </div>
                )}

                {/* SUBTAB 6. ADMIN CUSTOM NOTIFICATIONS SENDER */}
                {adminSubTab === 'notifications' && (
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
                    <div className="flex items-center space-x-2 border-b border-slate-800 pb-2">
                      <Bell className="w-5 h-5 text-purple-400" />
                      <div>
                        <h3 className="text-sm font-bold text-white">
                          Dispatch Custom Notifications
                        </h3>
                        <p className="text-[10px] text-slate-500">Send custom push-style announcements or specific direct alerts to any user profiles instantly.</p>
                      </div>
                    </div>

                    <form onSubmit={handleSendAdminNotification} className="space-y-4 max-w-2xl">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Target Audience</label>
                          <select
                            value={notifTargetType}
                            onChange={(e) => setNotifTargetType(e.target.value as 'all' | 'specific')}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-purple-600"
                          >
                            <option value="all">Broadcast to All Registered Users</option>
                            <option value="specific">Direct to Specific Username</option>
                          </select>
                        </div>

                        {notifTargetType === 'specific' && (
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Target Username</label>
                            <input
                              type="text"
                              placeholder="e.g. faysa1"
                              value={notifTargetUsername}
                              onChange={(e) => setNotifTargetUsername(e.target.value)}
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-purple-600"
                              required
                            />
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Notification Theme / Color</label>
                          <select
                            value={notifType}
                            onChange={(e) => setNotifType(e.target.value as any)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-purple-600"
                          >
                            <option value="info">Info (Blue Vibe)</option>
                            <option value="warning">Warning (Yellow/Orange Vibe)</option>
                            <option value="success">Success (Green Vibe)</option>
                            <option value="danger">Danger (Red Alert Vibe)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Brief Title Header</label>
                          <input
                            type="text"
                            placeholder="e.g. Premium Subscription Active! 🏆"
                            value={notifTitle}
                            onChange={(e) => setNotifTitle(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-purple-600"
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Main Notification Message Context</label>
                        <textarea
                          placeholder="Type details of your custom administrative message here..."
                          value={notifMessage}
                          onChange={(e) => setNotifMessage(e.target.value)}
                          rows={4}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs text-white focus:outline-none focus:border-purple-600 resize-none"
                          required
                        />
                      </div>

                      <div className="flex justify-end pt-2">
                        <button
                          type="submit"
                          disabled={sendingNotif}
                          className="inline-flex items-center space-x-2 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-800 text-white font-bold text-xs px-6 py-2.5 rounded-xl transition cursor-pointer shadow-lg shadow-purple-950/40"
                        >
                          {sendingNotif ? (
                            <span>Dispatching Alert...</span>
                          ) : (
                            <>
                              <Send className="w-3.5 h-3.5" />
                              <span>Dispatch System Alert</span>
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  </div>
                )}

              </div>
            )}

          </main>

          {/* MOBILE BOTTOM NAVIGATION BAR */}
          <div className="md:hidden flex items-center justify-around bg-slate-900 border-t border-slate-800 py-2 px-1 text-[10px] text-slate-400 select-none z-40 shrink-0">
            <button 
              onClick={() => setActiveTab('player')}
              className={`flex flex-col items-center space-y-1 py-1 px-3 rounded-lg transition ${activeTab === 'player' ? 'text-indigo-400 font-bold bg-indigo-950/40' : 'text-slate-400'}`}
            >
              <Radio className="w-5 h-5" />
              <span>Live Hub</span>
            </button>
            <button 
              onClick={() => setActiveTab('favourite')}
              className={`flex flex-col items-center space-y-1 py-1 px-3 rounded-lg transition ${activeTab === 'favourite' ? 'text-indigo-400 font-bold bg-indigo-950/40' : 'text-slate-400'}`}
            >
              <Heart className="w-5 h-5" />
              <span>Favourites</span>
            </button>
            <button 
              onClick={() => setActiveTab('history')}
              className={`flex flex-col items-center space-y-1 py-1 px-3 rounded-lg transition ${activeTab === 'history' ? 'text-indigo-400 font-bold bg-indigo-950/40' : 'text-slate-400'}`}
            >
              <History className="w-5 h-5" />
              <span>History</span>
            </button>
            <button 
              onClick={() => setActiveTab('premium')}
              className={`flex flex-col items-center space-y-1 py-1 px-3 rounded-lg transition ${activeTab === 'premium' ? 'text-indigo-400 font-bold bg-indigo-950/40' : 'text-slate-400'}`}
            >
              <Award className="w-5 h-5" />
              <span>Premium</span>
            </button>
            <button 
              onClick={() => setActiveTab('support')}
              className={`flex flex-col items-center space-y-1 py-1 px-3 rounded-lg transition ${activeTab === 'support' ? 'text-indigo-400 font-bold bg-indigo-950/40' : 'text-slate-400'}`}
            >
              <HelpCircle className="w-5 h-5" />
              <span>Support</span>
            </button>
            {user?.role === 'admin' && (
              <button 
                onClick={() => setActiveTab('admin')}
                className={`flex flex-col items-center space-y-1 py-1 px-3 rounded-lg transition ${activeTab === 'admin' ? 'text-indigo-400 font-bold bg-indigo-950/40' : 'text-slate-400'}`}
              >
                <Shield className="w-5 h-5" />
                <span>Admin</span>
              </button>
            )}
          </div>

        </div>
      )}

      {/* CHANGE PASSWORD OVERLAY MODAL */}
      {showChangePasswordModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 relative">
            <button 
              onClick={() => {
                setShowChangePasswordModal(false);
                setChangePasswordError(null);
                setChangePasswordSuccess(null);
                setCurrentPasswordInput('');
                setNewPasswordInput('');
                setConfirmPasswordInput('');
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition p-1"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-indigo-950 text-indigo-400 rounded-lg">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Change Account Password</h3>
                <p className="text-[11px] text-slate-400">Update your account credentials securely</p>
              </div>
            </div>

            {changePasswordError && (
              <div className="mb-4 p-3 bg-rose-950/60 border border-rose-900/50 text-rose-300 rounded-xl text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{changePasswordError}</span>
              </div>
            )}

            {changePasswordSuccess && (
              <div className="mb-4 p-3 bg-emerald-950/60 border border-emerald-900/50 text-emerald-300 rounded-xl text-xs flex items-center space-x-2">
                <Check className="w-4 h-4 shrink-0" />
                <span>{changePasswordSuccess}</span>
              </div>
            )}

            <form onSubmit={handleChangePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Current Password</label>
                <input 
                  type="password"
                  value={currentPasswordInput}
                  onChange={(e) => setCurrentPasswordInput(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-600 transition"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">New Password (Min 5 chars)</label>
                <input 
                  type="password"
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-600 transition"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Confirm New Password</label>
                <input 
                  type="password"
                  value={confirmPasswordInput}
                  onChange={(e) => setConfirmPasswordInput(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-600 transition"
                  required
                />
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowChangePasswordModal(false);
                    setChangePasswordError(null);
                    setChangePasswordSuccess(null);
                    setCurrentPasswordInput('');
                    setNewPasswordInput('');
                    setConfirmPasswordInput('');
                  }}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={changePasswordLoading}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  {changePasswordLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <span>Change Password</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
