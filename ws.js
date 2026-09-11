import { WebSocketServer } from "ws";

let wss;

function getWebSocketServer() {
  if (!wss) {
    wss = new WebSocketServer({
      noServer: true,
    });
  }

  return wss;
}

export default function handler(req, res) {
  const upgradeHeader = req.headers.upgrade;

  // Normal HTTP request
  if (!upgradeHeader || upgradeHeader.toLowerCase() !== "websocket") {
    res.statusCode = 426;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        error: "WebSocket connection required",
      })
    );
    return;
  }

  const server = res.socket?.server;

  if (!server) {
    res.statusCode = 500;
    res.end("WebSocket server unavailable");
    return;
  }

  // Prevent attaching multiple upgrade listeners
  if (!server.reaperWebSocketAttached) {
    server.reaperWebSocketAttached = true;

    server.on("upgrade", (request, socket, head) => {
      const pathname = new URL(
        request.url,
        `http://${request.headers.host}`
      ).pathname;

      if (pathname !== "/api/ws") {
        return;
      }

      getWebSocketServer().handleUpgrade(
        request,
        socket,
        head,
        (client) => {
          getWebSocketServer().emit("connection", client, request);
        }
      );
    });

    getWebSocketServer().on("connection", (socket) => {
      socket.send(
        JSON.stringify({
          type: "connected",
          message: "MR REAPER WebSocket online",
        })
      );

      socket.on("message", (message) => {
        let data;

        try {
          data = JSON.parse(message.toString());
        } catch {
          socket.send(
            JSON.stringify({
              type: "error",
              message: "Invalid JSON",
            })
          );
          return;
        }

        // Ping/pong
        if (data.type === "ping") {
          socket.send(
            JSON.stringify({
              type: "pong",
              time: Date.now(),
            })
          );
          return;
        }

        // Echo test
        if (data.type === "test") {
          socket.send(
            JSON.stringify({
              type: "test-response",
              message: "MR REAPER server received your message",
              data,
            })
          );
          return;
        }
      });

      socket.on("error", (error) => {
        console.error("WebSocket error:", error);
      });
    });
  }

  res.statusCode = 101;
  res.end();
}