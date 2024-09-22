const fs = require('fs');
const path = require('path');

const teamsFilePath = path.join(__dirname, 'data', 'teams.json');

// Функция для чтения teams.json
const getTeamsData = () => {
  try {
    const data = fs.readFileSync(teamsFilePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading teams file:', error);
    return [];
  }
};

// Функция для записи обновленных данных в teams.json
const saveTeamsData = (teams) => {
  try {
    fs.writeFileSync(teamsFilePath, JSON.stringify(teams, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error writing to teams file:', error);
  }
};

// Функция для обработки хода команды (запись действия)
const recordTeamMove = (teamName, category) => {
  let teams = getTeamsData();

  // Поиск команды по имени
  let team = teams.find(t => t.name === teamName);
  
  if (!team) {
    // Если команды нет, создаем новую
    team = {
      name: teamName,
      history: []  // Создаем массив history для новой команды
    };
    teams.push(team);
  }

  // Проверка, есть ли у команды массив history, и создание его, если нет
  if (!team.history) {
    team.history = [];
  }

  // Добавляем новый ход в историю
  team.history.push({
    category: category,
    timestamp: new Date().toISOString(),
  });

  // Сохраняем обновленные данные
  saveTeamsData(teams);

  return team;  // Возвращаем обновленные данные команды
};

// Экспорт функций для использования в других файлах
module.exports = {
  getTeamsData,
  saveTeamsData,
  recordTeamMove,
};
