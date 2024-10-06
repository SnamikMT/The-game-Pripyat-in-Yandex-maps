const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const bodyParser = require("body-parser");
const fs = require("fs");
const cors = require("cors");
const path = require("path");
const multer = require('multer');
const { updateMoves } = require('./moves');
const { getTeamsData, recordTeamMove } = require('./teamsController');
const fss = require('fs').promises;

require('dotenv').config();


const app = express();
const server = http.createServer(app);

app.use(bodyParser.json());

const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000";

app.use(cors({
  origin: CLIENT_URL,
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Что-то пошло не так!' });
});


const io = socketIo(server, {
  cors: {
    origin: CLIENT_URL,
    methods: ["GET", "POST"]
  }
});


// Пути к файлам
const usersFilePath = "./data/users.json";

const questionsFilePath = path.join(__dirname, './data/questions.json');
const answersFilePath = path.join(__dirname, './data/answers.json');


const teamsFilePath = path.join(__dirname, 'data', 'teams.json');

const blocksDataFilePath = path.join(__dirname, './data/blocksData.json');

const gameStatusPath = path.join(__dirname, 'data', 'gameStatus.json');

// Функция для чтения статуса игры
const getGameStatus = () => {
  const rawData = fs.readFileSync(gameStatusPath);
  const gameStatus = JSON.parse(rawData);
  return gameStatus;
};

// Функция для обновления статуса игры
const updateGameStatus = async (started) => {
  try {
    const gameStatusPath = path.join(__dirname, 'data', 'gameStatus.json');
    const gameStatus = { gameStarted: started };
    
    await fss.writeFile(gameStatusPath, JSON.stringify(gameStatus, null, 2));
    console.log(`Game status updated to ${started}`);
  } catch (error) {
    console.error('Error updating game status:', error);
  }
};


// Чтение данных из файла команд
async function readTeamsFile() {
  try {
    const data = await fs.promises.readFile(teamsFilePath, 'utf-8');
    
    const teams = JSON.parse(data);

    // Проверка, что данные - массив
    if (!Array.isArray(teams)) {
      throw new Error('Parsed data is not an array');
    }

    return teams;
  } catch (err) {
    console.error('Ошибка чтения файла команд или парсинга данных:', err);
    return [];
  }
}

// Запись данных в файл команд
async function writeTeamsFile(data) {
  try {
    await fs.promises.writeFile(teamsFilePath, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Ошибка записи файла команд:', err);
  }
}


// Чтение данных из файла answers.json
const getAnswers = () => {
  const filePath = path.join(__dirname, 'data', 'answers.json'); // Обязательно проверь правильность пути к файлу
  const fileData = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(fileData); // Парсинг JSON-данных
};


// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); // Ensure this directory exists
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname)); // Append timestamp to the filename
  }
});

const upload = multer({ storage: storage });

// Статическая папка для доступа к загруженным изображениям
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// PUT запрос для обновления блока по первой букве категории
app.put('/api/blocks/:category/:blockNumber', async (req, res) => {
  try {
    const { category, blockNumber } = req.params; // Принимаем категорию и номер блока из параметров URL
    const updatedBlock = req.body; // Остальные данные для обновления из тела запроса

    // Чтение данных из blocksData.json
    const blocksData = await fs.promises.readFile(blocksDataFilePath, 'utf-8');
    const blocks = JSON.parse(blocksData);

    console.log('Категория (первая буква):', category[0]);
    console.log('Номер блока:', blockNumber);

    // Поиск нужной категории по первой букве
    const categoryData = blocks.find(cat => cat.category.startsWith(category[0]));
    if (!categoryData) {
      return res.status(404).json({ message: 'Категория не найдена' });
    }

    const block = categoryData.blocks.find(b => b.number === parseInt(blockNumber));
    if (!block) {
      return res.status(404).json({ message: 'Блок не найден' });
    }

    console.log('Данные для обновления:', updatedBlock);

    // Обновление данных блока
    Object.assign(block, updatedBlock);

    // Сохранение обновленных данных
    await fs.promises.writeFile(blocksDataFilePath, JSON.stringify(blocks, null, 2));

    res.json({ message: 'Block successfully updated' });
  } catch (error) {
    console.error('Ошибка обновления блока:', error);
    res.status(500).json({ message: 'Ошибка обновления блока' });
  }
});



// Endpoint to upload files
app.post('/api/upload', upload.fields([{ name: 'image' }, { name: 'secondImage' }, { name: 'voiceMessage' }]), (req, res) => {
  const uploadedFiles = {};
  
  if (req.files['image']) {
    uploadedFiles.imageUrl = `/uploads/${req.files['image'][0].filename}`;
  }
  if (req.files['secondImage']) {
    uploadedFiles.image2Url = `/uploads/${req.files['secondImage'][0].filename}`;
  }
  if (req.files['voiceMessage']) {
    uploadedFiles.voiceMessageUrl = `/uploads/${req.files['voiceMessage'][0].filename}`;
  }
  
  res.json(uploadedFiles);
});

app.delete('/api/delete-file', async (req, res) => {
  const { fileName, category, blockNumber } = req.body; // Получаем имя файла, категорию и номер блока

  const filePath = path.join(__dirname, 'uploads', fileName);

  // Удаляем файл
  fs.unlink(filePath, async (err) => {
    if (err) {
      console.error('Ошибка удаления файла:', err);
      return res.status(500).json({ message: 'Ошибка удаления файла' });
    }

    // Обновляем blocksData.json
    const blocksData = await fs.promises.readFile(blocksDataFilePath, 'utf-8');
    const blocks = JSON.parse(blocksData);

    // Поиск нужной категории по первой букве
    const categoryData = blocks.find(cat => cat.category.startsWith(category[0]));
    if (!categoryData) {
      return res.status(404).json({ message: 'Категория не найдена' });
    }

    // Поиск нужного блока
    const block = categoryData.blocks.find(b => b.number === parseInt(blockNumber));
    if (!block) {
      return res.status(404).json({ message: 'Блок не найден' });
    }

    // Удаляем ссылку на файл
    if (block.imageUrl.endsWith(fileName)) {
      block.imageUrl = ""; // или null, в зависимости от вашего формата
    }
    if (block.image2Url.endsWith(fileName)) {
      block.image2Url = ""; // или null
    }

    if (block.voiceMessageUrl.endsWith(fileName)) {
      block.voiceMessageUrl = ""; // или null
    }

    // Сохраняем обновленные данные
    await fs.promises.writeFile(blocksDataFilePath, JSON.stringify(blocks, null, 2));

    res.json({ message: 'Файл и соответствующая ссылка успешно удалены' });
  });
});


// Функция для загрузки и обработки данных ответов
function loadAnswers() {
  return new Promise((resolve, reject) => {
      // Чтение файла с ответами
      fs.readFile(answersFilePath, 'utf8', (err, data) => {
          if (err) {
              // Если файла нет, возвращаем пустой массив
              if (err.code === 'ENOENT') {
                  console.log('Файл answers.json не найден. Возвращаю пустой массив.');
                  resolve([]);
              } else {
                  console.error('Ошибка при чтении файла answers.json:', err);
                  reject(err);
              }
          } else {
              try {
                  // Если данные успешно прочитаны, пытаемся распарсить их как JSON
                  const parsedData = JSON.parse(data);
                  
                  // Если файл пуст или содержит невалидный формат, возвращаем пустой массив
                  if (!Array.isArray(parsedData)) {
                      console.warn('Ожидался массив ответов, но получен другой формат. Возвращаю пустой массив.');
                      resolve([]);
                  } else {
                      resolve(parsedData);
                  }
              } catch (parseError) {
                  // Обработка ошибки парсинга
                  console.error('Ошибка при парсинге файла answers.json:', parseError);
                  resolve([]);
              }
          }
      });
  });
}

let gameQuestions = [];
let gameDuration = 60; 
let gameStartTime = null;
let gameInterval = null; 

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
  questions: [],
  timeLeft: 0,
  timerId: null,
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


// Пример использования функции
loadAnswers()
    .then(answers => {
        console.log('Загруженные ответы:', answers);
    })
    .catch(err => {
        console.error('Ошибка при загрузке ответов:', err);
    });

module.exports = loadAnswers;


// Загружаем вопросы из файла
const loadQuestions = async () => {
  try {
    const data = await fs.promises.readFile(questionsFilePath, 'utf8');
    const questions = JSON.parse(data);
    console.log("Loaded questions: ", questions); // Лог для проверки
    return questions;
  } catch (error) {
    console.error('Ошибка при чтении файла с вопросами:', error);
    return [];
  }
};


// Сохранение вопросов в файл
const saveQuestions = async (questions) => {
  try {
    await fs.writeFile(questionsFilePath, JSON.stringify(questions, null, 2));
  } catch (error) {
    console.error('Ошибка при сохранении вопросов:', error);
  }
};

loadUsers();
loadAnswers();


// Маршрут для записи действия по категории
app.post('/api/category-action', async (req, res) => {
  const { teamName, category } = req.body;
  
  if (!teamName || !category) {
    return res.status(400).json({ message: 'Team name and category are required.' });
  }

  try {
    let teams = await readTeamsFile(); // Чтение данных из файла
    let team = teams.find(t => t.name === teamName);

    // Если команда не найдена, создаём новую
    if (!team) {
      team = { name: teamName, history: [] };
      teams.push(team);
    }

    // Если нет истории, создаем массив
    if (!team.history) {
      team.history = [];
    }

    // Добавляем новое действие
    const newMove = { category: category, timestamp: new Date().toISOString() };
    team.history.push(newMove);

    // Записываем обновленные данные в файл
    await writeTeamsFile(teams);
    res.status(200).json({ message: 'Action recorded', team: team });

  } catch (error) {
    console.error('Error processing category action:', error);
    res.status(500).json({ message: 'Failed to record action' });
  }
});

// API для записи истории поиска
app.post('/api/save-history', (req, res) => {
  const { teamName, blockNumber, category } = req.body;

  // Загружаем файл с командами
  fs.readFile(teamsFilePath, 'utf8', (err, data) => {
    if (err) {
      return res.status(500).json({ message: 'Ошибка при чтении файла' });
    }

    let teams = JSON.parse(data);
    
    // Находим команду
    const team = teams.find(t => t.username === teamName);
    if (team) {
      // Добавляем запись в историю поиска команды
      if (!team.history) {
        team.history = [];
      }
      team.history.push({
        blockNumber,
        category,
        timestamp: new Date().toISOString()
      });

      // Сохраняем файл с обновленной информацией
      fs.writeFile(teamsFilePath, JSON.stringify(teams, null, 2), (err) => {
        if (err) {
          return res.status(500).json({ message: 'Ошибка при сохранении файла' });
        }
        res.json({ message: 'История поиска сохранена' });
      });
    } else {
      res.status(404).json({ message: 'Команда не найдена' });
    }
  });
});

app.get('/api/get-teams-history', async (req, res) => {
  const { teamName } = req.query;

  if (!teamName) {
    return res.status(400).json({ message: 'Team name is required.' });
  }

  try {
    let teams = await readTeamsFile(); // Reading data from the file
    let team = teams.find(t => t.username === teamName); // Use 'username' instead of 'name'

    if (!team || !team.history) {
      return res.status(404).json({ message: 'Team or team history not found.' });
    }

    res.status(200).json({ teamName: team.username, history: team.history });

  } catch (error) {
    console.error('Error retrieving team history:', error);
    res.status(500).json({ message: 'Failed to retrieve team history' });
  }
});



// Пример логики в статистике
app.get('/api/teams', async (req, res) => {
  try {
    const teams = await readTeamsFile(); // Используем await для асинхронного чтения
    console.log('Serving teams:', teams); // Убедитесь, что команды выводятся
    res.json(teams); // Возвращаем команды клиенту
  } catch (error) {
    console.error('Error fetching teams:', error);
    res.status(500).json({ message: 'Failed to load teams' });
  }
});

// Эндпоинт для получения данных блоков
app.get('/api/blocks', (req, res) => {
  fs.readFile(blocksDataFilePath, 'utf8', (err, data) => {
    if (err) {
      console.error('Ошибка при чтении файла blocksData.json:', err);
      return res.status(500).json({ message: 'Ошибка сервера' });
    }
    try {
      const blocksData = JSON.parse(data);
      res.json(blocksData);
    } catch (parseErr) {
      console.error('Ошибка при парсинге файла blocksData.json:', parseErr);
      res.status(500).json({ message: 'Ошибка сервера' });
    }
  });
});


// Логика добавления пользователей в команды, если они не скрыты и являются user
const addTeamsFromUsers = async () => {
  try {
    // Читаем данные пользователей
    const usersData = await readJsonFile(usersFilePath);
    
    // Читаем данные команд
    const teamsData = await readJsonFile(teamsFilePath);

    // Если данных команд нет, создаем пустой массив
    const teams = Array.isArray(teamsData) ? teamsData : [];

    // Фильтруем пользователей по условиям (role: "user" и isHidden: false)
    const filteredUsers = usersData.users.filter((user) => user.role === 'user' && !user.isHidden);

    // Добавляем отфильтрованных пользователей в команды, если их там еще нет
    filteredUsers.forEach((user) => {
      const existingTeam = teams.find((team) => team.username === user.username);
      if (!existingTeam) {
        teams.push({
          username: user.username,
          role: user.role,
          isPrepared: false,
          inGame: false,
          moves: 0,
          answers: []
        });
      }
    });

    // Записываем обновленные команды в teams.json
    await writeJsonFile(teamsFilePath, teams);
    console.log('Команды успешно обновлены!');
  } catch (error) {
    console.error('Ошибка при обновлении команд:', error);
  }
};

// Пример использования в логине
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  console.log("Попытка логина:", username, password);

  const usersData = await readJsonFile(usersFilePath);
  const user = usersData.users.find((u) => u.username === username && u.password === password);

  if (!user) {
    return res.status(401).json({ message: "Неверные имя пользователя или пароль" });
  }

  // Проверяем, скрыт ли пользователь
  if (user.isHidden) {
    return res.status(403).json({ message: "Ваш аккаунт скрыт. Пожалуйста, обратитесь к администратору." });
  }

  try {
    // Добавляем пользователей в команды, если они являются обычными пользователями и не скрыты
    await addTeamsFromUsers();

    res.status(200).json({ username: user.username, role: user.role });
  } catch (err) {
    console.error('Ошибка добавления команд:', err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Подготовка команды к игре
app.post('/api/prepare-team', (req, res) => {
  const { username } = req.body;

  fs.readFile(teamsFilePath, 'utf-8', (err, data) => {
    if (err) {
      console.error('Ошибка чтения teams.json:', err);
      return res.status(500).json({ message: 'Ошибка сервера' });
    }

    let teams = JSON.parse(data);
    const team = teams.find((team) => team.username === username);

    if (team) {
      team.isPrepared = true;

      fs.writeFile(teamsFilePath, JSON.stringify(teams, null, 2), (err) => {
        if (err) {
          console.error('Ошибка записи в teams.json:', err);
          return res.status(500).json({ message: 'Ошибка сервера' });
        }

        res.status(200).json({ message: 'Команда готова к игре' });
      });
    } else {
      res.status(404).json({ message: 'Команда не найдена' });
    }
  });
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

  const newUser = { username: trimmedUsername, password, role, isHidden: false }; // Добавляем isHidden
  users.push(newUser);
  saveUsers();

  io.emit("userAdded", newUser);

  res.status(201).json(newUser);
});

// Обновить пользователя (включая статус скрытия)
app.put("/api/users/:username", (req, res) => {
  const { username } = req.params;
  const { password, role, isHidden } = req.body;

  const user = users.find((u) => u.username === username);
  if (!user) {
    return res.status(404).json({ message: "Пользователь не найден" });
  }

  if (password) user.password = password;
  if (role) user.role = role;
  if (isHidden !== undefined) user.isHidden = isHidden; // Обновляем isHidden статус
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
    const existingTeam = gameState.teams.find(team => team.name === teamName);
    if (!existingTeam) {
      gameState.teams.push({ name: teamName, moves: 1, points: 0 });
      console.log(`Команда ${teamName} присоединилась к игре и сделала первый ход.`);
    } else {
      existingTeam.moves += 1; // Инкрементируем количество ходов
      console.log(`Команда ${teamName} сделала ход, общее количество ходов: ${existingTeam.moves}`);
    }
    res.status(200).json({ message: `Команда ${teamName} успешно присоединилась или сделала ход.` });
  } else {
    res.status(400).json({ message: "Игра ещё не началась." });
  }
});

// Эндпоинт для обновления ходов
app.post('/api/update-moves', async (req, res) => {
  const { teamName } = req.body; // Получите имя команды из запроса
  const result = await updateMoves(teamName);
  res.json(result);
});

app.get('/api/check-submission', (req, res) => {
  const { team } = req.query; // Получаем команду из параметров запроса
  if (!team) {
    return res.status(400).json({ message: 'Team is required' });
  }

  try {
    const answers = getAnswers(); // Чтение всех данных из файла
    const teamData = answers.find((entry) => entry.team === team); // Поиск данных по команде

    if (teamData) {
      res.json(teamData); // Возвращаем данные для команды
    } else {
      res.status(404).json({ message: 'Team not found' });
    }
  } catch (error) {
    console.error('Error reading answers:', error);
    res.status(500).json({ message: 'Server error' });
  }
});


app.post('/api/answers', (req, res) => {
  const { team, answers } = req.body;

  const filePath = path.join(__dirname, './data/answers.json');

  // Читаем существующие ответы
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      return res.status(500).json({ error: "Failed to read answers file" });
    }

    let existingAnswers;
    try {
      existingAnswers = JSON.parse(data);
      // Проверяем, что данные являются массивом
      if (!Array.isArray(existingAnswers)) {
        console.warn("Expected array but found different data. Initializing empty array.");
        existingAnswers = []; // Инициализируем пустой массив, если структура некорректна
      }
    } catch (parseError) {
      console.error('Ошибка при парсинге файла answers.json:', parseError);
      existingAnswers = []; // В случае ошибки парсинга также инициализируем пустой массив
    }

    console.log('Received answer from team:', team, 'Answers:', answers);


    // Проверяем, есть ли уже ответы от этой команды
    const existingTeamIndex = existingAnswers.findIndex(item => item.team === team);

    const submittedAt = new Date().toISOString();

    console.log('Submitted at:', submittedAt); // Лог для проверки

    if (existingTeamIndex >= 0) {
      // Обновляем
      existingAnswers[existingTeamIndex].answers = answers;
      existingAnswers[existingTeamIndex].submittedAt = submittedAt;
    } else {
      // Добавляем
      existingAnswers.push({ team, answers, submittedAt });
    }

    // Записываем обновленные ответы обратно в файл
    fs.writeFile(filePath, JSON.stringify(existingAnswers, null, 2), (err) => {
      if (err) {
        return res.status(500).json({ error: "Failed to save answers" });
      }
      res.json({ success: true });
    });
  });
});

// Обработчик отправки ответов
app.post('/api/submit-answers', (req, res) => {
  const { team, answers } = req.body;

  // Чтение текущих ответов из файла
  fs.readFile(answersFilePath, 'utf-8', (err, data) => {
    if (err) {
      return res.status(500).json({ error: 'Ошибка чтения файла ответов.' });
    }

    let answersData = [];
    if (data) {
      answersData = JSON.parse(data);
    }

    // Найти команду по имени и обновить её данные
    const teamIndex = answersData.findIndex((t) => t.teamName === team.username);

    if (teamIndex !== -1) {
      // Если команда найдена, обновляем её ответы и ставим флажок "submitted"
      answersData[teamIndex] = {
        ...answersData[teamIndex],
        answers,
        submitted: true, // Обновляем статус
      };
    } else {
      // Если команды нет, добавляем новую запись
      answersData.push({
        teamName: team.username,
        answers,
        submitted: true, // Новый флажок
      });
    }

    // Сохраняем обновлённые данные
    fs.writeFile(answersFilePath, JSON.stringify(answersData, null, 2), (err) => {
      if (err) {
        return res.status(500).json({ error: 'Ошибка записи файла ответов.' });
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
app.get('/api/questions', async (req, res) => {
  try {
    const questions = await loadQuestions();
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

// Пример использования fss для асинхронных операций с файлами
app.post('/api/start-game', async (req, res) => {
  const { duration } = req.body;

  try {
    // Чтение файла с командами
    const teamsData = await fss.readFile(path.join(__dirname, 'data', 'teams.json'), 'utf8');
    let teams = JSON.parse(teamsData);

    // Обновляем статус команд: только подготовленные команды могут войти в игру
    teams = teams.map(team => {
      team.inGame = true;
      team.isPrepared = false; // Сброс флага готовности
      team.history = []; // Очищаем историю команды
      return team;
    });

    // Сохраняем обновленный список команд
    await fss.writeFile(path.join(__dirname, 'data', 'teams.json'), JSON.stringify(teams, null, 2));

    // Чтение файла с вопросами
    const questionsData = await fss.readFile(path.join(__dirname, 'data', 'questions.json'), 'utf8');
    const questions = JSON.parse(questionsData);

    // Обновляем состояние игры на сервере
    gameState.gameStarted = true;
    gameState.questions = questions;

    // Отправляем событие через сокеты
    io.emit('game_started', { questions, timeLeft: duration });

    // Обновляем статус игры на true
    await updateGameStatus(true);

    res.status(200).json({ message: 'Игра началась', questions });
  } catch (error) {
    console.error('Ошибка при старте игры:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Эндпоинт для окончания игры
app.post('/api/end-game', async (req, res) => {
  // Останавливаем таймер
  if (gameState.timerId) {
    clearInterval(gameState.timerId);
  }

  // Обновляем состояние игры
  gameState.gameStarted = false;
  gameState.questions = [];
  gameState.timeLeft = 0;

  // Обновляем статус игры в JSON-файле
  await updateGameStatus(false);

  // Чтение файла с командами
  try {
    const teamsData = await fss.readFile(path.join(__dirname, 'data', 'teams.json'), 'utf-8');
    let teams = JSON.parse(teamsData);

    // Сброс статуса всех команд
    teams = teams.map(team => {
      team.inGame = false;
      team.isPrepared = false;
      return team;
    });

    // Сохранение обновленных данных
    await fss.writeFile(path.join(__dirname, 'data', 'teams.json'), JSON.stringify(teams, null, 2));

    res.status(200).json({ message: 'Игра завершена' });
  } catch (error) {
    console.error('Ошибка чтения teams.json:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});


// API для получения статуса игры
app.get('/api/game-status', (req, res) => {
  try {
    const gameStatus = getGameStatus();
    res.json(gameStatus);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка при получении статуса игры', error });
  }
});

// Обработка сохранения вопросов
app.post('/api/save-questions', (req, res) => {
  const { questions } = req.body;
  
  if (Array.isArray(questions)) {
    saveQuestions(questions); // Сохраняем вопросы в файл
    res.status(200).json({ message: 'Questions saved successfully.' });
  } else {
    res.status(400).json({ message: 'Invalid questions format.' });
  }
});

// Очистка массива ответов
app.post('/api/clear-answers', (req, res) => {
  fs.writeFile('./data/answers.json', JSON.stringify([]), (err) => {
    if (err) {
      console.error('Error clearing answers:', err);
      return res.status(500).json({ message: 'Failed to clear answers' });
    }
    res.json({ message: 'Answers cleared successfully' });
  });
});

// Эндпоинт для отправки ответов
app.post('/api/send-answers', (req, res) => {
  const { team, answers } = req.body;

  // Логика для сохранения ответов в файл answers.json
  const newAnswer = { team, answers };
  answersData.push(newAnswer); // или обновляем ответы

  fs.writeFile(answersFilePath, JSON.stringify(answersData, null, 2), (err) => {
    if (err) {
      console.error('Ошибка записи в answers.json:', err);
      return res.status(500).json({ message: 'Ошибка отправки ответов' });
    }

    // Оповещаем всех подключенных клиентов (особенно админов) об обновлении ответов
    io.emit('new_answer', newAnswer);

    res.status(200).json({ message: 'Ответы отправлены' });
  });
});


// Record Score
app.post('/api/record-score', (req, res) => {
  const { teamId, score } = req.body;
  // Logic to record the score for the team
  res.status(200).send('Score recorded');
});


// Эндпоинт для расчета гонораров
app.post('/api/teams/update-reward', async (req, res) => {
  const { team, reward } = req.body;

  if (!team || reward === undefined) {
    return res.status(400).json({ message: 'Invalid request' });
  }

  try {
    let teams = await readTeamsFile();

    const teamIndex = teams.findIndex(t => t.username === team);
    if (teamIndex === -1) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // Обновляем только поле reward
    teams[teamIndex].reward = reward;

    await writeTeamsFile(teams);

    res.json({ message: 'Reward updated successfully', team: teams[teamIndex] });
  } catch (error) {
    console.error('Error updating reward:', error);
    res.status(500).json({ message: 'Failed to update reward' });
  }
});

// Эндпоинт для очистки гонораров
app.post('/api/teams/clear-reward', async (req, res) => {
  const { team } = req.body;

  if (!team) {
    return res.status(400).json({ message: 'Invalid request' });
  }

  try {
    let teams = await readTeamsFile();

    const teamIndex = teams.findIndex(t => t.username === team);
    if (teamIndex === -1) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // Очищаем только поле reward
    teams[teamIndex].reward = 0;

    await writeTeamsFile(teams);

    res.json({ message: 'Reward cleared successfully', team: teams[teamIndex] });
  } catch (error) {
    console.error('Error clearing reward:', error);
    res.status(500).json({ message: 'Failed to clear reward' });
  }
});

// Эндпоинт для полной очистки данных команды (очков, ходов и гонорара)
app.post('/api/teams/clear-all', async (req, res) => {
  const { team } = req.body;

  if (!team) {
    return res.status(400).json({ message: 'Invalid request' });
  }

  try {
    let teams = await readTeamsFile();

    const teamIndex = teams.findIndex(t => t.username === team);
    if (teamIndex === -1) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // Очищаем поля points, moves и reward
    teams[teamIndex].reward = 0;
    teams[teamIndex].points = 0;
    teams[teamIndex].moves = 0;

    await writeTeamsFile(teams);

    res.json({ message: 'All data cleared successfully', team: teams[teamIndex] });
  } catch (error) {
    console.error('Error clearing all data:', error);
    res.status(500).json({ message: 'Failed to clear all data' });
  }
});

// Эндпоинт для обновления баллов команды
app.post('/api/teams/admin/scores', async (req, res) => {
  const { team, scores } = req.body;

  console.log('Received request to update scores:', { team, scores });

  if (!team || !Array.isArray(scores)) {
    return res.status(400).json({ message: 'Invalid request' });
  }

  try {
    let teams = await readTeamsFile();
    console.log('Current teams data:', teams);

    if (!Array.isArray(teams)) {
      return res.status(500).json({ message: 'Invalid teams data format' });
    }

    const teamIndex = teams.findIndex(t => t.username === team);
    if (teamIndex === -1) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // Обновляем баллы команды
    const totalScore = scores.reduce((acc, item) => acc + item.score, 0);
    teams[teamIndex].points = (teams[teamIndex].points || 0) + totalScore;

    console.log('Updated team data:', teams[teamIndex]);

    await writeTeamsFile(teams);

    res.json({ message: 'Scores updated successfully', teams });
  } catch (error) {
    console.error('Error updating scores:', error);
    res.status(500).json({ message: 'Failed to update scores' });
  }
});


// Пример кода на сервере (Node.js)
app.post('/api/submit-answers', async (req, res) => {
  const { teamName, answers } = req.body;

  // Логика сохранения ответов
  const team = await findTeamByName(teamName);
  if (!team) return res.status(400).send('Команда не найдена');

  // Добавление статуса отправки ответов
  team.answersSubmitted = true;
  team.answers = answers;

  await saveTeamData(team);

  res.send({ message: 'Ответы успешно отправлены' });
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

// Определение функции getQuestions
async function getQuestions() {
  try {
    const questionsData = await fss.readFile(path.join(__dirname, 'data', 'questions.json'), 'utf8');
    return JSON.parse(questionsData);
  } catch (error) {
    console.error('Ошибка при чтении файла с вопросами:', error);
    throw new Error('Не удалось загрузить вопросы');
  }
}

let gameStatus = 'waiting';
const activeTeams = new Set();
let timeLeft; // Время, оставшееся до окончания игры

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

 // При новом подключении отправляем текущее состояние игры
 socket.emit('game_status', { status: gameStatus, timeLeft });

  // Если игра уже началась, отправляем текущие вопросы
  if (gameStatus === 'started') {
    socket.emit('game_started', { questions: gameQuestions, timeLeft });
  }

  socket.on('update_game_status', (status) => {
    // Отправляем статус игры всем подключенным клиентам
    io.emit('game_status', status);
  });

  socket.on('search_in_category', async (team) => {
    try {
      let teams = await fs.promises.readFile(teamsFilePath, 'utf-8');
      teams = teams ? JSON.parse(teams) : [];

      const teamIndex = teams.findIndex(t => t.username === team.username);

      if (teamIndex >= 0) {
        teams[teamIndex].moves = (teams[teamIndex].moves || 0) + 1;

        await writeTeamsFile(teams);

        console.log(`Количество ходов для команды ${team.username} увеличено до ${teams[teamIndex].moves}`);
        io.emit('team_moves_updated', teams);
      } else {
        console.error('Команда не найдена');
      }
    } catch (error) {
      console.error('Ошибка при обновлении количества ходов:', error);
    }
  });

  // Обработка отключений
  socket.on("disconnect", () => {
    const username = Array.from(activeTeams).find(t => t === socket.username);
    if (username) {
      activeTeams.delete(username);
      console.log(`Team disconnected: ${username}`);
      io.emit('update_teams', Array.from(activeTeams)); // Обновление списка команд для всех клиентов
    }
  });

  // Запрос вопросов для команд
  socket.on('request_questions', () => {
    if (gameQuestions && gameQuestions.length > 0) {
      socket.emit('receive_questions', gameQuestions);
    } else {
      socket.emit('receive_questions', []);
    }
  });

  // Обработка ответов от команд
  socket.on('submit_answers', async ({ team, answers }) => {
    try {
      let currentAnswers = await fs.promises.readFile(answersFilePath, 'utf-8');
      currentAnswers = currentAnswers ? JSON.parse(currentAnswers) : [];

      const existingTeamIndex = currentAnswers.findIndex(item => item.team === team.username);
      const submittedAt = new Date().toISOString(); // Получаем текущее время

      if (existingTeamIndex >= 0) {
        currentAnswers[existingTeamIndex].answers = answers;
        currentAnswers[existingTeamIndex].submittedAt = submittedAt; // Обновляем время отправки
      } else {
        currentAnswers.push({ team: team.username, answers, submittedAt }); // Сохраняем время отправки
      }

      await fs.promises.writeFile(answersFilePath, JSON.stringify(currentAnswers, null, 2));
      console.log('Ответы успешно сохранены');
      io.emit('new_answer', { team: team.username, answers, submittedAt }); // Отправляем время отправки
    } catch (err) {
      console.error('Ошибка при обработке ответов:', err);
    }
  });

  // Старт игры и таймера
  socket.on('start_game', (duration) => {
    if (gameInterval) {
      clearInterval(gameInterval);  // Остановить текущий таймер, если игра уже запущена
    }
  
    // Устанавливаем статус игры и сохраняем время
    gameStatus = 'started';
    timeLeft = duration;  // duration в секундах
  
  
    io.emit('game_status', { status: gameStatus, timeLeft });
  
    // Запуск таймера
    gameInterval = setInterval(() => {
      timeLeft -= 1;
      io.emit('timer_update', { minutes: Math.floor(timeLeft / 60), seconds: timeLeft % 60 });
  
      // Когда время истечет, завершаем игру
      if (timeLeft <= 0) {
        clearInterval(gameInterval);
        gameStatus = 'ended';
        io.emit('game_status', { status: gameStatus, message: 'Игра завершена!' });
      }
    }, 1000);
  });
  

  // Принудительное завершение игры
  socket.on('force_message', (message) => {
    io.emit('display_message', message);
  });

  // Завершение игры вручную
  socket.on('game_ended', () => {
    clearInterval(gameInterval); // Остановка таймера при завершении игры
    gameStatus = 'ended'; // Обновляем статус игры
    io.emit('game_status', { status: gameStatus, message: 'Игра завершена!' });
    io.emit('game_ended');
  });
});

// Чтение и запись данных в файлы (обертки для асинхронных функций)
async function readTeamsFile() {
  try {
    const data = await fs.promises.readFile(teamsFilePath, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Ошибка чтения файла команд:', err);
    return [];
  }
}

async function writeTeamsFile(data) {
  try {
    await fs.promises.writeFile(teamsFilePath, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Ошибка записи файла команд:', err);
  }
}

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
