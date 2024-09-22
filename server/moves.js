// moves.js
const fs = require('fs');
const path = require('path');

const teamsFilePath = path.join(__dirname, 'data', 'teams.json');

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

// Функция для записи обновлённых данных в teams.json
const writeTeamsFile = async (teams) => {
  try {
    await fs.promises.writeFile(teamsFilePath, JSON.stringify(teams, null, 2));
    console.log('teams.json успешно обновлён');
  } catch (error) {
    console.error('Error writing to teams.json:', error);
  }
};

// Функция для обновления количества ходов команды
const updateMoves = async (teamName) => {
  const teams = await readTeamsFile();

  const team = teams.find((t) => t.username === teamName);
  
  if (team) {
    team.moves += 1;  // Увеличиваем количество ходов
    await writeTeamsFile(teams);  // Сохраняем изменения в файл
    return { success: true, moves: team.moves };
  } else {
    return { success: false, message: 'Команда не найдена' };
  }
};

module.exports = {
  updateMoves,
};
