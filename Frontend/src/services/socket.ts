import { io, Socket } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_API_URL || "https://account-billing-system.onrender.com";

class SocketService {
  private socket: Socket | null = null;

  connect() {
    if (this.socket) return;

    this.socket = io(SOCKET_URL, {
      transports: ["websocket"],
      withCredentials: true,
    });

    this.socket.on("connect", () => {
      console.log("📡 Nexus Protocol: Socket Connected");
      
      // Join business room if user is logged in
      const rawUser = localStorage.getItem("user");
      if (rawUser && rawUser !== "undefined") {
        const user = JSON.parse(rawUser);
        const businessId = user.businessObjectId?._id || user.businessObjectId || user.businessId;
        if (businessId) {
          this.socket?.emit("join-room", businessId.toString());
          console.log(`📡 Joined Business Room: ${businessId}`);
        }
      }
    });

    this.socket.on("disconnect", () => {
      console.log("📡 Nexus Protocol: Socket Disconnected");
    });
  }

  getSocket() {
    if (!this.socket) this.connect();
    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  emit(event: string, data: any) {
    this.socket?.emit(event, data);
  }

  on(event: string, callback: (...args: any[]) => void) {
    this.socket?.on(event, callback);
  }

  off(event: string, callback?: (...args: any[]) => void) {
    this.socket?.off(event, callback);
  }
}

export const socketService = new SocketService();
export default socketService;
