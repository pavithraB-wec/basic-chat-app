# 💬Chat Application

A beautiful, modern, real-time chat application built using **Node.js**, **Express**, and **Socket.io**.  
Supports multiple users, live messaging, chat rooms, timestamps, avatars, and a gradient UI inspired by modern messaging apps.

---

## 📸 Chat App Preview

![Chat App Screenshot](https://raw.githubusercontent.com/pavithraB-wec/basic-chat-app/main/public/assets/Screenshot%202025-11-19%20195829.png)

*(Live two-browser chat preview showing real-time messaging.)*

---

## 🚀 Features

- ⚡ **Real-time messaging** using Socket.io  
- 🌈 **Smooth gradient UI** with modern styling  
- 👥 **Multi-user support**  
- 🏠 **Multiple chat rooms** (general, projects, friends)  
- 🕒 **Accurate timestamps** on every message  
- 🧩 **User avatars**  
- 📱 **Responsive layout**  
- 🎉 **Fun emoji-based user identity**  

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | HTML, CSS, JavaScript |
| Backend | Node.js, Express |
| Real-time | Socket.io |
| Deployment | Render / Railway / Localhost |

## Install dependencies

Run:

npm install

Wait until it finishes.

Because your package.json already contains the dependencies, this will install things like Socket.io and Express.

## Start the chat server

Run:

node server.js

You should see something similar to:

Server listening on 3000

## Open the application

Open Chrome and go to:

http://localhost:3000

## You should see your Chat application. 💬

👥 Test two users

This is important because your app uses Socket.io.

Open:

Browser window 1
http://localhost:3000

Enter:

name

Click Join.

Then open:

Browser window 2
http://localhost:3000

Enter:

name

Click Join.

Now send messages between them.
