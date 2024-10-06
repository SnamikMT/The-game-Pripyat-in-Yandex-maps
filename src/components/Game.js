import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useGameContext } from './GameContext';
import config from './config';

const Game = ({ team, socket }) => {
  const { gameData, setGameData } = useGameContext();
  const { questions = [], gameStarted, timeLeft } = gameData;
  const [answers, setAnswers] = useState({});
  const [activeTeams, setActiveTeams] = useState([]);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [gameEnded, setGameEnded] = useState(false);

  // Проверяем, отправлял ли игрок ответы
  useEffect(() => {
    const fetchAnswers = async () => {
      try {
        const answersResponse = await axios.get(`${config.apiBaseUrl}/api/answers`);
        const submittedAnswers = answersResponse.data.find(answer => answer.team === team.username);

        setHasSubmitted(!!submittedAnswers); // Преобразуем значение в boolean
      } catch (error) {
        console.error('Error fetching answers:', error);
      }
    };

    fetchAnswers();
  }, [team.username]);

  // Получаем статус игры из gameStatus.json
  useEffect(() => {
    const fetchGameStatus = async () => {
      try {
        const response = await axios.get(`${config.apiBaseUrl}/api/game-status`);
        const { gameStarted } = response.data;

        if (gameStarted) {
          setGameData((prevData) => ({ ...prevData, gameStarted: true }));
        } else {
          setGameData((prevData) => ({ ...prevData, gameStarted: false }));
          setGameEnded(true);
        }
      } catch (error) {
        console.error('Error fetching game status:', error);
      }
    };

    fetchGameStatus();
  }, [setGameData]);

  // Подключение к сокетам и получение статуса игры
  useEffect(() => {
    socket.on('connect', () => {
      console.log('Connected to server');
      socket.emit('request_game_status');
    });

    socket.on('game_status', (status) => {
      if (status.started) {
        setGameData((prevData) => ({
          ...prevData,
          gameStarted: true,
          timeLeft: status.remainingTime,
        }));
      } else {
        setGameData((prevData) => ({ ...prevData, gameStarted: false }));
        setGameEnded(true);
      }
    });

    socket.on('game_started', (gameData) => {
      setGameData((prevData) => ({
        ...prevData,
        questions: gameData.questions,
        gameStarted: true,
        timeLeft: gameData.timeLeft,
      }));
    });

    return () => {
      socket.off('connect');
      socket.off('game_status');
      socket.off('game_started');
    };
  }, [socket, setGameData]);

  // Запрос вопросов, если игра началась
  useEffect(() => {
    if (gameStarted && !hasSubmitted) {
      const fetchQuestions = async () => {
        try {
          const response = await axios.get(`${config.apiBaseUrl}/api/questions`);
          setGameData((prevData) => ({
            ...prevData,
            questions: response.data.questions || [],
          }));
        } catch (error) {
          console.error('Error fetching questions:', error);
        }
      };

      fetchQuestions();
    }
  }, [gameStarted, hasSubmitted, setGameData]);

  // Обработка отправки ответов
  const handleSubmit = () => {
    socket.emit('submit_answers', { team, answers });
    setHasSubmitted(true);
    localStorage.setItem(`hasSubmitted_${team.username}`, 'true');
    localStorage.removeItem(`answers_${team.username}`);
  };

  // Изменение ответов
  const handleAnswerChange = (index, value) => {
    setAnswers((prevAnswers) => {
      const updatedAnswers = { ...prevAnswers, [index]: value };
      localStorage.setItem(`answers_${team.username}`, JSON.stringify(updatedAnswers));
      return updatedAnswers;
    });
  };

  // Получение обновлений по таймеру и командам
  useEffect(() => {
    socket.on('update_teams', (teams) => {
      setActiveTeams(teams);
    });

    socket.on('game_ended', () => {
      setGameEnded(true);
      localStorage.removeItem(`hasSubmitted_${team.username}`);
      localStorage.removeItem(`answers_${team.username}`);
    });

    return () => {
      socket.off('update_teams');
      socket.off('game_ended');
    };
  }, [socket, setGameData, team.username]);

  return (
    <div className="game-container">
      {!hasSubmitted && !gameEnded && (
        <h1 className="title">Вопросы для команды: {team?.username || 'Team not defined'}</h1>
      )}
      {/* Список активных команд */}
      <div className="active-teams">
        <ul>
          {activeTeams.map((activeTeam, index) => (
            <li key={index}>{activeTeam}</li>
          ))}
        </ul>
      </div>

      {/* Блок с вопросами или сообщениями */}
      <div className="questions-container">
        {gameEnded ? (
          <div className="center-message">Игра завершена! Спасибо за участие.</div>
        ) : !hasSubmitted && questions.length ? (
          questions.map((question, index) => (
            <div key={index} className="question-card">
              <p>{question.text}</p>
              <h4>Максимальные баллы: {question.maxScore}</h4>
              <input
                type="text"
                value={answers[index] || ''}
                onChange={(e) => handleAnswerChange(index, e.target.value)}
                placeholder="Ваш ответ"
              />
            </div>
          ))
        ) : hasSubmitted ? (
          <div className="center-message">Ваши ответы были успешно отправлены!</div>
        ) : (
          <div className="center-message">Ожидание вопросов...</div>
        )}
      </div>

      {/* Кнопка отправки ответов */}
      {!hasSubmitted && !gameEnded && (
        <button className="submit-button" onClick={handleSubmit}>
          Отправить ответы
        </button>
      )}
    </div>
  );
};

export default Game;
