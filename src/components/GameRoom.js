import React, { useState, useEffect } from "react";
import '../style/style.css';

const GameRoom = ({ team, isAdmin, gameStarted, onStartGame }) => {
  const [answersSubmitted, setAnswersSubmitted] = useState(false); // Отправил ли игрок ответы
  const [isConnected, setIsConnected] = useState(false); // Статус подключения игрока
  const [adminViewingResults, setAdminViewingResults] = useState(false); // Статус показа результатов для админа
  const [players, setPlayers] = useState([]); // Список подключенных игроков

  // Загружаем список игроков из localStorage при первом рендере
  useEffect(() => {
    const savedPlayers = JSON.parse(localStorage.getItem("players")) || [];
    setPlayers(savedPlayers);
  }, []);

  // Сохраняем список игроков в localStorage при его изменении
  useEffect(() => {
    localStorage.setItem("players", JSON.stringify(players));
  }, [players]);

  // Обработка подключения игрока
  const handleConnect = () => {
    if (!isConnected && !players.includes(team.username)) {
      setPlayers((prev) => [...prev, team.username]);
      setIsConnected(true); // Устанавливаем статус подключения
    }
  };

  // Админ завершает игру и может просматривать результаты
  const handleEndGame = () => {
    setAdminViewingResults(true);
  };

  if (adminViewingResults && isAdmin) {
    return (
      <div>
        <h2>Результаты игры</h2>
        <p>Просмотр результатов всех команд...</p>
      </div>
    );
  }

  return (
    <div>
      <h2>Игровая комната</h2>
      {!isConnected && !gameStarted && (
        <button onClick={handleConnect}>Подключиться к игре</button>
      )}

      {isAdmin && !gameStarted && (
        <button onClick={onStartGame} disabled={!players.length}>
          Начать игру
        </button>
      )}

      {gameStarted && !answersSubmitted && isConnected && (
        <div>
          <h3>Отвечайте на вопросы</h3>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              const answers = Array.from(formData.entries()).map(([key, value]) => value);
              setAnswersSubmitted(true);
              console.log(`${team.username} ответил на вопросы:`, answers);
            }}
          >
            <label>
              Вопрос 1: <input type="text" name="question1" required />
            </label>
            <br />
            <label>
              Вопрос 2: <input type="text" name="question2" required />
            </label>
            <br />
            <label>
              Вопрос 3: <input type="text" name="question3" required />
            </label>
            <br />
            <label>
              Вопрос 4: <input type="text" name="question4" required />
            </label>
            <br />
            <label>
              Вопрос 5: <input type="text" name="question5" required />
            </label>
            <br />
            <label>
              Вопрос 6: <input type="text" name="question6" required />
            </label>
            <br />
            <label>
              Вопрос 7: <input type="text" name="question7" required />
            </label>
            <br />
            <button type="submit">Отправить ответы</button>
          </form>
        </div>
      )}

      {answersSubmitted && (
        <div>
          <h3>Спасибо за ваши ответы!</h3>
        </div>
      )}

      {isAdmin && gameStarted && (
        <button onClick={handleEndGame}>Завершить игру</button>
      )}

      <h3>Подключенные игроки:</h3>
      <ul>
        {players.map((player, index) => (
          <li key={index}>{player}</li> // Используем index для уникального ключа
        ))}
      </ul>
    </div>
  );
};

export default GameRoom;
