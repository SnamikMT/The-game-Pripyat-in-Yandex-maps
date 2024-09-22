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

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
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

const questionsFilePath = path.join(__dirname, './data/questions.json');
const answersFilePath = path.join(__dirname, './data/answers.json');


const teamsFilePath = path.join(__dirname, 'data', 'teams.json');

const blocksDataFilePath = path.join(__dirname, './data/blocksData.json');

// Функция для чтения данных из teams.json
const readTeamsFile = async () => {
  try {
    const data = await fs.promises.readFile(teamsFilePath, 'utf-8');
    return JSON.parse(data) || [];
  } catch (error) {
    console.error('Error reading teams file:', error);
    return [];
  }
};

const writeTeamsFile = async (teams) => {
  try {
    await fs.promises.writeFile(teamsFilePath, JSON.stringify(teams, null, 2));
    console.log('teams.json успешно обновлён');
  } catch (error) {
    console.error('Error writing to teams.json:', error);
  }
};

// Создаем хранилище для файлов с помощью multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Указываем папку для хранения файлов
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Уникальное имя файла
  }
});

const upload = multer({ dest: 'uploads/' });

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

loadUsers();
loadAnswers();

const getTeams = async () => {
  try {
    const teams = await readTeamsFile();
    return teams;
  } catch (error) {
    console.error('Error fetching teams:', error);
    return [];
  }
};

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

// Маршрут для обработки действия категории
app.post('/api/category-action', (req, res) => {
  const { teamName, category } = req.body;

  // Записываем действие команды
  const updatedTeam = recordTeamMove(teamName, category);

  res.status(200).json({ message: 'Action recorded', team: updatedTeam });
});

// Пример логики в статистике
app.get('/api/teams', async (req, res) => {
  const teams = await readTeamsFile(); // Используйте await для асинхронного чтения
  console.log('Serving teams:', teams); // Убедитесь, что команды выводятся
  res.json(teams);
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

// API для обновления блока
app.put('/api/blocks/:category/:number', upload.single('image'), (req, res) => {
  const { category, number } = req.params;
  const { title, description } = req.body;
  const image = req.file;

  fs.readFile('./data/blocks.json', 'utf8', (err, data) => {
    if (err) {
      return res.status(500).json({ message: 'Error reading data' });
    }

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

    // Если загружено новое изображение
    if (image) {
      const imagePath = path.join('uploads', image.filename + path.extname(image.originalname));
      fs.rename(image.path, imagePath, (err) => {
        if (err) {
          return res.status(500).json({ message: 'Error saving image' });
        }

        // Обновляем путь к изображению в JSON
        block.imageUrl = `${req.protocol}://${req.get('host')}/${imagePath}`;
      });
    }

    // Сохраняем обновленные данные
    fs.writeFile('./data/blocks.json', JSON.stringify(blocksData, null, 2), (err) => {
      if (err) {
        return res.status(500).json({ message: 'Error saving data' });
      }

      res.json({ message: 'Block successfully updated', imageUrl: block.imageUrl });
    });
  });
});




// Логин
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  console.log("Попытка логина:", username, password);

  const user = users.find((u) => u.username === username && u.password === password);

  if (user) {
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
  } else {
    res.status(401).json({ message: "Неверные имя пользователя или пароль" });
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

    // Проверяем, есть ли уже ответы от этой команды
    const existingTeamIndex = existingAnswers.findIndex(item => item.team === team);

    if (existingTeamIndex >= 0) {
      // Обновляем ответы существующей команды
      existingAnswers[existingTeamIndex].answers = answers;
    } else {
      // Добавляем новые ответы
      existingAnswers.push({ team, answers });
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


// Эндпоинт для начала игры
app.post('/api/start-game', (req, res) => {
  const { duration } = req.body;

  fs.readFile(teamsFilePath, 'utf-8', (err, data) => {
    if (err) {
      console.error('Ошибка чтения teams.json:', err);
      return res.status(500).json({ message: 'Ошибка сервера' });
    }

    let teams = JSON.parse(data);

    // Обновляем статус команд: только готовые команды могут войти в игру
    teams = teams.map(team => {
      if (team.isPrepared) {
        team.inGame = true;
        team.isPrepared = false; // Сброс флага готовности
      }
      return team;
    });

    fs.writeFile(teamsFilePath, JSON.stringify(teams, null, 2), (err) => {
      if (err) {
        console.error('Ошибка записи teams.json:', err);
        return res.status(500).json({ message: 'Ошибка старта игры' });
      }

      res.status(200).json({ message: 'Игра началась' });
    });
  });
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

app.post('/api/teams/admin/scores', (req, res) => {
  const { team, scores } = req.body;

  // Логи
  console.log('Received request to update scores:', { team, scores });

  if (!team || !Array.isArray(scores)) {
    return res.status(400).json({ message: 'Invalid request' });
  }

  let teams = readTeamsFile();
  console.log('Current teams data:', teams);

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
  writeTeamsFile(teams);

  res.json({ message: 'Scores updated successfully', teams });
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

let activeTeams = new Set();
const teams = [];

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
  
    // Read current teams from file
    let currentTeams = await readTeamsFile();
  
    // Check for existing team
    const existingTeam = currentTeams.find(t => t.username === team.username);
    if (!existingTeam) {
      // Add new team
      currentTeams.push(team);
      await writeTeamsFile(currentTeams); // Save updated data
  
      // Emit updated teams to all connected clients
      io.emit('update_teams', currentTeams);
    }
  });  

  socket.on('search_in_category', async (team) => {
    try {
      // Чтение текущих данных из файла teams.json
      let teams = await fs.promises.readFile(teamsFilePath, 'utf-8');
      teams = teams ? JSON.parse(teams) : [];
  
      // Найдите команду в массиве команд
      const teamIndex = teams.findIndex(t => t.username === team.username);
  
      if (teamIndex >= 0) {
        // Увеличьте количество ходов на 1
        teams[teamIndex].moves = (teams[teamIndex].moves || 0) + 1;
  
        // Сохраните обновленные данные
        await writeTeamsFile(teams);
  
        console.log(`Количество ходов для команды ${team.username} увеличено до ${teams[teamIndex].moves}`);
        
        // Отправьте обновленные данные всем клиентам, если нужно
        io.emit('team_moves_updated', teams);
      } else {
        console.error('Команда не найдена');
      }
    } catch (error) {
      console.error('Ошибка при обновлении количества ходов:', error);
    }
  });
  
  

// Usage in your socket event
socket.on('someEvent', async (team) => {
  const teams = await getTeams();
  const existingTeam = teams.find(t => t.username === team.username);
  // Your logic here...
});

  socket.on("disconnect", () => {
    if (activeTeams.has(socket.username)) {
      activeTeams.delete(socket.username);
      console.log(`Team disconnected: ${socket.username}`);
      io.emit('update_teams', Array.from(activeTeams)); // Обновите список команд для всех клиентов
    }
  });

  socket.on('request_questions', () => {
    // Отправить вопросы текущей игры
    if (gameQuestions && gameQuestions.length > 0) {
      socket.emit('receive_questions', gameQuestions);
    } else {
      // Если вопросов нет, можно отправить сообщение об ошибке или пустой массив
      socket.emit('receive_questions', []);
    }
  });  

  socket.on('submit_answers', async ({ team, answers }) => {
    try {
      let currentAnswers = await fs.promises.readFile(answersFilePath, 'utf-8');
      currentAnswers = currentAnswers ? JSON.parse(currentAnswers) : [];
  
      const existingTeamIndex = currentAnswers.findIndex(item => item.team === team.username);
  
      if (existingTeamIndex >= 0) {
        currentAnswers[existingTeamIndex].answers = answers;
      } else {
        currentAnswers.push({ team: team.username, answers });
      }
  
      await fs.promises.writeFile(answersFilePath, JSON.stringify(currentAnswers, null, 2));
      console.log('Ответы успешно сохранены');
      
      // Notify all clients of updated answers
      io.emit('new_answer', { team: team.username, answers });
    } catch (err) {
      console.error('Ошибка при обработке ответов:', err);
    }
  });
  
  

  socket.on('start_game', () => {
    const questions = getQuestions(); // Получите ваши вопросы из базы данных или файла
    socket.emit('game_started', { questions });
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
// Перенесем запуск интервала внутрь функции startGame, чтобы он не запускался при старте сервера

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
