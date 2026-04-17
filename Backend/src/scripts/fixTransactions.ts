import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || '';

async function fixInvoices() {
  try {
    console.log("🚀 Connecting to Nexus Data Node...");
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connection established.");

    const db = mongoose.connection.db;
    if (!db) throw new Error("Database not found");

    // Since it's a multi-tenant system with dynamic models, we use the collection directly
    const invoiceCollection = db.collection('invoices');
    const transactionCollection = db.collection('transactions');

    console.log("🔍 Scanning for legacy Cash/UPI pending invoices...");

    // Update all Cash and UPI invoices that are pending to paid
    const result = await invoiceCollection.updateMany(
      { 
        paymentStatus: 'pending',
        paymentMethod: { $in: ['cash', 'CASH', 'upi', 'UPI'] }
      },
      { 
        $set: { paymentStatus: 'paid' } 
      }
    );

    console.log(`✅ Alignment Complete: ${result.modifiedCount} invoices stabilized to 'paid'.`);

    // Also update associated transactions
    const transResult = await transactionCollection.updateMany(
      { 
        paymentStatus: 'pending',
        paymentMethod: { $in: ['cash', 'CASH', 'upi', 'UPI'] }
      },
      { 
        $set: { paymentStatus: 'paid' } 
      }
    );

    console.log(`✅ Transaction Ledger Sync: ${transResult.modifiedCount} nodes updated.`);

  } catch (error) {
    console.error("❌ Node Alignment Failure:", error);
  } finally {
    await mongoose.disconnect();
    console.log("👋 Nexus Data Node disconnected.");
    process.exit(0);
  }
}

fixInvoices();
