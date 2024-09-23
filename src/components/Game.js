import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useGameContext } from './GameContext';

const formatTime = (timeInSeconds) => {
  if (isNaN(timeInSeconds) || timeInSeconds < 0) return '0:00';
  const minutes = Math.floor(timeInSeconds / 60);
  const seconds = timeInSeconds % 60;
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
};

const Game = ({ team, socket }) => {
  const { gameData, setGameData } = useGameContext();
  const { questions, gameStarted, timeLeft, submitted } = gameData;
  const [joined, setJoined] = useState(() => {
    const savedJoined = localStorage.getItem('joined');
    return savedJoined === 'true';
  });
  const [answers, setAnswers] = useState({});
  const [activeTeams, setActiveTeams] = useState([]);

  useEffect(() => {
    socket.on('game_started', (gameData) => {
      setGameData((prevData) => ({
        ...prevData,
        gameStarted: true,
        questions: gameData.questions,
        timeLeft: gameData.timeLeft,
      }));
      console.log('Game started with time:', gameData.timeLeft);
    });

    socket.on('timer_update', ({ minutes, seconds }) => {
      const totalTimeInSeconds = minutes * 60 + seconds;
      console.log('Received time from server:', totalTimeInSeconds);
      setGameData((prevData) => ({ ...prevData, timeLeft: totalTimeInSeconds }));
      if (totalTimeInSeconds <= 0) {
        alert('Время истекло!');
        setGameData((prevData) => ({ ...prevData, timeLeft: 0 }));
      }
    });

    socket.on('update_teams', (teams) => {
      setActiveTeams(teams);
    });

    return () => {
      socket.off('game_started');
      socket.off('timer_update');
      socket.off('update_teams');
    };
  }, [socket, setGameData]);

  const handleJoinGame = () => {
    if (team && !joined) {
      socket.emit('join_game', team);
      setJoined(true);
      localStorage.setItem('joined', 'true');
    }
  };

  const handleAnswerChange = (index, value) => {
    if (!submitted) {
      setAnswers((prevAnswers) => ({
        ...prevAnswers,
        [index]: value,
      }));
    }
  };

  const handleSubmit = () => {
    socket.emit('submit_answers', { team, answers });
    setGameData((prevData) => ({ ...prevData, submitted: true }));
  };

  if (!joined) {
    return (
      <div className="game-container">
        <h1>Присоединиться к игре</h1>
        <button onClick={handleJoinGame}>Подключиться к игре</button>
      </div>
    );
  }

  if (!gameStarted) {
    return (
      <div className="waiting-container">
        <h2 className="waiting-message">Ожидание старта игры...</h2>
      </div>
    );
  }

  return (
    <div className="game-container">
      <h1>Игра для команды: {team?.username || 'Команда не определена'}</h1>
      <div className="active-teams">
        <h2>Активные команды:</h2>
        <ul>
          {activeTeams.map((activeTeam, index) => (
            <li key={index}>{activeTeam}</li>
          ))}
        </ul>
      </div>
      <div className="timer">
        Оставшееся время: {formatTime(timeLeft)}
      </div>

      <div className="questions-container">
        {questions.length ? (
          questions.map((question, index) => (
            <div key={index} className="question-card">
              <p>{question.text}</p>
              <p>Максимальные баллы: {question.maxScore}</p>
              <input
                type="text"
                value={answers[index] || ''}
                onChange={(e) => handleAnswerChange(index, e.target.value)}
                placeholder="Ваш ответ"
                disabled={submitted}
              />
            </div>
          ))
        ) : (
          <div>Ожидание вопросов...</div>
        )}
      </div>

      <button onClick={handleSubmit} disabled={submitted}>Отправить ответы</button>

      {submitted && (
        <div className="submission-message">
          Ваши ответы успешно отправлены!
        </div>
      )}
    </div>
  );
};

export default Game;
