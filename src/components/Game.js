// src/components/Game.js
import React, { useEffect, useState } from 'react';

// Функция для форматирования времени
const formatTime = (timeInSeconds) => {
  const minutes = Math.floor(timeInSeconds / 60);
  const seconds = timeInSeconds % 60;
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
};

const Game = ({ team, gameStarted, remainingTime, socket }) => {
  const [joined, setJoined] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [activeTeams, setActiveTeams] = useState([]);

  useEffect(() => {
    if (!joined && team) {
      socket.emit('join_game', team); // Уведомить сервер о присоединении команды
      setJoined(true);
    }

    // Обновление списка активных команд
    socket.on('update_teams', (teams) => {
      setActiveTeams(teams);
    });

    // Получение вопросов после старта игры
    socket.on('game_started', (questions) => {
      setQuestions(questions);
    });

    // Обновление таймера
    socket.on('timer_update', (newTime) => {
      console.log('Обновление таймера:', newTime);
    });

    // Очистка слушателей событий при размонтировании компонента
    return () => {
      socket.off('update_teams');
      socket.off('game_started');
      socket.off('timer_update');
    };
  }, [joined, team, socket]);

  // Если игра не началась
  if (!gameStarted) {
    return <div>Ожидание старта игры...</div>;
  }

  return (
    <div className="game-container">
      <h1>Игра для команды: {team && team.username ? team.username : 'Команда не определена'}</h1>

      {/* Отображение активных команд */}
      <div className="active-teams">
        <h2>Активные команды:</h2>
        <ul>
          {questions.map((question, index) => (
            <li key={index}>{question.text}</li> // Add the "key" prop here
          ))}
        </ul>

      </div>

      {/* Таймер */}
      <div className="timer">
        Оставшееся время: {remainingTime !== null ? formatTime(remainingTime) : 'Время не установлено'}
      </div>

      {/* Отображение вопросов */}
      <div className="questions-container">
        {questions.length ? (
          questions.map((question, index) => (
            <div key={question.id || index} className="question-card"> {/* Уникальный ключ */}
              <p>{question.text}</p>
              {/* Элементы для ввода ответов */}
            </div>
          ))
        ) : (
          <div>Ожидание вопросов...</div>
        )}
      </div>
    </div>
  );
};

export default Game;
