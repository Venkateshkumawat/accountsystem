import { Server } from "socket.io";
import { Server as HttpServer } from "http";

let io: Server;

export const initSocket = (server: HttpServer) => {
    io = new Server(server, {
    cors: {
      origin: "*", 
      methods: ["GET", "POST", "PATCH", "DELETE", "PUT", "OPTIONS"],
      credentials: true
    },
    transports: ["websocket", "polling"],
    allowEIO3: true
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
