import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

import config from './config';


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
  const [errorMessage, setErrorMessage] = useState('');
  const [burgerMenuOpen, setBurgerMenuOpen] = useState(false); // состояние для бургер-меню
  const [isQuestionListVisible, setIsQuestionListVisible] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const response = await axios.get(`${config.apiBaseUrl}/api/questions`);
        setLocalQuestions(Array.isArray(response.data.questions) ? response.data.questions : []);
      } catch (error) {
        setErrorMessage('Ошибка загрузки вопросов');
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
    if (!newQuestion) {
      setErrorMessage('Введите вопрос');
      return;
    }
    try {
      const response = await axios.post(`${config.apiBaseUrl}/api/add-question`, {
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
      setErrorMessage('Ошибка добавления вопроса');
      console.error('Error adding question:', error);
    }
  };

  const handleDeleteQuestion = async (index) => {
    try {
      const response = await axios.post(`${config.apiBaseUrl}/api/delete-question`, { index });
      setLocalQuestions(Array.isArray(response.data.questions) ? response.data.questions : []);
    } catch (error) {
      setErrorMessage('Ошибка удаления вопроса');
      console.error('Error deleting question:', error);
    }
  };

  const handleSendForcedMessage = () => {
    const forcedMessage = `11:55\n\nНа улице к вам подошел мужчина средних лет, представился другом и произнес:\n- Меня просили передать, что ищут с вами встречи, есть тут у нас один чудик, в свое время работал на "Юпитере", он-то вас и ждет, говорит, у него для вас интересная информация.\n- А где его найти-то, - спрашиваете вы?\n- Да "на работе" и найти. Где ж ему быть. На то он и Паша "Юпитер".`;

    socket.emit('force_message', forcedMessage);
  };

  const handleStartGame = async () => {
    try {
      if (gameDuration <= 0) {
        setErrorMessage('Длительность игры должна быть больше 0');
        return;
      }
      await axios.post(`${config.apiBaseUrl}/api/clear-answers`);
      const response = await axios.post(`${config.apiBaseUrl}/api/start-game`, {
        duration: gameDuration * 60,
      });

      socket.emit('start_game', gameDuration * 60);
      const serverQuestions = response.data.questions;
      if (serverQuestions && serverQuestions.length > 0) {
        setLocalQuestions(serverQuestions);
        setQuestions(serverQuestions);
      }

      setGameStarted(true);
      setRemainingTime(gameDuration * 60);
    } catch (error) {
      setErrorMessage('Ошибка запуска игры');
      console.error('Error starting game:', error);
    }
  };

  const handleEndGame = async () => {
    try {
      await axios.post(`${config.apiBaseUrl}/api/end-game`);
      setGameEnded(true);
      setGameStarted(false);
      socket.emit('game_ended');
    } catch (error) {
      setErrorMessage('Ошибка завершения игры');
      console.error('Error ending game:', error);
    }
  };

  const toggleBurgerMenu = () => {
    setBurgerMenuOpen(!burgerMenuOpen);
  };

  return (
    <header className="header-container">
      <span className="timer-text">Time left: {formatTime(remainingTime)}</span>
      {errorMessage && <p className="error-message">{errorMessage}</p>}

      {/* Бургер-меню для мобильной версии */}
      <div className="burger-menu" onClick={toggleBurgerMenu}>
        <div className={`burger-icon ${burgerMenuOpen ? 'open' : ''}`}>
          <div></div>
          <div></div>
          <div></div>
        </div>
      </div>

      {/* Стандартное меню для десктопа */}
      <nav className={`nav-desktop ${burgerMenuOpen ? 'open' : ''}`}>
        <ul>
          <li><Link to="/categories">Игра</Link></li>
          <li><Link to="/game">Ходы</Link></li>
          <li><Link to="/maps">Карты</Link></li>
          <li><Link to="/statistics">Статистика</Link></li>
          {team.role === 'admin' && (
            <>
              <li><Link to="/manage-teams">Команды</Link></li>
              <li><button onClick={handleMoveHistory} className="his">История ходов</button></li>
            </>
          )}
          <li className='log'><button onClick={onLogout} className="logouts">Выход</button></li>
        </ul>
      </nav>

      {/* Бургер-меню для мобильной версии */}
      <nav className={`burger-nav ${burgerMenuOpen ? 'open' : ''}`}>
          <ul>
            <Link to="/categories">
              <li>Играть</li>
            </Link>
            <Link to="/game">
              <li>Ходы</li>
            </Link>
            <Link to="/maps">
              <li>Карты</li>
            </Link>
            <Link to="/statistics">
              <li>Статистика</li>
            </Link>
            {team.role === 'admin' && (
              <>
                <Link to="/manage-teams">
                  <li>Команды</li>
                </Link>
                <li>
                  <button className="his" onClick={handleMoveHistory}>История ходов</button>
                </li>
              </>
            )}
            <li className='log'>
              <button onClick={onLogout}>Выход</button>
            </li>
          </ul>
        </nav>


      <div className="right-user">
        <span>{team?.username}</span>
      </div>
      {team.role === 'admin' && (
        <div className="floating-action-button">
          <button onClick={toggleActions} className="round-button">
            A
          </button>
          {showActions && (
            <div className="popup-actions">
              <button className="close-button" onClick={toggleActions}>X</button> {/* Кнопка закрытия */}
              <h1 className='adminpanel' style={{ color: '#272727', textAlign: 'center'}}>Админ панель</h1>
              <h3>Создать вопрос</h3>
              <label>Текст Вопроса</label>
              <input
                className="questinput"
                type="text"
                value={newQuestion}
                onChange={(e) => setNewQuestion(e.target.value)}
                placeholder="Начните вводить"
              />
              <label className='questbal'>Минимум баллов:</label>
              <input
                className="questinput"
                type="number"
                value={minScore}
                onChange={(e) => setMinScore(e.target.value)}
                placeholder="Минимум баллов"
              />
              <label className='questbal'>Максимум баллов:</label>
              <input
              className="questinput"
                type="number"
                value={maxScore}
                onChange={(e) => setMaxScore(e.target.value)}
                placeholder="Максимум баллов"
              />
              <button onClick={handleAddQuestion} className="action-button add">Добавить вопрос</button>

              <div>
                <button onClick={() => setIsQuestionListVisible(!isQuestionListVisible)} className="toggle-list-button">
                  {isQuestionListVisible ? 'Скрыть вопросы' : 'Показать вопросы'}
                </button>
                {isQuestionListVisible && (
                  <ul className="question-list">
                    {Array.isArray(localQuestions) && localQuestions.length > 0 ? (
                      localQuestions.map((q, index) => (
                        <li key={index}>
                          {q.text} (Score: {q.minScore} - {q.maxScore})
                          <button onClick={() => handleDeleteQuestion(index)} className="action-button">Удалить</button>
                        </li>
                      ))
                    ) : (
                      <li>No questions available</li>
                    )}
                  </ul>
                )}
              </div>

              <button onClick={handleSendForcedMessage} className="action-button">
                Отправить игрокам сообщение(Юпитер)
              </button>

              <label className='min'>Длительность игры в (Минутах):</label>
              <input
                className='minut'
                type="number"
                value={gameDuration}
                onChange={(e) => setGameDuration(Number(e.target.value))}
              />

              <button onClick={handleStartGame} className="action-button">Запустить игру</button>
              <button onClick={handleEndGame} className="action-button">Завершить игру</button>
            </div>
          )}
        </div>
      )}
    </header>
  );
};

export default Header;
