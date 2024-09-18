const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const bodyParser = require("body-parser");
const fs = require("fs");
const cors = require("cors");
const path = require("path");

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

// Пути к файлам
const usersFilePath = "./data/users.json";
const teamsFilePath = "./data/teams.json";
const answersFilePath = "./data/answers.json";

let gameQuestions = [];
let gameDuration = 60; // Default duration in minutes
let gameStartTime = null;
let gameInterval = null; // Initialize gameInterval here

let questions = [];

// Функция для чтения данных из JSON файла
const readJsonFile = (filePath, defaultValue = []) => {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) {
        console.error(`Ошибка при чтении файла ${filePath}:`, err);
        return resolve(defaultValue);
      }

      try {
        const json = JSON.parse(data);
        resolve(json);
      } catch (parseErr) {
        console.error(`Ошибка при парсинге JSON в ${filePath}:`, parseErr);
        resolve(defaultValue);
      }
    });
  });
};

// Функция для записи данных в JSON файл
const writeJsonFile = (filePath, data) => {
  return new Promise((resolve, reject) => {
    fs.writeFile(filePath, JSON.stringify(data, null, 2), (err) => {
      if (err) {
        console.error(`Ошибка при записи в файл ${filePath}:`, err);
        reject(err);
      } else {
        console.log(`Файл ${filePath} успешно обновлен`);
        resolve();
      }
    });
  });
};

// Использование
readJsonFile('./data/questions.json').then((questions) => {
  console.log('Questions loaded:', questions);
});

writeJsonFile('./data/answers.json', { answers: [] }).then(() => {
  console.log('Answers file initialized');
});


// Инициализация переменных
let users = [];
let gameState = {
  gameStarted: false,
  teams: [],
}; // Переменная для состояния игры

// Загрузка пользователей из файла
const loadUsers = () => {
  fs.readFile(usersFilePath, "utf8", (err, data) => {
    if (err) {
      console.error("Ошибка при чтении users.json:", err);
      return;
    }

    if (data.trim() === "") {
      users = [];
    } else {
      try {
        users = JSON.parse(data).users || [];
      } catch (parseErr) {
        console.error("Ошибка при парсинге users.json:", parseErr);
        users = [];
      }
    }

    console.log("Пользователи загружены:", users);
  });
};

// Инициализация answers.json для новых игр
const initializeAnswersFile = (teams) => {
  const initialData = {
    answers: teams.map(team => ({
      team: team.name,
      answers: [],
    })),
  };

  fs.writeFile(answersFilePath, JSON.stringify(initialData, null, 2), (err) => {
    if (err) {
      console.error('Ошибка при записи в файл answers.json:', err);
      return;
    }
    console.log('Файл answers.json успешно инициализирован');
  });
};

// Загрузка команд из файла
const loadTeams = (callback) => {
  fs.readFile(teamsFilePath, "utf8", (err, data) => {
    if (err) {
      console.error("Ошибка при чтении teams.json:", err);
      callback(err, null);
      return;
    }

    try {
      const teams = JSON.parse(data);
      callback(null, teams);
    } catch (parseErr) {
      console.error("Ошибка при парсинге teams.json:", parseErr);
      callback(parseErr, null);
    }
  });
};

// Загрузка ответов из файла
const loadAnswers = () => {
  fs.readFile(answersFilePath, "utf8", (err, data) => {
    if (err) {
      console.error("Ошибка при чтении answers.json:", err);
      return;
    }

    if (data.trim() === "") {
      answersList = { answers: [] };
    } else {
      try {
        answersList = JSON.parse(data);
      } catch (parseErr) {
        console.error("Ошибка при парсинге answers.json:", parseErr);
        answersList = { answers: [] };
      }
    }
    console.log("Ответы загружены:", answersList);
  });
};

// Загружаем вопросы из файла
const loadQuestions = () => {
  try {
    const data = fs.readFileSync('./data/questions.json');
    return JSON.parse(data);
  } catch (error) {
    console.error('Ошибка чтения файла вопросов:', error);
    return [];
  }
};

// Сохраняем вопросы в файл
const saveQuestions = (questions) => {
  fs.writeFileSync('./data/questions.json', JSON.stringify(questions));
};

// Сохранение ответов в файл
const saveAnswers = () => {
  fs.writeFile(answersFilePath, JSON.stringify(answersList, null, 2), (err) => {
    if (err) {
      console.error("Ошибка при сохранении answers.json:", err);
      return;
    }
    console.log("Ответы сохранены:", answersList);
  });
};

// Очистка ответов перед новой игрой
function clearAnswers() {
  answersList.answers = answersList.answers.map(entry => ({ team: entry.team, answers: [] }));
}

loadUsers();
loadAnswers();

// API для получения команд
app.get('/api/teams', (req, res) => {
  console.log('Teams data:', gameState.teams);
  res.status(200).json(gameState.teams);
});

// Логин
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  console.log("Попытка логина:", username, password);

  const user = users.find((u) => u.username === username && u.password === password);

  if (user) {
    console.log("Пользователь найден:", user);
    res.status(200).json({ username: user.username, role: user.role });
  } else {
    console.log("Неверные имя пользователя или пароль");
    res.status(401).json({ message: "Неверные имя пользователя или пароль" });
  }
});

// Получить всех пользователей
app.get("/api/users", (req, res) => {
  res.status(200).json(users);
});

// Создать нового пользователя
app.post("/api/users", (req, res) => {
  const { username, password, role } = req.body;

  if (!username || !password || !role) {
    return res.status(400).json({ message: "Все поля обязательны" });
  }

  const trimmedUsername = username.trim().toLowerCase();
  const existingUser = users.find((u) => u.username.trim().toLowerCase() === trimmedUsername);

  if (existingUser) {
    return res.status(400).json({ message: "Пользователь уже существует" });
  }

  const newUser = { username: trimmedUsername, password, role };
  users.push(newUser);
  saveUsers();

  io.emit("userAdded", newUser);

  res.status(201).json(newUser);
});

// Обновить пользователя
app.put("/api/users/:username", (req, res) => {
  const { username } = req.params;
  const { password, role } = req.body;

  const user = users.find((u) => u.username === username);
  if (!user) {
    return res.status(404).json({ message: "Пользователь не найден" });
  }

  if (password) user.password = password;
  if (role) user.role = role;
  saveUsers();

  io.emit("userUpdated", user);

  res.status(200).json(user);
});

// Удалить пользователя
app.delete("/api/users/:username", (req, res) => {
  const { username } = req.params;

  const userIndex = users.findIndex((u) => u.username === username);
  if (userIndex === -1) {
    return res.status(404).json({ message: "Пользователь не найден" });
  }

  users.splice(userIndex, 1);
  saveUsers();

  io.emit("userDeleted", username);

  res.status(200).json({ message: "Пользователь успешно удален" });
});

// Присоединение команды к игре
app.post('/api/join-game', (req, res) => {
  const { teamName } = req.body;
  
  if (!teamName) {
    return res.status(400).json({ message: 'Название команды обязательно' });
  }

  if (gameState.gameStarted) {
    if (!gameState.teams.find(team => team.name === teamName)) {
      gameState.teams.push({ name: teamName, moves: 0, points: 0 });
      console.log(`Команда ${teamName} присоединилась к игре.`);
    }
    res.status(200).json({ message: `Команда ${teamName} успешно присоединилась.` });
  } else {
    res.status(400).json({ message: "Игра ещё не началась." });
  }
});

// API для отправки ответов
app.post('/api/answers', (req, res) => {
  const { team, answers } = req.body;

  const filePath = path.join(__dirname, './data/answers.json');

  // Читаем существующие ответы
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      return res.status(500).json({ error: "Failed to read answers file" });
    }

    const existingAnswers = JSON.parse(data || "[]");

    // Добавляем новые ответы
    existingAnswers.push({ team, answers });

    // Записываем обновленные ответы обратно в файл
    fs.writeFile(filePath, JSON.stringify(existingAnswers, null, 2), (err) => {
      if (err) {
        return res.status(500).json({ error: "Failed to save answers" });
      }
      res.json({ success: true });
    });
  });
});

// Route to get answers data
app.get("/api/answers", (req, res) => {
  fs.readFile(answersFilePath, "utf8", (err, data) => {
    if (err) {
      console.error("Ошибка при чтении файла answers.json:", err);
      return res.status(500).send("Ошибка при чтении файла answers.json");
    }
    const answers = JSON.parse(data);
    res.json(answers);
  });
});


// API для получения списка вопросов
app.get('/api/questions', (req, res) => {
  try {
    const questions = loadQuestions();
    res.status(200).json({ questions });
  } catch (error) {
    console.error('Ошибка при получении вопросов:', error);
    res.status(500).json({ message: 'Ошибка при получении вопросов' });
  }
});

// API для добавления вопроса
app.post('/api/add-question', (req, res) => {
  const { question } = req.body;
  questions.push(question);
  saveQuestions(questions);
  res.status(200).json({ questions });
});

// API для удаления вопроса
app.post('/api/delete-question', (req, res) => {
  const { index } = req.body;
  if (index >= 0 && index < questions.length) {
    questions.splice(index, 1);
    saveQuestions(questions);
    res.status(200).json({ questions });
  } else {
    res.status(400).json({ message: 'Неверный индекс вопроса' });
  }
});

// API для получения данных прогресса команд
app.get('/api/teams-progress', (req, res) => {
  fs.readFile(answersFilePath, 'utf-8', (err, data) => {
    if (err) {
      return res.status(500).json({ message: 'Ошибка при чтении файла ответов' });
    }

    try {
      const answersData = JSON.parse(data);
      res.status(200).json(answersData);
    } catch (error) {
      res.status(500).json({ message: 'Ошибка при парсинге данных' });
    }
  });
});


app.post('/api/start-game', (req, res) => {
  const { duration } = req.body; // Получаем продолжительность игры из тела запроса

  // Обновляем глобальные переменные
  gameDuration = duration || gameDuration; // Продолжительность игры
  gameStartTime = new Date(); // Время начала игры

  // Очищаем существующий интервал (если есть)
  if (gameInterval) clearInterval(gameInterval);

  // Устанавливаем новый интервал для обновления таймера
  gameInterval = setInterval(() => {
    io.emit('timer_update', calculateRemainingTime()); // Отправляем обновление таймера всем клиентам
  }, 1000); // Каждую секунду

  // Загружаем вопросы из файла
  fs.readFile('./data/questions.json', 'utf8', (err, data) => {
    if (err) {
      return res.status(500).json({ message: 'Ошибка при чтении файла вопросов' });
    }

    try {
      gameQuestions = JSON.parse(data);
      // Отправляем список вопросов обратно на клиент
      res.status(200).json({ questions: gameQuestions });
    } catch (parseErr) {
      res.status(500).json({ message: 'Ошибка при парсинге вопросов' });
    }
  });
});


// End Game
app.post('/api/end-game', (req, res) => {
  clearInterval(gameInterval);
  gameInterval = null;
  gameStartTime = null;
  res.status(200).send('Game ended');
});

// Обработка сохранения вопросов
app.post('/api/save-questions', (req, res) => {
  const { questions } = req.body;
  
  if (Array.isArray(questions)) {
    saveQuestionsToFile(questions); // Сохраняем вопросы в файл
    res.status(200).json({ message: 'Questions saved successfully.' });
  } else {
    res.status(400).json({ message: 'Invalid questions format.' });
  }
});


// Record Score
app.post('/api/record-score', (req, res) => {
  const { teamId, score } = req.body;
  // Logic to record the score for the team
  res.status(200).send('Score recorded');
});

// Функция для сохранения пользователей в файл
const saveUsers = () => {
  fs.writeFile(usersFilePath, JSON.stringify({ users }, null, 2), (err) => {
    if (err) {
      console.error("Ошибка при сохранении пользователей:", err);
    } else {
      console.log("Пользователи сохранены.");
    }
  });
};


const activeTeams = new Set();

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on("team_connected", (team) => {
    if (!activeTeams.has(team.username)) {
      activeTeams.add(team.username);
      console.log(`Team connected: ${team.username}`);
    } else {
      console.log(`Team ${team.username} is already connected.`);
    }

    // Обновление списка активных команд
    io.emit('update_teams', Array.from(activeTeams));
  });

  socket.on('join_game', (team) => {
    // В Set не используется метод push, вместо этого добавляем через .add()
    activeTeams.add(team.username);
    io.emit('update_teams', Array.from(activeTeams));
  });

  socket.on('disconnect', () => {
    activeTeams = activeTeams.filter(t => t.id !== socket.id);
    io.emit('update_teams', Array.from(activeTeams));
  });  

  socket.on('game_started', () => {
    io.emit('game_started', questions); // Отправляем вопросы всем подключенным пользователям
  });

  socket.on('game_ended', () => {
    io.emit('game_ended');
  });
});


// server.js
const calculateRemainingTime = () => {
  if (!gameStartTime || !gameDuration) return 0;
  const now = new Date();
  const elapsed = Math.floor((now - gameStartTime) / 1000);
  return Math.max(0, gameDuration * 60 - elapsed);
};

// Убедитесь, что emit происходит каждую секунду, и значение корректное
gameInterval = setInterval(() => {
  io.emit('timer_update', calculateRemainingTime());
}, 1000);



server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
