export interface CartItem {
  productId: string;
  name: string;
  barcode: string;
  sellingPrice: number;
  gstRate: number;
  qty: number;
  discount: number; // Flat discount per unit
}

export interface ProductForCart {
  _id: string;
  name: string;
  barcode: string;
  sellingPrice: number;
  gstRate: number;
}
