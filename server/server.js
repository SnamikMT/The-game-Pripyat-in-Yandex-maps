const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const bodyParser = require("body-parser");
const fs = require("fs");
const cors = require("cors");

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE"],
  },
});

const PORT = 5000;

app.use(bodyParser.json());
app.use(
  cors({
    origin: "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE"],
  })
);

const usersFilePath = "./data/users.json";
let users = [];
let connectedTeams = []; // Храним информацию о подключенных командах

// Загрузка пользователей из файла
const loadUsers = () => {
  fs.readFile(usersFilePath, "utf8", (err, data) => {
    if (err) {
      console.error("Error reading users.json file:", err);
      return;
    }

    if (data.trim() === "") {
      users = [];
    } else {
      try {
        users = JSON.parse(data).users || [];
      } catch (parseErr) {
        console.error("Error parsing users.json file:", parseErr);
        users = [];
      }
    }

    console.log("Users loaded on server start:", users);
  });
};

// Сохранение пользователей в файл
const saveUsers = () => {
  fs.writeFile(usersFilePath, JSON.stringify({ users }, null, 2), (err) => {
    if (err) {
      console.error("Error saving users.json file:", err);
      return;
    }
    console.log("Users saved:", users);
  });
};

loadUsers();

// Обработка логина
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  console.log("Login attempt:", username, password);

  const user = users.find((u) => u.username === username && u.password === password);

  if (user) {
    console.log("User found:", user);
    res.status(200).json({ username: user.username, role: user.role });
  } else {
    console.log("User not found or password incorrect");
    res.status(401).json({ message: "Invalid username or password" });
  }
});

// Получение всех пользователей
app.get("/api/users", (req, res) => {
  res.status(200).json(users);
});

// Создание нового пользователя
app.post("/api/users", (req, res) => {
  const { username, password, role } = req.body;

  if (!username || !password || !role) {
    return res.status(400).json({ message: "All fields are required" });
  }

  const trimmedUsername = username.trim().toLowerCase();
  const existingUser = users.find((u) => u.username.trim().toLowerCase() === trimmedUsername);

  if (existingUser) {
    return res.status(400).json({ message: "User already exists" });
  }

  const newUser = { username: trimmedUsername, password, role };
  users.push(newUser);
  saveUsers();

  io.emit("userAdded", newUser); // Уведомляем всех подключенных клиентов о новом пользователе

  res.status(201).json(newUser);
});

// Обновление пользователя
app.put("/api/users/:username", (req, res) => {
  const { username } = req.params;
  const { password, role } = req.body;

  const user = users.find((u) => u.username === username);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  if (password) user.password = password;
  if (role) user.role = role;
  saveUsers();

  io.emit("userUpdated", user); // Уведомляем всех клиентов об обновлении пользователя

  res.status(200).json(user);
});

// Удаление пользователя
app.delete("/api/users/:username", (req, res) => {
  const { username } = req.params;

  const userIndex = users.findIndex((u) => u.username === username);
  if (userIndex === -1) {
    return res.status(404).json({ message: "User not found" });
  }

  users.splice(userIndex, 1);
  saveUsers();

  io.emit("userDeleted", username); // Уведомляем всех клиентов об удалении пользователя

  res.status(200).json({ message: "User deleted successfully" });
});

// WebSocket логика
io.on("connection", (socket) => {
  console.log("A user connected");

  // Обработка события подключения команды
  socket.on("team_connected", (team) => {
    connectedTeams.push(team);
    io.emit("connected_teams", connectedTeams); // Отправляем всем обновленный список команд
    console.log("Team connected:", team);
  });

  // Обработка отключения команды
  socket.on("team_disconnected", (team) => {
    connectedTeams = connectedTeams.filter((t) => t.username !== team.username);
    io.emit("connected_teams", connectedTeams); // Обновляем список подключенных команд
    console.log("Team disconnected:", team);
  });

  socket.on("disconnect", () => {
    console.log("A user disconnected");
  });
});

server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
