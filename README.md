# NexusBill: Next-Generation SaaS POS & ERP Terminal

NexusBill is an industrial-grade, multi-tenant SaaS platform designed for high-performance retail operations, POS billing, and real-time inventory telemetry. Built with a robust MERN stack architecture, it features a focus on fiscal accuracy, industrial aesthetics, and real-time data synchronization.

## 🚀 Core Features

- **Multi-Tenant Architecture**: Secure data isolation for unlimited businesses within a single unified database.
- **Smart POS Terminal**: High-speed billing hub with integrated GST calculations, slab-wise tax breakdown, and automatic discount application.
- **Promotional Engine**: Nodal offer management supporting BOGO (B2G1), bulk slab discounts, and seasonal campaigns.
- **Real-Time Telemetry**: Instant dashboard and report updates powered by Socket.io and Nexus Sync protocol.
- **Inventory Intelligence**: Low-stock alerts, SKU management, and automated stock reconciliation.
- **Fiscal Governance**: Professional GST reports, purchase procurement ledgers, and master audit sequences.
- **Personnel Management**: Role-based access control (RBAC) with granular permissions for Managers, Accountants, and Cashiers.

## 🛠️ Technology Stack

- **Frontend**: React 18, Vite, TailwindCSS (Vanilla CSS for custom components), Recharts, Lucide Icons.
- **Backend**: Node.js, Express, TypeScript, Mongoose.
- **Real-Time**: Socket.io (Nexus Protocol).
- **Payment Gateway**: Razorpay Integration (Live & Sandbox).
- **Communication**: BroadcastChannel API for cross-tab synchronization.

## 📦 Project Structure

```text
NexusBill/
├── Backend/          # Node.js + TS Server
│   ├── src/          # Source Code (Controllers, Models, Routes)
│   ├── scripts/      # Database Seeders and Cleaners
│   └── .env          # Server Configuration (Ignored by Git)
├── Frontend/         # React + Vite Application
│   ├── src/          # Components, Pages, Hooks, Services
│   └── .env          # API Endpoints Configuration
└── README.md         # Master Documentation
```

## ⚡ Quick Start

### 1. Prerequisites
- Node.js (v16.x or higher)
- MongoDB Cluster
- Razorpay API Keys

### 2. Environment Configuration
Create a `.env` file in both `Backend/` and `Frontend/` directories based on the `.env.example` templates.

**Backend (.env):**
```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
SUPER_ADMIN_SECRET_KEY=your_super_admin_key
RAZORPAY_KEY_ID=your_razorpay_id
RAZORPAY_KEY_SECRET=your_razorpay_secret
```

**Frontend (.env):**
```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
VITE_RAZORPAY_KEY_ID=your_razorpay_id
```

### 3. Installation
```bash
# Install Backend Dependencies
cd Backend
npm install

# Install Frontend Dependencies
cd ../Frontend
npm install
```

### 4. Running the Project
```bash
# Start Backend (Nexus Engine)
cd Backend
npm run dev

# Start Frontend (Nexus Dashboard)
cd ../Frontend
npm run dev
```

## 📊 Business Intelligence & GST
NexusBill automatically calculates GSTR-1 ready data, including:
- **Taxable Value**: Pre-tax revenue per slab.
- **Collected Tax**: CGST/SGST/IGST breakdown.
- **Exempted Sales**: Non-GST product tracking.

## 🛡️ Security & Governance
All transactions are logged in the **Master Audit Sequence**. The platform enforces strict isolation using `businessAdminId` filters at the database level to ensure zero data leakage between tenants.

---
**NexusBill | Strategic Retail Intelligence**
