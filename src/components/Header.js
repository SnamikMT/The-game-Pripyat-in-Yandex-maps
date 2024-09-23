import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

// Function to format time
const formatTime = (timeInSeconds) => {
  if (isNaN(timeInSeconds) || timeInSeconds < 0) return '0:00';
  const minutes = Math.floor(timeInSeconds / 60);
  const seconds = timeInSeconds % 60;
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
};


const Header = ({
  team,
  onLogout,
  gameStarted,
  setGameStarted,
  setGameEnded,
  setQuestions,
  remainingTime,
  setRemainingTime,
  socket,
}) => {
  const [showActions, setShowActions] = useState(false);
  const [gameDuration, setGameDuration] = useState(60);
  const [localQuestions, setLocalQuestions] = useState([]);
  const [newQuestion, setNewQuestion] = useState('');
  const [minScore, setMinScore] = useState(0);
  const [maxScore, setMaxScore] = useState(10);

  const navigate = useNavigate();

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/questions');
        setLocalQuestions(Array.isArray(response.data.questions) ? response.data.questions : []);
      } catch (error) {
        console.error('Error loading questions:', error);
      }
    };
    fetchQuestions();
  }, []);

  useEffect(() => {
    socket.on('game_started', (questions) => {
      setQuestions(questions);
    });

    socket.on('timer_update', (timeLeft) => {
      const totalTimeInSeconds = timeLeft.minutes * 60 + timeLeft.seconds;
      setRemainingTime(totalTimeInSeconds);
      if (totalTimeInSeconds <= 0) {
        setRemainingTime(0);
        alert('Время истекло!');
      }
    });

    return () => {
      socket.off('game_started');
      socket.off('timer_update');
    };
  }, [socket, setQuestions, setRemainingTime]);

  const toggleActions = () => {
    setShowActions(!showActions);
  };

  const handleMoveHistory = () => {
    navigate('/move-history');
  };

  const handleAddQuestion = async () => {
    try {
      const response = await axios.post('http://localhost:5000/api/add-question', {
        question: {
          text: newQuestion,
          minScore: Number(minScore),
          maxScore: Number(maxScore),
        },
      });
      setLocalQuestions(Array.isArray(response.data.questions) ? response.data.questions : []);
      setNewQuestion('');
      setMinScore(0);
      setMaxScore(10);
    } catch (error) {
      console.error('Error adding question:', error);
    }
  };

  const handleDeleteQuestion = async (index) => {
    try {
      const response = await axios.post('http://localhost:5000/api/delete-question', { index });
      setLocalQuestions(Array.isArray(response.data.questions) ? response.data.questions : []);
    } catch (error) {
      console.error('Error deleting question:', error);
    }
  };

  const handleStartGame = async () => {
    try {
      await axios.post('http://localhost:5000/api/clear-answers');
      const response = await axios.post('http://localhost:5000/api/start-game', {
        duration: gameDuration * 60, // Передаем в секундах
      });
  
      socket.emit('start_game', gameDuration * 60); // Уведомляем сервер о старте игры с длительностью в секундах
  
      const serverQuestions = response.data.questions;
      if (serverQuestions && serverQuestions.length > 0) {
        setLocalQuestions(serverQuestions);
        setQuestions(serverQuestions);
      }
  
      setGameStarted(true);
      setRemainingTime(gameDuration * 60); // Устанавливаем оставшееся время на клиенте
    } catch (error) {
      console.error('Error starting game:', error);
    }
  };  
  

  const handleEndGame = async () => {
    try {
      await axios.post('http://localhost:5000/api/end-game');
      setGameEnded(true);
      setGameStarted(false);
      socket.emit('game_ended');
    } catch (error) {
      console.error('Error ending game:', error);
    }
  };

  const handleSendForceMessage = () => {
    const message = {
      time: '11:55',
      text: 'На улице к вам подошел мужчина средних лет, представился другом и произнес: Меня просили передать, что ищут с вами встречи, есть тут у нас один чудик, в свое время работал на "Юпитере", он-то вас и ждет, говорит, у него для вас интересная информация.',
    };
  
    socket.emit('force_message', message);
  };
  

  return (
    <header className="header-container">
    <span className="timer-text">Time left: {formatTime(remainingTime)}</span>

      <nav>
        <ul>
          <li><Link to="/categories">Categories</Link></li>
          <li><Link to="/game">Game</Link></li>
          <li><Link to="/statistics">Statistics</Link></li>
          {team.role === 'admin' && (
            <>
              <li><Link to="/manage-teams">Manage Teams</Link></li>
              <li><button onClick={handleMoveHistory}>История ходов</button></li>
            </>
          )}
          <li><button onClick={onLogout}>Logout</button></li>
        </ul>
      </nav>

      <div className="right-user">
        <span>{team?.username}</span>
      </div>

      {team.role === 'admin' && (
        <div className="admin-actions">
          <button onClick={toggleActions} className="action-button">Actions</button>
          {showActions && (
            <div className="dropdown-actions">

          <h3>Send Force Message</h3>
            <button onClick={handleSendForceMessage} className="action-button">
              Send Force Message to All Players
            </button>

              <label>Game Duration (min):</label>
              <input
                type="number"
                value={gameDuration}
                onChange={(e) => setGameDuration(Number(e.target.value))}
              />

              <h3>Create Questions</h3>
              <label>Question:</label>
              <input
                type="text"
                value={newQuestion}
                onChange={(e) => setNewQuestion(e.target.value)}
                placeholder="Enter question text"
              />
              <label>Min Score:</label>
              <input
                type="number"
                value={minScore}
                onChange={(e) => setMinScore(e.target.value)}
                placeholder="Min score"
              />
              <label>Max Score:</label>
              <input
                type="number"
                value={maxScore}
                onChange={(e) => setMaxScore(e.target.value)}
                placeholder="Max score"
              />
              <button onClick={handleAddQuestion} className="action-button">Add Question</button>

              <div>
                <h4>Question List:</h4>
                <ul>
                  {Array.isArray(localQuestions) && localQuestions.length > 0 ? (
                    localQuestions.map((q, index) => (
                      <li key={index}>
                        {q.text} (Score: {q.minScore} - {q.maxScore})
                        <button onClick={() => handleDeleteQuestion(index)} className="action-button">Delete</button>
                      </li>
                    ))
                  ) : (
                    <li>No questions available</li>
                  )}
                </ul>
              </div>

              <button onClick={handleStartGame} className="action-button">Start Game</button>
              <button onClick={handleEndGame} className="action-button">End Game</button>
            </div>
          )}
        </div>
      )}
    </header>
  );
};

export default Header;