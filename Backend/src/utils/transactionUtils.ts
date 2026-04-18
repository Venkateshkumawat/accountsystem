import mongoose from 'mongoose';

/**
 * 🛰️ Generates a unique, audit-compliant Transaction ID.
 * Pattern: TXN-YYYYMMDD-[6-DIGIT-RANDOM]
 * Example: TXN-20260418-A7F23K
 */
export const generateTransactionId = async (model: any, businessAdminId: string): Promise<string> => {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  
  // Find the latest transaction of the day for this business
  // We sort by transactionId to get the highest sequence
  const latestTxn = await model.findOne({ 
    businessAdminId, 
    transactionId: { $regex: new RegExp(`^TXN-${dateStr}-`) }
  }).sort({ createdAt: -1 });

  let sequence = 1;
  if (latestTxn && latestTxn.transactionId) {
    const parts = latestTxn.transactionId.split('-');
    if (parts.length >= 3) {
      const lastSeq = parseInt(parts[2], 10);
      if (!isNaN(lastSeq)) {
        sequence = lastSeq + 1;
      }
    }
  }

  const sequenceStr = sequence.toString().padStart(6, '0');
  const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  const txnId = `TXN-${dateStr}-${sequenceStr}-${randomSuffix}`;

  return txnId;
};
