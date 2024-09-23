const fs = require('fs');
const path = require('path');

// Путь к файлу teams.json
const teamsFilePath = path.join(__dirname, 'data', 'teams.json');

// Функция для чтения данных из teams.json
const getTeamsData = () => {
  try {
    const data = fs.readFileSync(teamsFilePath, 'utf-8');
    return JSON.parse(data);  // Парсим JSON
  } catch (error) {
    console.error('Error reading teams file:', error);
    return [];  // Если файл не найден, возвращаем пустой массив
  }
};

// Функция для сохранения данных в teams.json
const saveTeamsData = (teams) => {
  try {
    fs.writeFileSync(teamsFilePath, JSON.stringify(teams, null, 2), 'utf-8');
    console.log('Teams data successfully saved!');  // Лог для успешной записи
  } catch (error) {
    console.error('Error writing to teams file:', error);
  }
};

// Функция для записи хода команды
const recordTeamMove = (teamName, category) => {
  let teams = getTeamsData();  // Чтение текущих данных

  // Поиск команды по имени
  let team = teams.find(t => t.name === teamName);

  // Если команды нет, создаем новую
  if (!team) {
    console.log(`Creating new team: ${teamName}`);
    team = {
      name: teamName,
      history: []  // Инициализация массива history
    };
    teams.push(team);  // Добавляем команду в массив
  }

  // Проверка, есть ли у команды массив history, если нет - создаем его
  if (!team.history) {
    console.log(`Initializing history for team: ${teamName}`);
    team.history = [];
  }

  // Добавляем новое действие в массив history
  const newMove = {
    category: category,
    timestamp: new Date().toISOString()
  };
  team.history.push(newMove);
  console.log(`Added new move for team ${teamName}:`, newMove);  // Лог для проверки

  // Сохраняем обновленные данные в файл
  saveTeamsData(teams);

  return team;  // Возвращаем обновленную команду
};

// Экспортируем функции для использования в других файлах
module.exports = {
  getTeamsData,
  recordTeamMove,
};
