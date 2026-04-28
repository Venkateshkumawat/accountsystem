import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import api from '../services/api';
import { io } from 'socket.io-client';

export interface INotification {
  _id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  category: 'product' | 'invoice' | 'payment' | 'alert' | 'staff';
  isRead: boolean;
  link?: string;
  businessId?: string;
  createdAt: string;
}

interface NotificationContextType {
  notifications: INotification[];
  unreadCount: number;
  loading: boolean;
  notifySuccess: (msg: string) => void;
  notifyError: (msg: string) => void;
  notifyInfo: (msg: string) => void;
  fetchNotifications: (retryCount?: number) => Promise<void>;
  loadMore: () => Promise<void>;
  hasMore: boolean;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  deleteAllNotifications: () => Promise<void>;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  volume: number;
  setVolume: (vol: number) => void;
  playNotificationSound: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const [notifications, setNotifications] = useState<INotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Audio Alert Protocol
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const saved = localStorage.getItem('bb_sound_enabled');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [volume, setVolume] = useState(() => {
    const saved = localStorage.getItem('bb_sound_volume');
    return saved !== null ? JSON.parse(saved) : 0.5;
  });

  const playNotificationSound = useCallback(() => {
    if (!soundEnabled) return;
    console.log("🔊 [NexusAudio] Attempting to play notification sound...");
    try {
      const audio = new Audio('/notification.mp3');
      audio.volume = volume;
      audio.play().catch(() => {
        // Fallback to Pixabay Happy Message Ping
        const pixabayAudio = new Audio('https://cdn.pixabay.com/audio/2023/10/16/audio_f835016503.mp3');
        pixabayAudio.volume = volume;
        pixabayAudio.play().catch(e => console.warn('[NexusAudio] Cloud playback blocked.', e));
      });
    } catch (err) {
      console.warn('[NexusAudio] Sound node initialization failure.', err);
    }
  }, [soundEnabled, volume]);

  useEffect(() => {
    localStorage.setItem('bb_sound_enabled', JSON.stringify(soundEnabled));
  }, [soundEnabled]);

  useEffect(() => {
    localStorage.setItem('bb_sound_volume', JSON.stringify(volume));
  }, [volume]);

  const syncChannel = new BroadcastChannel('nexus_sync');

  const notifySuccess = (msg: string) => {
    playNotificationSound();
    toast.success(msg, {
      className: " font-black text-[11px] uppercase tracking-widest rounded-2xl border border-emerald-500 bg-emerald-50 text-emerald-700",
    });
  };

  const notifyError = (msg: string) => {
    playNotificationSound();
    toast.error(msg, {
      className: " font-black text-[11px] uppercase tracking-widest rounded-2xl border border-rose-500 bg-rose-50 text-rose-700",
    });
  };

  const notifyInfo = (msg: string) => {
    playNotificationSound();
    toast(msg, {
      className: " font-black text-[11px] uppercase tracking-widest rounded-2xl border border-indigo-500 bg-indigo-50 text-indigo-700",
    });
  };

  const fetchNotifications = async (retryCount = 0) => {
    if (retryCount === 0) setLoading(true);
    try {
      const response = await api.get('/notifications?page=1&limit=20');
      if (response.data.success) {
        setNotifications(response.data.notifications);
        setUnreadCount(response.data.unreadCount);
        setTotalPages(response.data.pages);
        setPage(1);
      }
    } catch (error) {
      console.error(`[NexusSync] Alert sync failed (Attempt ${retryCount + 1}):`, error);
      if (retryCount < 2) {
        // Retry after 3 seconds for initial boot synchronization
        setTimeout(() => fetchNotifications(retryCount + 1), 3000);
      }
    } finally {
      if (retryCount >= 2 || !loading) setLoading(false);
    }
  };

  const loadMore = async () => {
    if (loading || page >= totalPages) return;
    setLoading(true);
    try {
      const nextPage = page + 1;
      const response = await api.get(`/notifications?page=${nextPage}&limit=20`);
      if (response.data.success) {
        setNotifications(prev => [...prev, ...response.data.notifications]);
        setPage(nextPage);
      }
    } catch (error) {
      console.error("Failed to load more alerts:", error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    // 🚀 Optimistic UI Node
    setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));

    try {
      await api.patch(`/notifications/${id}/read`);
    } catch (error) {
      console.error("Failed to decommission alert node:", error);
      // Optional: Rollback if critical, but for notifications we usually just log it.
    }
  };

  const markAllAsRead = async () => {
    // 🚀 Optimistic UI Node
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnreadCount(0);

    try {
      await api.patch('/notifications/read-all');
    } catch (error) {
      console.error("Failed to purge alert cache:", error);
    }
  };

  const deleteNotification = async (id: string) => {
    const target = notifications.find(n => n._id === id);
    setNotifications(prev => prev.filter(n => n._id !== id));
    if (target && !target.isRead) {
      setUnreadCount(prev => Math.max(0, prev - 1));
    }

    try {
      await api.delete(`/notifications/${id}`);
    } catch (error) {
      console.error("Failed to purge audit node:", error);
    }
  };

  const deleteAllNotifications = async () => {
    const backup = [...notifications];
    setNotifications([]);
    setUnreadCount(0);

    try {
      await api.delete('/notifications/delete-all');
    } catch (error) {
      setNotifications(backup);
      console.error("Failed to mass purge registry:", error);
    }
  };

  useEffect(() => {
    // 📡 Nexus Protocol: Initialize Real-time Telemetry Node
    const apiBase = import.meta.env.VITE_API_BASE_URL || 'https://account-billing-system.onrender.com/api';
    const socketUrl = apiBase.replace(/\/api$/, '');
    const newSocket = io(socketUrl, {
      transports: ["polling", "websocket"],
      withCredentials: true
    });

    const checkAuthAndSubscribe = () => {
      const token = localStorage.getItem('token');
      const rawUser = localStorage.getItem('user');
      let user = null;
      try {
        if (rawUser && rawUser !== 'undefined' && rawUser !== 'null') {
          user = JSON.parse(rawUser);
        }
      } catch (e) {
        console.warn('[NexusAuth] Identity segment corrupted, purging...', e);
      }

      if (token && user) {
        const room = user.role === 'superadmin' ? 'superadmin' : (user.businessObjectId || user.businessId);
        if (room) {
          newSocket.emit('join-room', room);
        }
        fetchNotifications();
      }
    };

    checkAuthAndSubscribe();

    newSocket.on('notification-received', (notification: INotification) => {
      console.log(`📡 Nexus Protocol: Real-time Alert Decoded [${notification._id}]`);

      // Prepend to top
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);
      
      // 🔊 Always play sound for any incoming notification
      playNotificationSound();

      // 🛡️ User Preference Enforcement (Settings Panel)
      let shouldToast = true;
      try {
        const savedConfig = localStorage.getItem('bb_alerts');
        if (savedConfig) {
          const config = JSON.parse(savedConfig);
          const msg = notification.message.toLowerCase();
          const cat = notification.category;

          // Only skip toast if explicitly disabled in config
          if (cat === 'product' && msg.includes('low') && config.lowStock === false) shouldToast = false;
          if (cat === 'invoice' && config.invoicePaid === false) shouldToast = false;
          if (cat === 'staff' && config.newStaffLogin === false) shouldToast = false;
        }
      } catch (e) {
        console.warn("Failed to parse alert preferences.");
      }

      // Toast Alert Strategy
      if (shouldToast) {
        if (notification.type === 'error') notifyError(notification.message);
        else if (notification.type === 'success') notifySuccess(notification.message);
        else notifyInfo(notification.message);
      }
    });

    // 📡 Nexus Global Sync: Multi-partition signaling
    newSocket.on('DATA_SYNC', (signal: { type: string }) => {
      if (signal.type === 'PRODUCT' || signal.type === 'INVOICE') {
        syncChannel.postMessage('FETCH_PRODUCTS');
      }
      if (signal.type === 'PLAN_UPDATE') {
        syncChannel.postMessage('FETCH_PLAN');
      }
    });

    // Offer Pulse Sync
    newSocket.on('OFFER_CREATED', () => syncChannel.postMessage('FETCH_OFFERS'));
    newSocket.on('OFFER_UPDATED', () => syncChannel.postMessage('FETCH_OFFERS'));
    newSocket.on('OFFER_DELETED', () => syncChannel.postMessage('FETCH_OFFERS'));

    window.addEventListener('storage', checkAuthAndSubscribe);
    return () => {
      newSocket.disconnect();
      syncChannel.close();
      window.removeEventListener('storage', checkAuthAndSubscribe);
    };
  }, []);

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      loading,
      notifySuccess,
      notifyError,
      notifyInfo,
      fetchNotifications,
      loadMore,
      hasMore: page < totalPages,
      markAsRead,
      markAllAsRead,
      deleteNotification,
      deleteAllNotifications,
      soundEnabled,
      setSoundEnabled,
      volume,
      setVolume,
      playNotificationSound
    }}>
      <Toaster position="top-right" reverseOrder={false} />
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotify = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotify must be used within NotificationProvider');
  return context;
};
