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
  const [loading, setLoading] = useState(true);
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

  const fetchProducts = useCallback(async (query = '', category = 'All', showLoader = false) => {
    // 🛡️ Nexus Master Guard: SuperAdmin has no business-scoped items
    if (getRole() === 'superadmin') return;

    if (showLoader) setLoading(true);
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

  const lastFetchRef = React.useRef(0);
  const fetchingRef = React.useRef(false);

  const refreshAll = useCallback(async (isLocalChange = true) => {
    if (getRole() === 'superadmin') return;
    if (fetchingRef.current) return; // 🛑 Lock: Already provisioning

    fetchingRef.current = true;
    try {
      await Promise.all([fetchProducts(), fetchCategories()]);
      if (isLocalChange) {
        syncChannel.postMessage('FETCH_PRODUCTS');
        syncChannel.postMessage('FETCH_DASHBOARD');
      }
      lastFetchRef.current = Date.now();
    } finally {
      fetchingRef.current = false;
    }
  }, [fetchProducts, fetchCategories, syncChannel, getRole]);

  useEffect(() => {
    const handleSync = (event: MessageEvent) => {
      // Selective Sync Node: Only refresh products if relevant
      if (event.data === 'FETCH_PRODUCTS') {
        fetchProducts();
      }
    };
    syncChannel.addEventListener('message', handleSync);
    
    // Server Sync Node: Throttled response to global updates
    const handleServerSync = (payload: any) => {
        // Optimization: Only refresh if the payload confirms it's a product-affecting event
        // Defaulting to limited refresh if unclear
        fetchProducts(undefined, undefined, false);
    };
    socketService.on('DATA_SYNC', handleServerSync);
    socketService.connect();

    const smartRefresh = () => {
      const now = Date.now();
      // Increase threshold to 5 minutes to prevent focus-induced lag
      if (now - lastFetchRef.current > 300000) { 
        refreshAll(false);
      }
    };

    const pollId = setInterval(smartRefresh, 300000); // 5 minute polling
    const handleFocus = () => smartRefresh();
    window.addEventListener('focus', handleFocus);

    return () => {
      syncChannel.removeEventListener('message', handleSync);
      socketService.off('DATA_SYNC', handleServerSync);
      clearInterval(pollId);
      window.removeEventListener('focus', handleFocus);
    };
  }, [syncChannel, fetchProducts, refreshAll]);


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
