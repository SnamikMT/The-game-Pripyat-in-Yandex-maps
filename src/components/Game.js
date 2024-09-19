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
  const [answers, setAnswers] = useState({});
  const [activeTeams, setActiveTeams] = useState([]);
  const [timeLeft, setTimeLeft] = useState(remainingTime);

  useEffect(() => {
    // Присоединение команды к игре
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
      setTimeLeft(newTime);
    });

    // Получение вопросов при монтировании компонента, если игра уже началась
    if (gameStarted) {
      socket.emit('request_questions'); // Запрос на получение вопросов
    }

    socket.on('receive_questions', (questions) => {
      setQuestions(questions);
    });

    // Очистка слушателей событий при размонтировании компонента
    return () => {
      socket.off('update_teams');
      socket.off('game_started');
      socket.off('timer_update');
      socket.off('receive_questions');
    };
  }, [joined, team, gameStarted, socket]);

  const handleAnswerChange = (index, value) => {
    setAnswers((prevAnswers) => ({
      ...prevAnswers,
      [index]: value,
    }));
  };

  const handleSubmit = () => {
    socket.emit('submit_answers', { team, answers });
    console.log('Ответы отправлены:', answers);
  };

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
          {activeTeams.map((team, index) => (
            <li key={index}>{team}</li>
          ))}
        </ul>
      </div>

      {/* Таймер */}
      <div className="timer">
        Оставшееся время: {timeLeft !== null ? formatTime(timeLeft) : 'Время не установлено'}
      </div>

      {/* Отображение вопросов с полями для ввода ответов */}
      <div className="questions-container">
        {questions.length ? (
          questions.map((question, index) => (
            <div key={index} className="question-card">
              <p>{question.text}</p>
              <p>Максимальные баллы: {question.maxScore}</p>
              {/* Поле для ввода ответа */}
              <input
                type="text"
                value={answers[index] || ''}
                onChange={(e) => handleAnswerChange(index, e.target.value)}
                placeholder="Ваш ответ"
              />
            </div>
          ))
        ) : (
          <div>Ожидание вопросов...</div>
        )}
      </div>

      {/* Кнопка для отправки ответов */}
      <button onClick={handleSubmit}>Отправить ответы</button>
    </div>
  );
};

export default Game;
