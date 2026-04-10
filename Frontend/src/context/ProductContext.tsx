import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import api from '../services/api';
import socketService from '../services/socket';

interface Product {
  _id: string;
  name: string;
  barcode: string;
  sellingPrice: number;
  gstRate: number;
  stock: number;
  category: string;
  image?: string;
  weight?: string;
  unitValue?: number;
  unitType?: string;
  discount?: number;
  saleEndDate?: string;
  lowStockThreshold?: number;
  isActive: boolean;
}

interface ProductContextType {
  products: Product[];
  categories: string[];
  loading: boolean;
  fetchProducts: (query?: string, category?: string) => Promise<void>;
  fetchCategories: () => Promise<void>;
  refreshAll: () => Promise<void>;
  productLimit: number;
  usedProducts: number;
  remainingProduct: number;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

export const ProductProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [productLimit, setProductLimit] = useState(0);
  const [usedProducts, setUsedProducts] = useState(0);
  const [remainingProduct, setRemainingProduct] = useState(0);

  // Cross-tab synchronization node
  const syncChannel = React.useMemo(() => new BroadcastChannel('nexus_sync'), []);

  const getRole = useCallback(() => {
    try {
      const rawUser = localStorage.getItem('user');
      const user = rawUser && rawUser !== 'undefined' ? JSON.parse(rawUser) : {};
      return user?.role || localStorage.getItem('role');
    } catch { return null; }
  }, []);

  const fetchProducts = useCallback(async (query = '', category = 'All') => {
    // 🛡️ Nexus Master Guard: SuperAdmin has no business-scoped items
    if (getRole() === 'superadmin') return;

    if (products.length === 0) setLoading(true);
    try {
      const catParam = category !== 'All' ? `&category=${category}` : '';
      const res = await api.get(`/products?name=${query}${catParam}&limit=1000`);
      const payload = res.data?.data || res.data;
      setProducts(Array.isArray(payload) ? payload : []);
      if (res.data?.productLimit !== undefined) {
         setProductLimit(res.data.productLimit);
         setUsedProducts(res.data.usedProducts);
         setRemainingProduct(res.data.remainingProduct);
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setLoading(false);
    }
  }, [getRole]);

  const fetchCategories = useCallback(async () => {
    // 🛡️ Nexus Master Guard
    if (getRole() === 'superadmin') return;

    try {
      const res = await api.get('/products/categories');
      if (res.data?.success) {
        setCategories(res.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  }, [getRole]);

  const refreshAll = useCallback(async (isLocalChange = true) => {
    if (getRole() === 'superadmin') return;

    await Promise.all([fetchProducts(), fetchCategories()]);
    if (isLocalChange) {
      syncChannel.postMessage('FETCH_PRODUCTS');
      syncChannel.postMessage('FETCH_DASHBOARD');
    }
  }, [fetchProducts, fetchCategories, syncChannel]);

  // Subscription Node: Listen for sync events from other tabs/nodes
  useEffect(() => {
    const handleSync = (event: MessageEvent) => {
      if (event.data === 'FETCH_PRODUCTS') {
        console.log('[NexusSync] Signal Received: Re-synchronizing SKU nodes...');
        refreshAll(false); // Do not re-broadcast
      }
    };
    syncChannel.addEventListener('message', handleSync);
    
    // 📡 Global Telemetry: Listen for server-side push notifications
    const handleServerSync = (payload: any) => {
      console.log('📡 [NexusSocket] Product Sync Received:', payload);
      refreshAll(false);
    };
    socketService.on('DATA_SYNC', handleServerSync);
    socketService.connect(); // Ensure socket is active

    // Smart Fetch: Only refresh if last fetch was more than 2 minutes ago or explicitly requested
    const lastFetchRef = { current: 0 };
    const smartRefresh = () => {
      const now = Date.now();
      if (now - lastFetchRef.current > 120000) { // 2 minutes
        lastFetchRef.current = now;
        refreshAll(false);
      }
    };

    // Background Poll: Every 60s to catch server-side external changes
    const pollId = setInterval(smartRefresh, 60000);

    // Focus-based Sync: Refresh when user returns to tab
    const handleFocus = () => smartRefresh();
    window.addEventListener('focus', handleFocus);

    return () => {
      syncChannel.removeEventListener('message', handleSync);
      socketService.off('DATA_SYNC', handleServerSync);
      clearInterval(pollId);
      window.removeEventListener('focus', handleFocus);
    };
  }, [syncChannel, refreshAll]);

  const contextValue = React.useMemo(() => ({
    products,
    categories,
    loading,
    fetchProducts,
    fetchCategories,
    refreshAll,
    productLimit,
    usedProducts,
    remainingProduct
  }), [products, categories, loading, fetchProducts, fetchCategories, refreshAll, productLimit, usedProducts, remainingProduct]);

  return (
    <ProductContext.Provider value={contextValue}>
      {children}
    </ProductContext.Provider>
  );
};

export const useProducts = () => {
  const context = useContext(ProductContext);
  if (context === undefined) {
    throw new Error('useProducts must be used within a ProductProvider');
  }
  return context;
};
