import crypto from 'crypto';

/**
 * Nexus Protocol: Verify Razorpay Payment Signature
 * This utility ensures the payment proof sent from the client node 
 * is cryptographically matched against our private secret.
 */
export const verifyRazorpaySignature = (
  orderId: string,
  paymentId: string,
  signature: string,
  secret: string
): boolean => {
  const body = orderId + "|" + paymentId;
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(body.toString())
    .digest("hex");

  return expectedSignature === signature;
};
