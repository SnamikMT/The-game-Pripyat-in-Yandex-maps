import React, { useEffect, useState } from 'react';
import axios from 'axios'; 

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
    const loadQuestions = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/questions');
        const loadedQuestions = response.data.questions || [];
        setQuestions(loadedQuestions);
      } catch (error) {
        console.error('Ошибка загрузки вопросов:', error);
      }
    };

    loadQuestions();

    if (team && !joined) {
      socket.emit('join_game', team);
      setJoined(true);
    }

    socket.on('update_teams', (teams) => {
      setActiveTeams(teams);
    });

    socket.on('timer_update', (newTime) => {
      setTimeLeft(newTime);
    });

    return () => {
      socket.off('update_teams');
      socket.off('timer_update');
    };
  }, [joined, team, socket]);

  const handleAnswerChange = (index, value) => {
    setAnswers((prevAnswers) => ({
      ...prevAnswers,
      [index]: value,
    }));
  };

  const handleSubmit = () => {
    socket.emit('submit_answers', { team, answers });
  };

  const handleJoinGame = () => {
    if (team && !joined) {
      socket.emit('join_game', team);
      setJoined(true);
    }
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
    return <div>Ожидание старта игры...</div>;
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
              />
            </div>
          ))
        ) : (
          <div>Ожидание вопросов...</div>
        )}
      </div>
      <button onClick={handleSubmit}>Отправить ответы</button>
    </div>
  );
};

export default Game;
