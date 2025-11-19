// server.js
const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files from public/
app.use(express.static(path.join(__dirname, "public")));

// In-memory stores for prototype
const users = {}; // socketId -> { username, avatar, currentRoom, lastSeen }
const userByName = {}; // username -> socketId (last connected)
const rooms = { general: [] }; // roomName -> [messages]
const privateHistory = {}; // "alice|bob" -> messages

function privateKey(a, b) {
  return [a, b].sort().join("|");
}

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  socket.on("join", (profile, cb) => {
    const username =
      profile && profile.username
        ? profile.username
        : "User" + socket.id.slice(0, 4);
    const avatar = profile && profile.avatar ? profile.avatar : null;

    users[socket.id] = {
      username,
      avatar,
      currentRoom: "general",
      lastSeen: null,
    };
    userByName[username] = socket.id;

    socket.join("general");
    // send current presence and history
    io.emit("presence", getOnlineList());
    cb && cb({ ok: true, history: (rooms["general"] || []).slice(-200) });

    io.to("general").emit("systemMessage", {
      text: `${username} joined general`,
    });
  });

  socket.on("joinRoom", (room, cb) => {
    const u = users[socket.id];
    if (!u) return;
    socket.leave(u.currentRoom);
    socket.join(room);
    u.currentRoom = room;
    rooms[room] = rooms[room] || [];
    cb && cb({ ok: true, history: rooms[room].slice(-200) });
    io.to(room).emit("systemMessage", { text: `${u.username} joined ${room}` });
    io.emit("presence", getOnlineList());
  });

  socket.on("roomMessage", (payload, ack) => {
    const u = users[socket.id];
    if (!u) return;
    const room = u.currentRoom || "general";
    const message = {
      id: Date.now() + "_" + Math.random().toString(36).slice(2),
      user: u.username,
      avatar: u.avatar || null,
      text: payload.text,
      ts: Date.now(),
      room,
    };
    rooms[room] = rooms[room] || [];
    rooms[room].push(message);
    io.to(room).emit("message", message);
    ack && ack({ ok: true });
  });

  socket.on("privateMessage", (payload, ack) => {
    // payload: { to, text }
    const sender = users[socket.id];
    if (!sender) return;
    const key = privateKey(sender.username, payload.to);
    const message = {
      id: Date.now() + "_" + Math.random().toString(36).slice(2),
      from: sender.username,
      to: payload.to,
      text: payload.text,
      ts: Date.now(),
      seen: false,
    };
    privateHistory[key] = privateHistory[key] || [];
    privateHistory[key].push(message);

    // send to recipient if online
    const toSock = userByName[payload.to];
    if (toSock && io.sockets.sockets.get(toSock)) {
      io.to(toSock).emit("privateMessage", message);
    }
    // echo back to sender
    socket.emit("privateMessage", message);
    ack && ack({ ok: true });
  });

  socket.on("typing", (data) => {
    const u = users[socket.id];
    if (!u) return;
    if (data.type === "room") {
      const room = u.currentRoom || "general";
      socket.to(room).emit("typing", { user: u.username });
    } else if (data.type === "private" && data.to) {
      const toSock = userByName[data.to];
      if (toSock)
        io.to(toSock).emit("typing", { user: u.username, private: true });
    }
  });

  socket.on("markSeen", (data) => {
    // data: { convWith, messageId }
    const u = users[socket.id];
    if (!u) return;
    const key = privateKey(u.username, data.convWith);
    const arr = privateHistory[key] || [];
    const msg = arr.find((m) => m.id === data.messageId);
    if (msg) {
      msg.seen = true;
      const senderSock = userByName[msg.from];
      if (senderSock)
        io.to(senderSock).emit("messageSeen", {
          messageId: msg.id,
          by: u.username,
        });
    }
  });

  socket.on("disconnect", () => {
    const info = users[socket.id];
    if (info) {
      info.lastSeen = Date.now();
      delete userByName[info.username];
      delete users[socket.id];
      io.emit("presence", getOnlineList());
      io.emit("systemMessage", { text: `${info.username} left` });
      console.log("Disconnect:", socket.id);
    }
  });

  function getOnlineList() {
    return Object.values(users).map((u) => ({
      username: u.username,
      avatar: u.avatar,
      room: u.currentRoom,
    }));
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log("Server listening on", PORT));
