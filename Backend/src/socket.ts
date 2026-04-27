import { Server } from "socket.io";
import { Server as HttpServer } from "http";

let io: Server;

export const initSocket = (server: HttpServer) => {
    io = new Server(server, {
    cors: {
      origin: [
        process.env.CORS_ORIGIN || "*", // Fallback to * for initial debugging or use env
        /^https:\/\/.*\.vercel\.app$/,  // Trust all Vercel subdomains
        "https://nexusbill.vercel.app", // User's primary domain
        "https://account-billing-system.vercel.app", 
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174"
      ], 
      methods: ["GET", "POST", "PATCH", "DELETE", "PUT", "OPTIONS"],
      credentials: true
    },
    connectTimeout: 45000,
    pingTimeout: 30000,
    pingInterval: 25000
  });

  io.on("connection", (socket) => {
    console.log(`📡 Nexus Protocol: Node connected [${socket.id}]`);

    // Channel Subscription Node: Users join rooms based on businessId or role
    socket.on("join-room", (room: string) => {
      socket.join(room);
      console.log(`🔗 Node [${socket.id}] subscribed to Channel: ${room}`);
    });

    socket.on("disconnect", () => {
      console.log(`🔌 Nexus Protocol: Node disconnected [${socket.id}]`);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    console.error("❌ Nexus Protocol Error: Socket.io not initialized.");
  }
  return io;
};
