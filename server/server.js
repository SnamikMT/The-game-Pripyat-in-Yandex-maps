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
const fss = require('fs').promises; // Используем промисы

require('dotenv').config();


const app = express();
const server = http.createServer(app);

app.use(bodyParser.json());

const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000";

app.use(cors({
  origin: CLIENT_URL,
  methods: ["GET", "POST", "PUT", "DELETE"],
}));

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

// Создаем хранилище для файлов с помощью multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Указываем папку для хранения файлов
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9); // Уникальное имя файла с меткой времени и случайным числом
    cb(null, uniqueSuffix + path.extname(file.originalname)); // Добавляем расширение файла
  }
});

const upload = multer({ storage: storage }); // Используем настроенное хранилище

// Статическая папка для доступа к загруженным изображениям
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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


app.put('/api/blocks/:category/:blockNumber', upload.single('image'), (req, res) => {
  const { category, blockNumber } = req.params;
  const { title, description, showDocumentIcon, showVoiceMessageIcon } = req.body;
  const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

  readJsonFile(blocksDataFilePath).then((blocksData) => {
    const categoryData = blocksData.find(c => c.category === category);
    if (!categoryData) {
      return res.status(404).json({ message: 'Category not found' });
    }

    const block = categoryData.blocks.find(b => b.number === parseInt(blockNumber));
    if (!block) {
      return res.status(404).json({ message: 'Block not found' });
    }

    // Удаление старого изображения, если оно заменяется
    if (block.imageUrl && imageUrl && block.imageUrl !== imageUrl) {
      const oldImagePath = path.join(__dirname, 'uploads', path.basename(block.imageUrl));
      fs.unlink(oldImagePath, (err) => {
        if (err && err.code !== 'ENOENT') {
          console.error('Error deleting old image:', err);
        }
      });
    }

    // Обновляем блок данными
    block.title = title || block.title;
    block.description = description || block.description;
    block.imageUrl = imageUrl || block.imageUrl; // Если нет нового изображения, сохраняем старое
    block.showDocumentIcon = showDocumentIcon === 'true'; // Сохраняем статус галочки
    block.showVoiceMessageIcon = showVoiceMessageIcon === 'true'; // Сохраняем статус галочки

    writeJsonFile(blocksDataFilePath, blocksData)
      .then(() => res.json({ message: 'Block successfully updated', imageUrl }))
      .catch((err) => res.status(500).json({ message: 'Error saving block data' }));
  }).catch((err) => {
    console.error('Error reading blocks data:', err);
    res.status(500).json({ message: 'Error reading blocks data' });
  });
});

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

app.put('/api/blocks/:category/:number', upload.fields([{ name: 'image' }, { name: 'image2' }, { name: 'voiceMessage' }]), async (req, res) => {
  const { category, number } = req.params;
  const { title, description } = req.body;
  const image = req.files['image'] ? req.files['image'][0] : null;
  const image2 = req.files['image2'] ? req.files['image2'][0] : null;
  const voiceMessage = req.files['voiceMessage'] ? req.files['voiceMessage'][0] : null;

  try {
    const data = await fs.promises.readFile('./data/blocks.json', 'utf8');
    const blocksData = JSON.parse(data);

    const categoryData = blocksData.find((cat) => cat.category === category);
    if (!categoryData) {
      return res.status(404).json({ message: 'Category not found' });
    }

    const block = categoryData.blocks.find((block) => block.number === parseInt(number));
    if (!block) {
      return res.status(404).json({ message: 'Block not found' });
    }

    // Обновляем данные блока
    block.title = title;
    block.description = description;

    // Обрабатываем первое изображение
    if (image) {
      const imagePath = path.join('uploads', image.filename + path.extname(image.originalname));
      await fs.promises.rename(image.path, imagePath);
      block.imageUrl = `${req.protocol}://${req.get('host')}/${imagePath}`;
    }

    // Обрабатываем второе изображение
    if (image2) {
      const image2Path = path.join('uploads', image2.filename + path.extname(image2.originalname));
      await fs.promises.rename(image2.path, image2Path);
      block.image2Url = `${req.protocol}://${req.get('host')}/${image2Path}`;
    }

    // Обрабатываем голосовое сообщение
    if (voiceMessage) {
      const voiceMessagePath = path.join('uploads', voiceMessage.filename + path.extname(voiceMessage.originalname));
      await fs.promises.rename(voiceMessage.path, voiceMessagePath);
      block.voiceMessageUrl = `${req.protocol}://${req.get('host')}/${voiceMessagePath}`;
    }

    // Сохраняем обновленные данные
    await fs.promises.writeFile('./data/blocks.json', JSON.stringify(blocksData, null, 2));

    res.json({ 
      message: 'Block successfully updated', 
      imageUrl: block.imageUrl, 
      image2Url: block.image2Url,
      voiceMessageUrl: block.voiceMessageUrl 
    });
  } catch (err) {
    console.error('Error processing block update:', err);
    res.status(500).json({ error: 'Error updating block' });
  }
});


// Логин
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  console.log("Попытка логина:", username, password);

  const user = users.find((u) => u.username === username && u.password === password);

  if (!user) {
    return res.status(401).json({ message: "Неверные имя пользователя или пароль" });
  }

  // Проверяем, скрыт ли пользователь
  if (user.isHidden) {
    return res.status(403).json({ message: "Ваш аккаунт скрыт. Пожалуйста, обратитесь к администратору." });
  }

  // Если пользователь не скрыт, продолжаем авторизацию
  fs.readFile(teamsFilePath, 'utf-8', (err, data) => {
    if (err) {
      console.error('Ошибка чтения teams.json:', err);
      return res.status(500).json({ message: 'Ошибка сервера' });
    }

    let teams = JSON.parse(data);
    const existingTeam = teams.find((team) => team.username === user.username);

    if (!existingTeam) {
      teams.push({
        username: user.username,
        role: user.role,
        isPrepared: false, // Новая команда не готова к игре
        inGame: false,
        answers: []
      });

      fs.writeFile(teamsFilePath, JSON.stringify(teams, null, 2), (err) => {
        if (err) {
          console.error('Ошибка записи в teams.json:', err);
          return res.status(500).json({ message: 'Ошибка сервера' });
        }
      });
    }

    res.status(200).json({ username: user.username, role: user.role });
  });
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
      if (team.isPrepared) {
        team.inGame = true;
        team.isPrepared = false; // Сброс флага готовности
      }
      return team;
    });

    // Сохраняем обновленный список команд
    await fss.writeFile(path.join(__dirname, 'data', 'teams.json'), JSON.stringify(teams, null, 2));

    // Чтение файла с вопросами
    const questionsData = await fss.readFile(path.join(__dirname, 'data', 'questions.json'), 'utf8');
    const questions = JSON.parse(questionsData);

    // Отправляем событие через сокеты
    io.emit('game_started', { questions, timeLeft: duration });

    res.status(200).json({ message: 'Игра началась', questions });
  } catch (error) {
    console.error('Ошибка при старте игры:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Эндпоинт для окончания игры
app.post('/api/end-game', (req, res) => {
  fs.readFile(teamsFilePath, 'utf-8', (err, data) => {
    if (err) {
      console.error('Ошибка чтения teams.json:', err);
      return res.status(500).json({ message: 'Ошибка сервера' });
    }

    let teams = JSON.parse(data);

    // Сброс статуса всех команд
    teams = teams.map(team => {
      team.inGame = false;
      team.isPrepared = false;
      return team;
    });

    fs.writeFile(teamsFilePath, JSON.stringify(teams, null, 2), (err) => {
      if (err) {
        console.error('Ошибка записи teams.json:', err);
        return res.status(500).json({ message: 'Ошибка завершения игры' });
      }

      res.status(200).json({ message: 'Игра завершена' });
    });
  });
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

app.post('/api/teams/admin/scores', async (req, res) => {
  const { team, scores } = req.body;

  // Логи
  console.log('Received request to update scores:', { team, scores });

  if (!team || !Array.isArray(scores)) {
    return res.status(400).json({ message: 'Invalid request' });
  }

  try {
    let teams = await readTeamsFile(); // Используем await, так как функция асинхронная
    console.log('Current teams data:', teams);

    // Проверяем, что teams — это массив
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

    // Логируем обновленную команду
    console.log('Updated team data:', teams[teamIndex]);

    // Сохраняем обновленные данные
    await writeTeamsFile(teams); // Сохраняем асинхронно

    res.json({ message: 'Scores updated successfully', teams });
  } catch (error) {
    console.error('Error updating scores:', error);
    res.status(500).json({ message: 'Failed to update scores' });
  }
});

// Обработчик POST-запроса для обновления награды команды
app.post('/api/teams/update-reward', (req, res) => {
  const { team, reward } = req.body;

  // Предположим, что данные команд хранятся в файле или базе данных
  const teams = require('./data/teams.json'); // Загружаем файл с командами

  // Находим команду по имени и обновляем награду
  const teamIndex = teams.findIndex((t) => t.username === team);
  if (teamIndex !== -1) {
    teams[teamIndex].reward = reward;

    // Сохраняем обновленный файл (если используете файл для хранения данных)
    fs.writeFileSync('./data/teams.json', JSON.stringify(teams, null, 2));

    res.status(200).send({ success: true, teams });
  } else {
    res.status(404).send({ error: 'Команда не найдена' });
  }
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

const activeTeams = new Set();
const teams = [];
let timeLeft; // Время, оставшееся до окончания игры

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('join_game', (team) => {
    console.log(`${team.username} присоединился к игре`);
    activeTeams.add(team.username);
    io.emit('update_teams', Array.from(activeTeams));
  });

  // Обработчик подключения команды
  socket.on('team_connected', async (team) => {
    console.log(`Команда ${team.username} подключилась`);

    // Чтение текущих команд из файла
    let currentTeams = await readTeamsFile();

    // Проверка на наличие команды
    const existingTeam = currentTeams.find(t => t.username === team.username);
    if (!existingTeam) {
      // Добавление новой команды
      currentTeams.push(team);
      await writeTeamsFile(currentTeams); // Сохранение обновленных данных

      // Отправка обновленного списка команд всем подключенным клиентам
      io.emit('update_teams', currentTeams);
    }
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
      clearInterval(gameInterval); // Остановить текущий таймер, если игра уже запущена
    }

    timeLeft = duration; // duration уже в секундах
    console.log(`Игра началась на ${duration / 60} минут`);

    gameInterval = setInterval(() => {
      timeLeft -= 1;
      io.emit('timer_update', { minutes: Math.floor(timeLeft / 60), seconds: timeLeft % 60 });
      if (timeLeft <= 0) {
        clearInterval(gameInterval);
        io.emit('game_ended');
      }
    }, 1000);
  });

  socket.on('force_message', (message) => {
    io.emit('display_message', message);
  });  


  // Завершение игры вручную
  socket.on('game_ended', () => {
    clearInterval(gameInterval); // Остановка таймера при завершении игры
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
