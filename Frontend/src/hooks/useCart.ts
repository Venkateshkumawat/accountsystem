import { useState, useMemo } from "react";

export interface CartItem {
  productId: string;
  name: string;
  barcode: string;
  sellingPrice: number;
  gstRate: number;
  qty: number;
  discount: number; // Flat ₹ discount per unit
  unitValue?: number;
  unitType?: string;
  category?: string;
  stock: number;
  saleEndDate?: string;
}

/**
 * NexusBill POS Hook: useCart
 * Custom hook to manage the billing cart state and real-time calculations.
 */
export const useCart = () => {
  const [cart, setCart] = useState<CartItem[]>([]);

  // 1. Add item to cart (or increment if exists)
  const addItem = (product: any) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product._id);
      if (existing) {
        if (existing.qty >= (product.stock || 0)) {
          alert(`Maximum stock reached for ${product.name} (Limit: ${product.stock})`);
          return prev;
        }
        return prev.map((item) =>
          item.productId === product._id ? { ...item, qty: item.qty + 1 } : item
        );
      }

      // Calculate initial discount (only if sale is active)
      let initialDiscount = product.discount || 0;
      if (product.saleEndDate && new Date(product.saleEndDate).setHours(23, 59, 59, 999) < Date.now()) {
        initialDiscount = 0;
      }

      return [
        ...prev,
        {
          productId: product._id,
          name: product.name,
          barcode: product.barcode || "",
          sellingPrice: product.sellingPrice,
          gstRate: product.gstRate || 0,
          qty: 1,
          discount: initialDiscount,
          unitValue: product.unitValue || 1,
          unitType: product.unitType || 'unit',
          category: product.category || '',
          stock: product.stock || 0,
          saleEndDate: product.saleEndDate,
        },
      ];
    });
  };

  // 2. Remove item from cart
  const removeItem = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  };

  // 3. Update Quantity (min 1)
  const updateQty = (productId: string, qty: number) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.productId === productId) {
          const newQty = Math.max(1, qty);
          if (newQty > (item.stock || 0)) {
            alert(`Insufficient stock. Current limit for ${item.name} is ${item.stock || 0}`);
            return item;
          }
          return { ...item, qty: newQty };
        }
        return item;
      })
    );
  };

  // 4. Apply Flat Discount per unit
  const applyDiscount = (productId: string, discount: number) => {
    const safeDiscount = Math.max(0, discount);
    setCart((prev) =>
      prev.map((item) => (item.productId === productId ? { ...item, discount: safeDiscount } : item))
    );
  };

  // 5. Clear Cart
  const clearCart = () => setCart([]);

  // --- COMPUTED TOTALS (useMemo) ---
  const totals = useMemo(() => {
    let subtotal = 0;
    let totalDiscount = 0;
    let totalGST = 0;

    cart.forEach((item) => {
      let itemPrice = item.sellingPrice;
      let itemQty = item.qty;
      let automatedDiscount = 0;
      let freeQty = 0;

      // 1. BUY 2 GET 1 (B2G1) Protocol
      // Logic: floor(itemQty / 3) items are free
      if (itemQty >= 3) {
        freeQty = Math.floor(itemQty / 3);
        automatedDiscount += (freeQty * itemPrice);
      }

      // 2. BULK SLAB Protocol (Applied on non-free chargeable total)
      if (itemQty >= 25 && freeQty === 0) { // Bulk only if not B2G1 (Best Offer strategy)
        let bulkRate = 0;
        if (itemQty >= 100) bulkRate = 0.20;
        else if (itemQty >= 75) bulkRate = 0.15;
        else if (itemQty >= 50) bulkRate = 0.10;
        else if (itemQty >= 25) bulkRate = 0.05;

        const bulkDiscount = (itemPrice * itemQty) * bulkRate;
        if (bulkDiscount > automatedDiscount) {
          automatedDiscount = bulkDiscount;
          freeQty = 0; // Reset freeQty if Bulk is better
        }
      }

      const manualDiscount = (item.discount || 0) * item.qty;
      const finalDiscount = automatedDiscount + manualDiscount;
      
      const itemSubtotal = itemPrice * itemQty;
      const taxableAmount = Math.max(0, itemSubtotal - finalDiscount);
      const itemGST = (taxableAmount * (item.gstRate || 0) / 100);

      subtotal += itemSubtotal;
      totalDiscount += Math.min(itemSubtotal, finalDiscount); // Discount can't exceed subtotal for stats
      totalGST += itemGST;
    });

    const grandTotal = subtotal - totalDiscount + totalGST;

    return {
      subtotal: Number(subtotal.toFixed(2)),
      totalDiscount: Number(totalDiscount.toFixed(2)),
      totalGST: Number(totalGST.toFixed(2)),
      grandTotal: Number(grandTotal.toFixed(2)),
    };
  }, [cart]);

  return {
    cart,
    addItem,
    removeItem,
    updateQty,
    applyDiscount,
    clearCart,
    ...totals,
  };
};
