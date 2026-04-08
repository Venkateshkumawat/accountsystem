import mongoose from 'mongoose';
import Product from '../models/Product.js';

/**
 * 🛰️ Generates a unique SKU for a product.
 * Format: CATEGORY-NAME-RANDOM (ELEC-MOBILE-AB12)
 */
export const generateSKU = async (name: string, category: string = 'GEN', businessAdminId: any): Promise<string> => {
  const cleanCategory = category.substring(0, 4).toUpperCase().replace(/[^A-Z]/g, '');
  const cleanName = name.substring(0, 6).toUpperCase().replace(/[^A-Z]/g, '');
  
  let isUnique = false;
  let sku = '';

  while (!isUnique) {
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    sku = `${cleanCategory}-${cleanName}-${random}`;
    
    // Validate uniqueness within the business scope
    const existing = await Product.findOne({ businessAdminId, sku });
    if (!existing) isUnique = true;
  }

  return sku;
};

/**
 * 🛰️ Generates a unique 12-13 digit numeric barcode.
 */
export const generateBarcode = async (businessAdminId: any): Promise<string> => {
  let isUnique = false;
  let barcode = '';

  while (!isUnique) {
    // Generate a random 12-digit number
    barcode = Math.floor(100000000000 + Math.random() * 900000000000).toString();
    
    // Validate uniqueness within the business scope
    const existing = await Product.findOne({ businessAdminId, barcode });
    if (!existing) isUnique = true;
  }

  return barcode;
};

/**
 * 🛰️ Retrofit Protocol: Initialize/Force-Sync/Unique-ify all SKU/Barcode nodes
 * This will force all existing barcodes to the new 12-digit numeric format.
 */
export const initializeExistingProducts = async (): Promise<void> => {
  try {
    const products = await Product.find({});
    console.log(`🛰️ Nexus Protocol: Auditing ${products.length} operational nodes for data integrity...`);

    let syncCount = 0;
    let orphanCount = 0;

    for (const p of products) {
      // 🕵️ Orphan Node Detection
      if (!p.businessAdminId || !p.businessId) {
        console.warn(`⚠️ Nexus Orphan Alert: Product [${p.name}] found without Business Context. Internal Registry cannot index this node.`);
        orphanCount++;
        continue;
      }

      let needsUpdate = false;

      // 1. Force Synchronization: SKU (Ensure format and uniqueness)
      if (!p.sku || p.sku === "") {
        p.sku = await generateSKU(p.name, p.category || 'GEN', p.businessAdminId.toString());
        needsUpdate = true;
      } else {
        const skuExists = await Product.findOne({
          businessAdminId: p.businessAdminId,
          sku: p.sku.toUpperCase(),
          _id: { $ne: p._id }
        });
        if (skuExists || p.sku !== p.sku.toUpperCase()) {
          p.sku = skuExists ? await generateSKU(p.name, p.category || 'GEN', p.businessAdminId.toString()) : p.sku.toUpperCase();
          needsUpdate = true;
        }
      }

      // 2. Force Synchronization: Barcode (Mandatory 12-digit numeric conversion)
      // Check if current barcode is numeric and 12-digits
      const isNumeric12 = /^\d{12}$/.test(p.barcode || "");
      
      if (!isNumeric12) {
        // Force regenerate to match new 🛰️ Nexus standard
        p.barcode = await generateBarcode(p.businessAdminId.toString());
        needsUpdate = true;
      } else {
        // Still check for uniqueness even if it's 12-digits
        const barcodeExists = await Product.findOne({
          businessAdminId: p.businessAdminId,
          barcode: p.barcode,
          _id: { $ne: p._id }
        });
        if (barcodeExists) {
          p.barcode = await generateBarcode(p.businessAdminId.toString());
          needsUpdate = true;
        }
      }

      if (needsUpdate) {
        await p.save();
        syncCount++;
      }
    }

    if (syncCount > 0) {
      console.log(`🛰️ Nexus Protocol: ${syncCount} operational nodes successfully aligned with 12-digit barcode standard.`);
    } else {
      console.log(`🛰️ Nexus Protocol: All operational nodes verified for 100% data integrity.`);
    }
  } catch (error) {
    console.error("🛰️ Nexus Retrofit Failure:", error);
  }
};
