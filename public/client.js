// client.js - full features: emoji avatars, uploads, private history, seen ticks, NO DUPLICATE MESSAGES
const socket = io();

let myName = null,
  myAvatar = null;
let currentRoom = "general";
let currentPrivate = null;

// DOM references
const nameInput = document.getElementById("nameInput");
const avatarInput = document.getElementById("avatarInput");
const joinBtn = document.getElementById("joinBtn");
const myAvatarImg = document.getElementById("myAvatar");
const userListEl = document.getElementById("userList");
const messagesEl = document.getElementById("messages");
const msgInput = document.getElementById("msgInput");
const sendBtn = document.getElementById("sendBtn");
const roomButtons = document.querySelectorAll(".roomBtn");
const roomHeader = document.getElementById("roomHeader");

// Emoji picker DOM
const emojiBtn = document.getElementById("emojiBtn");
const emojiPicker = document.getElementById("emojiPicker");

// Files
const fileInput = document.getElementById("fileInput");
const attachBtn = document.getElementById("attachBtn");

// Emoji list
const EMOJIS = [
  "😀",
  "😎",
  "😊",
  "🤩",
  "😇",
  "🥳",
  "😁",
  "😺",
  "😸",
  "🤖",
  "🦄",
  "🐼",
  "🐵",
  "🐯",
  "🌸",
  "🍩",
  "🍕",
  "☕️",
  "🔥",
  "✨",
  "🎉",
  "💫",
  "🌟",
  "🍀",
  "🌈",
];

// ---------------- EMOJI AVATAR HELPERS ----------------
function pickEmojiForName(name) {
  if (!name) return EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
  let sum = 0;
  for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i);
  return EMOJIS[sum % EMOJIS.length];
}

function generateEmojiSVG(emoji, bg = "#FFF") {
  const svg = `
  <svg xmlns='http://www.w3.org/2000/svg' width='128' height='128'>
    <rect width='100%' height='100%' rx='20' fill='${bg}' />
    <text x='50%' y='52%' dominant-baseline='middle' text-anchor='middle'
     font-size='64' font-family='Segoe UI Emoji, Noto Color Emoji, Apple Color Emoji'>
      ${emoji}
    </text>
  </svg>`;
  return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
}

function makeEmojiAvatar(name) {
  const e = pickEmojiForName(name || "anon");
  const colors = [
    "#FFDEE9",
    "#B5FFFC",
    "#FFF6B1",
    "#E8F8E7",
    "#FDEBD0",
    "#E6E6FF",
    "#FFEBF0",
  ];
  const bg = colors[(name || "x").length % colors.length];
  return generateEmojiSVG(e, bg);
}

// Escaping
function escapeHtml(s) {
  return (s || "").replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      }[c])
  );
}

// Convert file to base64
function fileToDataURL(file, cb) {
  const r = new FileReader();
  r.onload = () => cb(r.result);
  r.readAsDataURL(file);
}

// ---------------- JOIN LOGIC ----------------
joinBtn.onclick = () => {
  const name = nameInput.value.trim();
  if (!name) return alert("Enter a name");

  const f = avatarInput.files[0];
  if (f) {
    fileToDataURL(f, (dataUrl) => doJoin(name, dataUrl));
  } else {
    doJoin(name, null);
  }
};

function doJoin(name, avatar) {
  myName = name;
  if (!avatar) avatar = makeEmojiAvatar(name);
  myAvatar = avatar;
  myAvatarImg.src = myAvatar;

  socket.emit("join", { username: myName, avatar: myAvatar }, (resp) => {
    if (resp && resp.ok) {
      renderHistory(resp.history);
      nameInput.disabled = true;
      joinBtn.disabled = true;
      avatarInput.disabled = true;
    }
  });
}

// ---------------- ROOM SWITCH ----------------
roomButtons.forEach((btn) => {
  btn.onclick = () => {
    const room = btn.dataset.room;
    socket.emit("joinRoom", room, (resp) => {
      if (resp && resp.history) renderHistory(resp.history);
      currentRoom = room;
      currentPrivate = null;
      roomHeader.innerText = "Room: " + room;
    });
  };
});

// ---------------- SENDING MESSAGES ----------------
sendBtn.onclick = sendMessage;
msgInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendMessage();
  else socket.emit("typing", { type: "room" });
});

function sendMessage() {
  const text = msgInput.value.trim();
  if (!text) return;

  if (currentPrivate) {
    socket.emit("privateMessage", { to: currentPrivate, text }, () => {});
    renderMessage({ from: myName, text, ts: Date.now() });
  } else {
    socket.emit("roomMessage", { text }, () => {});
    renderMessage({ user: myName, text, ts: Date.now() });
  }

  msgInput.value = "";
}

// ---------------- FILE UPLOAD ----------------
attachBtn.onclick = () => fileInput.click();

fileInput.onchange = async (e) => {
  const f = e.target.files[0];
  if (!f) return;

  const form = new FormData();
  form.append("file", f);

  const res = await fetch("/api/upload", { method: "POST", body: form });
  const j = await res.json();

  if (j.ok) {
    if (currentPrivate) {
      socket.emit("privateMessage", { to: currentPrivate, fileUrl: j.fileUrl });
      renderMessage({ from: myName, fileUrl: j.fileUrl, ts: Date.now() });
    } else {
      socket.emit("roomMessage", { text: "", fileUrl: j.fileUrl });
      renderMessage({ user: myName, fileUrl: j.fileUrl, ts: Date.now() });
    }
  }

  fileInput.value = "";
};

// ---------------- RENDER MESSAGES ----------------
function renderHistory(arr) {
  messagesEl.innerHTML = "";
  arr.forEach(renderMessage);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function renderMessage(m) {
  const div = document.createElement("div");

  let isMe = false,
    name,
    avatarSrc;
  const ts = new Date(m.ts || Date.now()).toLocaleTimeString();

  if (m.user) {
    // room message
    name = m.user;
    avatarSrc = m.avatar || makeEmojiAvatar(m.user);
    isMe = m.user === myName;
  } else if (m.from) {
    // private
    name = m.from;
    avatarSrc = makeEmojiAvatar(m.from);
    isMe = m.from === myName;
  }

  div.className = "message " + (isMe ? "me" : "left");

  const meta = `
    <div class="meta">
      <img src="${avatarSrc}" />
      <strong>${escapeHtml(name)}</strong>
      <span class="time">${ts}</span>
    </div>`;

  let content = "";
  if (m.fileUrl) {
    if (/\.(png|jpe?g|gif|webp)$/i.test(m.fileUrl))
      content = `<div class="text"><img src="${m.fileUrl}" class="upload-preview"></div>`;
    else
      content = `<div class="text"><a href="${m.fileUrl}" target="_blank">Download file</a></div>`;
  } else {
    content = `<div class="text">${escapeHtml(m.text)}</div>`;
  }

  div.innerHTML = meta + content;

  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

// ---------------- RECEIVE ROOM MESSAGE (FIXED DOUBLE ISSUE) ----------------
socket.on("message", (m) => {
  if (m.from === myName) return; // prevent duplicate
  renderMessage({ user: m.from, text: m.text, fileUrl: m.fileUrl, ts: m.ts });
});

// ---------------- RECEIVE PRIVATE MESSAGE (FIXED DOUBLE ISSUE) ----------------
socket.on("privateMessage", (m) => {
  if (m.from === myName) return; // prevent duplicate

  renderMessage({
    from: m.from,
    to: m.to,
    text: m.text,
    fileUrl: m.fileUrl,
    ts: m.ts,
  });

  if (m.to === myName) {
    socket.emit("markSeen", { messageId: m.id });
  }
});

// ---------------- TYPING ----------------
socket.on("typing", (d) => {
  const el = document.createElement("div");
  el.className = "typing";
  el.textContent = `${d.user} is typing...`;
  messagesEl.appendChild(el);
  setTimeout(() => el.remove(), 1200);
});

// ---------------- SYSTEM MESSAGES ----------------
socket.on("systemMessage", (m) => {
  const s = document.createElement("div");
  s.className = "sys";
  s.textContent = m.text;
  messagesEl.appendChild(s);
});

// ---------------- PRESENCE ----------------
socket.on("presence", (list) => {
  userListEl.innerHTML = "";
  list.forEach((u) => {
    const li = document.createElement("li");
    const avatarSrc = u.avatar || makeEmojiAvatar(u.username);
    li.innerHTML = `<img src="${avatarSrc}" /><span>${escapeHtml(
      u.username
    )}</span>`;

    li.onclick = async () => {
      currentPrivate = u.username;
      roomHeader.innerText = "Private: " + currentPrivate;

      const res = await fetch(`/api/private/${myName}/${currentPrivate}`);
      const j = await res.json();

      messagesEl.innerHTML = "";
      if (j.ok) {
        j.messages.forEach((msg) =>
          renderMessage({
            from: msg.from,
            to: msg.to,
            text: msg.text,
            fileUrl: msg.fileUrl,
            ts: msg.ts,
          })
        );
      }
    };

    userListEl.appendChild(li);
  });
});

// ---------------- EMOJI PICKER ----------------
emojiBtn.onclick = () => {
  emojiPicker.style.display =
    emojiPicker.style.display === "flex" ? "none" : "flex";

  emojiPicker.innerHTML = "";
  EMOJIS.forEach((e) => {
    const b = document.createElement("button");
    b.textContent = e;
    b.onclick = () => {
      msgInput.value += e;
      emojiPicker.style.display = "none";
      msgInput.focus();
    };
    emojiPicker.appendChild(b);
  });
};

document.addEventListener("click", (ev) => {
  if (ev.target !== emojiBtn && !emojiPicker.contains(ev.target)) {
    emojiPicker.style.display = "none";
  }
});
