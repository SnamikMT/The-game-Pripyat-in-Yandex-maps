import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useGameContext } from './GameContext';
import config from './config';

const formatTime = (timeInSeconds) => {
  if (isNaN(timeInSeconds) || timeInSeconds < 0) return '0:00';
  const minutes = Math.floor(timeInSeconds / 60);
  const seconds = timeInSeconds % 60;
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
};

const Game = ({ team, socket }) => {
  const { gameData, setGameData } = useGameContext();
  const { questions = [], gameStarted, timeLeft } = gameData;
  const [answers, setAnswers] = useState({});
  const [activeTeams, setActiveTeams] = useState([]);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  // Проверка отправки ответов и загрузка статуса из localStorage
  useEffect(() => {
    const storedSubmission = localStorage.getItem(`hasSubmitted_${team.username}`);
    if (storedSubmission) {
      setHasSubmitted(JSON.parse(storedSubmission));
    } else {
      const checkIfSubmitted = async () => {
        try {
          const response = await axios.get(`${config.apiBaseUrl}/api/check-submission`, { params: { team: team.username } });
          if (response.data) {
            setHasSubmitted(true); 
            localStorage.setItem(`hasSubmitted_${team.username}`, true); // Сохранение в localStorage
          }
        } catch (error) {
          console.log("Ошибка проверки отправки ответов:", error); // Выводим ошибку в консоль
        }
      };

      if (team && gameStarted) {
        checkIfSubmitted();
      }
    }
  }, [team, gameStarted]);

  // После отправки сохраняем статус в localStorage
  const handleSubmit = () => {
    socket.emit('submit_answers', { team, answers });
    setGameData((prevData) => ({ ...prevData, submitted: true }));
    setHasSubmitted(true);
    localStorage.setItem(`hasSubmitted_${team.username}`, true); // Сохранение отправки в localStorage
  };

  // Запрос на получение вопросов
  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const response = await axios.get(`${config.apiBaseUrl}/api/questions`);
        const questions = response.data.questions || [];
        setGameData((prevData) => ({
          ...prevData,
          questions,
        }));
      } catch (error) {
        console.log('Ошибка получения вопросов:', error); // Сообщение в консоль
      }
    };

    fetchQuestions();

    socket.on('game_started', (gameData) => {
      setGameData((prevData) => ({
        ...prevData,
        gameStarted: true,
        timeLeft: gameData.timeLeft,
      }));
    });

    socket.on('timer_update', ({ minutes, seconds }) => {
      const totalTimeInSeconds = minutes * 60 + seconds;
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

  // Обработка изменения ответов
  const handleAnswerChange = (index, value) => {
    setAnswers((prevAnswers) => ({
      ...prevAnswers,
      [index]: value,
    }));
  };

  return (
    <div className="game-container">
      <h1>Вопросы для команды: {team?.username || 'Команда не определена'}</h1>
      <div className="active-teams">
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
        {!hasSubmitted && questions.length ? (
          questions.map((question, index) => (
            <div key={index} className="question-card">
              <p>{question.text}</p>
              <p>Максимальные баллы: {question.maxScore}</p>
              <input
                type="text"
                value={answers[index] || ''}
                onChange={(e) => handleAnswerChange(index, e.target.value)}
                placeholder="Ваш ответ"
              />
            </div>
          ))
        ) : hasSubmitted ? (
          <div>Ваши ответы успешно отправлены!</div>
        ) : (
          <div>Ожидание вопросов...</div>
        )}
      </div>

      {!hasSubmitted && (
        <button onClick={handleSubmit}>
          Отправить ответы
        </button>
      )}
    </div>
  );
};

export default Game;
