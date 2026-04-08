import { IOffer } from "../models/Offer.js";

interface OfferResult {
  finalPrice: number;
  discount: number;
  freeQty: number;
  appliedOfferType: string | null;
  badge: string | null;
}

/**
 * High-Performance Offer Processor for Nexus POS
 * Implements Bulk Slabs and B2G1 (Buy 2 Get 1 Free) logic.
 */
export const applyOffer = (qty: number, price: number, offers: IOffer[]): OfferResult => {
  let bestResult: OfferResult = {
    finalPrice: price * qty,
    discount: 0,
    freeQty: 0,
    appliedOfferType: null,
    badge: null
  };

  const now = new Date();

  // Filter active and valid offers
  const activeOffers = offers.filter(o => 
    o.isActive && 
    new Date(o.startDate) <= now && 
    new Date(o.endDate) >= now
  );

  for (const offer of activeOffers) {
    let currentResult: OfferResult = { ...bestResult };

    if (offer.type === 'BULK') {
      // BULK DISCOUNT SLABS:
      // 25+ → 5%, 50+ → 10%, 75+ → 15%, 100+ → 20%
      let discountPercent = 0;
      if (qty >= 100) discountPercent = 20;
      else if (qty >= 75) discountPercent = 15;
      else if (qty >= 50) discountPercent = 10;
      else if (qty >= 25) discountPercent = 5;

      if (discountPercent > 0) {
        const totalBeforeDiscount = qty * price;
        const discountAmount = (totalBeforeDiscount * discountPercent) / 100;
        currentResult = {
          finalPrice: totalBeforeDiscount - discountAmount,
          discount: discountAmount,
          freeQty: 0,
          appliedOfferType: 'BULK',
          badge: `BULK ${discountPercent}% OFF`
        };
      }
    } 
    else if (offer.type === 'B2G1') {
      // BUY 2 GET 1 FREE Logic:
      // For every 2 items → 1 free (Total 3, pay for 2)
      // freeQty = floor(qty / 3)
      const free = Math.floor(qty / 3);
      const chargeable = qty - free;
      const discount = free * price;
      
      currentResult = {
        finalPrice: chargeable * price,
        discount: discount,
        freeQty: free,
        appliedOfferType: 'B2G1',
        badge: `B2G1 ACTIVE (${free} FREE)`
      };
    }
    else if (offer.type === 'PERCENTAGE') {
        const discount = (qty * price * offer.value) / 100;
        currentResult = {
            finalPrice: (qty * price) - discount,
            discount: discount,
            freeQty: 0,
            appliedOfferType: 'PERCENTAGE',
            badge: `${offer.value}% OFF`
        };
    }
    else if (offer.type === 'FLAT') {
        const discount = offer.value;
        currentResult = {
            finalPrice: (qty * price) - discount,
            discount: discount,
            freeQty: 0,
            appliedOfferType: 'FLAT',
            badge: `₹${offer.value} OFF`
        };
    }

    // Capture the best offer (highest discount value)
    if (currentResult.discount > bestResult.discount) {
      bestResult = currentResult;
    }
  }

  return bestResult;
};
