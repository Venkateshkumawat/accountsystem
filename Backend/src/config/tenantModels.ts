import mongoose, { Connection, Model } from "mongoose";
import User, { IUser, userSchema } from "../models/User.js";
import Business, { IBusiness, businessSchema } from "../models/Business.js";
import Product, { IProduct, productSchema } from "../models/Product.js";
import Invoice, { IInvoice, invoiceSchema } from "../models/Invoice.js";
import Party, { IParty, partySchema } from "../models/Party.js";
import Notification, { INotification, notificationSchema } from "../models/Notification.js";
import Payment, { IPayment, paymentSchema } from "../models/Payment.js";
import Staff, { IStaff, staffSchema } from "../models/Staff.js";
import Activity, { IActivity, activitySchema } from "../models/Activity.js";
import Purchase, { IPurchase, purchaseSchema } from "../models/Purchase.js";
import Transaction, { ITransaction, transactionSchema } from "../models/Transaction.js";
import Offer, { IOffer, offerSchema } from "../models/Offer.js";

export interface TenantModels {
  User: Model<IUser>;
  Business: Model<IBusiness>;
  Product: Model<IProduct>;
  Invoice: Model<IInvoice>;
  Party: Model<IParty>;
  Notification: Model<INotification>;
  Payment: Model<IPayment>;
  Staff: Model<IStaff>;
  Activity: Model<IActivity>;
  Purchase: Model<IPurchase>;
  Transaction: Model<ITransaction>;
  Offer: Model<IOffer>;
}

/**
 * Enhanced Resolver Node: Safely binds models to the requested connection.
 * If the connection is the central node, it defaults to pre-compiled singleton exports
 * to prevent OverwriteModelErrors and improve performance.
 */
export const getTenantModels = (connection: Connection): TenantModels => {
  // Nexus Root Check: If it's the singleton, use the imported cached models.
  const isRoot = connection === mongoose.connection || connection.id === mongoose.connection.id;
  
  if (isRoot) {
    return {
      User, Business, Product, Invoice, Party, Notification, 
      Payment, Staff, Activity, Purchase, Transaction, Offer
    };
  }

  // Isolation Node logic for future dynamic databases:
  return {
    User: connection.models.User || connection.model<IUser>("User", userSchema),
    Business: connection.models.Business || connection.model<IBusiness>("Business", businessSchema),
    Product: connection.models.Product || connection.model<IProduct>("Product", productSchema),
    Invoice: connection.models.Invoice || connection.model<IInvoice>("Invoice", invoiceSchema),
    Party: connection.models.Party || connection.model<IParty>("Party", partySchema),
    Notification: connection.models.Notification || connection.model<INotification>("Notification", notificationSchema),
    Payment: connection.models.Payment || connection.model<IPayment>("Payment", paymentSchema),
    Staff: connection.models.Staff || connection.model<IStaff>("Staff", staffSchema),
    Activity: connection.models.Activity || connection.model<IActivity>("Activity", activitySchema),
    Purchase: connection.models.Purchase || connection.model<IPurchase>("Purchase", purchaseSchema),
    Transaction: connection.models.Transaction || connection.model<ITransaction>("Transaction", transactionSchema),
    Offer: connection.models.Offer || connection.model<IOffer>("Offer", offerSchema),
  };
};
