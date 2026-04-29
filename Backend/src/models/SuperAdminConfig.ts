import mongoose, { Document, Model, Schema } from 'mongoose';
import bcrypt from 'bcrypt';

export interface ISuperAdminConfig extends Document {
  secretKey: string;
  name: string;
  isInitialized: boolean;
  lastLoginAt?: Date;
  lastLoginIP?: string;
  maintenanceMode: boolean;
  allowRegistrations: boolean;
  globalLogging: boolean;
  earlyAccess: boolean;
  createdAt: Date;
  updatedAt: Date;
  compareSecretKey(key: string): Promise<boolean>;
}

interface SuperAdminConfigModel extends Model<ISuperAdminConfig> {
  getInstance(): Promise<ISuperAdminConfig | null>;
}

const superAdminConfigSchema = new Schema<ISuperAdminConfig>(
  {
    secretKey: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      default: 'SuperAdmin',
    },
    isInitialized: {
      type: Boolean,
      default: false,
    },
    lastLoginAt: {
      type: Date,
    },
    lastLoginIP: {
      type: String,
    },
    maintenanceMode: {
      type: Boolean,
      default: false,
    },
    allowRegistrations: {
      type: Boolean,
      default: true,
    },
    globalLogging: {
      type: Boolean,
      default: true,
    },
    earlyAccess: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save hook to hash the secret key
superAdminConfigSchema.pre<ISuperAdminConfig>('save', async function () {
  if (!this.isModified('secretKey')) return;
  const salt = await bcrypt.genSalt(10);
  this.secretKey = await bcrypt.hash(this.secretKey, salt);
});

// Instance method to compare secret key
superAdminConfigSchema.methods.compareSecretKey = async function (key: string): Promise<boolean> {
  return await bcrypt.compare(key, this.secretKey);
};

// Static method to get the singleton instance
superAdminConfigSchema.statics.getInstance = async function () {
  return this.findOne();
};

const SuperAdminConfig = (mongoose.models.SuperAdminConfig || mongoose.model<ISuperAdminConfig, SuperAdminConfigModel>(
  'SuperAdminConfig',
  superAdminConfigSchema
)) as SuperAdminConfigModel;

export default SuperAdminConfig;
