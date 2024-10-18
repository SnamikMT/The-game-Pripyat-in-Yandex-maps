import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import config from './config';
import { useContext } from 'react';
import { useGameContext } from './GameContext';
import TimerContext from './TimerContext';

// Функция для форматирования времени
const formatTime = (timeInSeconds) => {
  // Если timeInSeconds не является числом или отрицательное
  if (isNaN(timeInSeconds) || timeInSeconds < 0) {
    return "0:00";
  }
  const minutes = Math.floor(timeInSeconds / 60);
  const seconds = timeInSeconds % 60;
  return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
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

  const [isQuestionSectionVisible, setIsQuestionSectionVisible] = useState(false);
  const [isGameSectionVisible, setIsGameSectionVisible] = useState(false);

  const navigate = useNavigate();

  const { timerDuration } = useContext(TimerContext);

  const [isContactsVisible, setIsContactsVisible] = useState(false);

  // Загрузка вопросов при первом рендере
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
    let interval;

    // Очищаем интервал при завершении игры или размонтировании компонента
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [gameStarted]);

  // Обновление времени через сокет
  useEffect(() => {
    socket.on('timer_update', (timeLeft) => {
      if (timeLeft && !isNaN(timeLeft.minutes) && !isNaN(timeLeft.seconds)) {
        const totalTimeInSeconds = timeLeft.minutes * 60 + timeLeft.seconds;
        setRemainingTime(totalTimeInSeconds);
      } else {
        setRemainingTime(0);  // дефолтное значение при ошибке
      }
    });
  
    return () => {
      socket.off('timer_update');
    };
  }, [socket, setRemainingTime]);
  
  

  // Обработка событий от сокета для начала игры и обновления таймера
  useEffect(() => {
    socket.on('game_started', (questions) => {
      setQuestions(questions);
    });
  
    return () => {
      socket.off('game_started');
    };
  }, [socket, setQuestions]);  


  const toggleActions = () => {
    setShowActions(!showActions);
  };

  const handleMoveHistory = () => {
    setBurgerMenuOpen(false)
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
    const forcedMessage = `На улице к вам подошел мужчина средних лет, представился другом и произнес:\n
  - Меня просили передать, что ищут с вами встречи, есть тут у нас один чудик, в свое время работал на "Юпитере", он-то вас и ждет, говорит, у него для вас интересная информация.\n
  - А где его найти-то, - спрашиваете вы?\n
  - Да "на работе" и найти. Где ж ему быть. На то он и Паша "Юпитер".`;
  
    socket.emit('force_message', forcedMessage);
  };

  const handleSendForcedMessage2 = () => {
    const forcedMessage = `Если вы хотите попасть в помещение по конкретному адресу, а у вас не получается - попробуйте проникнуть в него через крышу`;
  
    socket.emit('force_message2', forcedMessage);
  };
  
  

  const handleStartGame = async () => {
    try {
      if (gameDuration <= 0) {
        setErrorMessage('Длительность игры должна быть больше 0');
        return;
      }
  
      // Очистка предыдущих данных
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('hasSubmitted_')) {
          localStorage.removeItem(key);
        }
      });
      localStorage.removeItem('questions');
  
      // Очистка ответов на сервере
      await axios.post(`${config.apiBaseUrl}/api/clear-answers`);
  
      // Запуск игры на сервере
      const response = await axios.post(`${config.apiBaseUrl}/api/start-game`, {
        duration: gameDuration * 60,
      });
  
      // Эмитирование старта игры через сокет
      socket.emit('start_game', gameDuration * 60);
  
      // Загрузка вопросов с сервера
      const serverQuestions = response.data.questions;
      if (serverQuestions && serverQuestions.length > 0) {
        localStorage.setItem('questions', JSON.stringify(serverQuestions));
        setLocalQuestions(serverQuestions);
        setQuestions(serverQuestions);
      }
  
      setRemainingTime(gameDuration * 60);
      setGameStarted(true);
    } catch (error) {
      setErrorMessage('Ошибка запуска игры');
    }
  };
  

  const handleEndGame = async () => {
    try {
      await axios.post(`${config.apiBaseUrl}/api/end-game`);
      setGameEnded(true);
      setGameStarted(false);
      setRemainingTime(0);
      setQuestions([]);
      localStorage.removeItem('questions');
  
      socket.emit('game_ended', { gameEnded: true });
  
      localStorage.setItem('gameEnded', 'true');
    } catch (error) {
      setErrorMessage('Ошибка завершения игры');
    }
  };

  const confirmAndClearHistory = async () => {
    const isConfirmed = window.confirm('Вы уверены, что хотите очистить историю команд?');
  
    if (isConfirmed) {
      try {
        // Отправляем запрос на очистку истории
        await axios.post(`${config.apiBaseUrl}/api/clear-history`);

      } catch (error) {
        console.error('Ошибка при очистке истории команд:', error);
        setErrorMessage('Ошибка очистки истории');
      }
    } else {
      // Если пользователь отменил действие, можно что-то сделать, если нужно
      console.log('Очистка истории отменена');
    }
  };
  

  const toggleBurgerMenu = () => {
    setBurgerMenuOpen(!burgerMenuOpen);
  };
;


  return (
    <header className="header-container">
      <span className="timer-text">
        <span className="Timer">{formatTime(remainingTime)}</span>
      </span>
      {errorMessage && <p className="error-message">{errorMessage}</p>}
      

      {/* Стандартное меню для десктопа */}
      <nav className={`nav-desktop ${burgerMenuOpen ? 'open' : ''}`}>
        <ul>
        {team.role === 'user' && (
            <>
              <li>
                <Link
                  to="/categories"
                  onClick={() => setBurgerMenuOpen(false)}
                  className="link-button"
                >
                  Играть
                </Link>
              </li>
              <li>
                <Link
                  to="/game"
                  onClick={() => setBurgerMenuOpen(false)}
                  className="link-button"
                >
                  Вопросы
                </Link>
              </li>
              <li>
                <Link
                  to="/maps"
                  onClick={() => setBurgerMenuOpen(false)}
                  className="link-button"
                >
                  Карты
                </Link>
              </li>
         
            </>
          )}
          

          {team.role === 'admin' && (
            <>
            <li>
                <Link
                  to="/categories"
                  onClick={() => setBurgerMenuOpen(false)}
                  className="link-button"
                >
                  Играть
                </Link>
              </li>
            <li>
              <Link to="/manage-teams" className="link-button">
                Команды
              </Link>
            </li>
            <li>
              <button onClick={handleMoveHistory} className="button-style">
                История ходов
              </button>
            </li>
            <li>
              <Link to="/statistics" className="link-button">
                Статистика
              </Link>
            </li>

            </>
          )}
          <li className='log'><button onClick={onLogout} className="logouts">Выход</button></li>
        </ul>
      </nav>


      {/* Бургер-меню для мобильной версии */}
      <nav className={`burger-nav ${burgerMenuOpen ? 'open' : ''}`}>
        <ul>

          {team.role === 'user' && (
            <>
                   <li>
                <Link
                  to="/categories"
                  onClick={() => setBurgerMenuOpen(false)}
                  className="link-button"
                >
                  Играть
                </Link>
              </li>
              <li>
                <Link
                  to="/game"
                  onClick={() => setBurgerMenuOpen(false)}
                  className="link-button"
                >
                  Вопросы
                </Link>
              </li>
              <li>
                <Link
                  to="/maps"
                  onClick={() => setBurgerMenuOpen(false)}
                  className="link-button"
                >
                  Карты
                </Link>
              </li>
          
            </>
          )}
          
          
          {team.role === 'admin' && (
            <>
            <li>
                <Link
                  to="/categories"
                  onClick={() => setBurgerMenuOpen(false)}
                  className="link-button"
                >
                  Играть
                </Link>
              </li>
              <li>
                <Link to="/manage-teams" onClick={() => setBurgerMenuOpen(false)} className="link-button">
                  Команды
                </Link>
              </li>
              <li>
                <button onClick={handleMoveHistory} className="button-style">
                  История ходов
                </button>
              </li>
              <li>
                <Link to="/statistics" onClick={() => setBurgerMenuOpen(false)} className="link-button">
                  Статистика
                </Link>
              </li>
            </>
          )}
          <li className='log'>
            <button onClick={() => { onLogout(); setBurgerMenuOpen(false); }}>Выход</button>
          </li>
        </ul>
      </nav>


      <div className="right-user">
        <span className='users'>{team?.username}</span>
      </div>


      {/* Бургер-меню для мобильной версии */}
      <div className="burger-menu" onClick={toggleBurgerMenu}>
              <div className={`burger-icon ${burgerMenuOpen ? 'open' : ''}`}>
                <div></div>
                <div></div>
                <div></div>
              </div>
            </div>

            
            {team.role === 'admin' && (
  <div className="floating-action-button">
    <button onClick={toggleActions} className="round-button">
      A
    </button>
    {showActions && (
      <div className="popup-actions">
        <button className="close-button" onClick={toggleActions}>X</button>
        <h1 className='adminpanel' style={{ color: '#272727', textAlign: 'center' }}>Админ панель</h1>

        {/* Questions Section */}
        <div className='quest-section'>
          <h3 onClick={() => setIsQuestionSectionVisible(!isQuestionSectionVisible)} className="toggle-section-button">
            {isQuestionSectionVisible ? 'Скрыть вопросы' : 'Показать вопросы'}
          </h3>
          {isQuestionSectionVisible && (
            <div className="question-section">
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
            </div>
          )}
        </div>

        {/* Game Section */}
        <div className='game-section'>
          <h3 onClick={() => setIsGameSectionVisible(!isGameSectionVisible)} className="toggle-section-button">
            {isGameSectionVisible ? 'Скрыть игру' : 'Показать игру'}
          </h3>
          {isGameSectionVisible && (
            <div className="game-section">
              <label className='min'>Длительность игры в (Минутах):</label>
              <input
                className='minut'
                type="number"
                value={gameDuration}
                onChange={(e) => setGameDuration(Number(e.target.value))}
              />
              <button onClick={handleStartGame} className="action-button">Запустить игру</button>
              <button onClick={handleEndGame} className="action-button">Завершить игру</button>
              <button onClick={confirmAndClearHistory} className="action-button">Очистить историю</button>
            </div>
          )}
        </div>

        <div className='game-section'>
          <h3 onClick={() => setIsContactsVisible(!isContactsVisible)} className="toggle-section-button">
            {isContactsVisible ? 'Скрыть контакты' : 'Контакты'}
          </h3>
          {isContactsVisible && (
            <div className="game-section">
              <div className="contacts-section">
                <p><strong>Telegram:</strong> <a href="https://t.me/Snamik" target="_blank" rel="noopener noreferrer">https://t.me/Snamik</a></p>
                <p><strong>Почта:</strong> <a href="mailto:makswarpten@mail.ru">makswarpten@mail.ru</a></p>
                <p><strong>Телефон:</strong> <a href="tel:+79807454816">+79807454816</a></p>
                
                {/* Веселая надпись с эмодзи */}
                <div className="footer-note">
                  😊 Прибыльных и веселых игр! 🎉
                </div>
              </div>
            </div>
          )}
        </div>

        <button onClick={handleSendForcedMessage} className="action-button">
          Отправить игрокам сообщение(Юпитер)
        </button>
        <button onClick={handleSendForcedMessage2} className="action-button">
          Отправить игрокам сообщение(Подсказка)
        </button>

      </div>
    )}
  </div>
)}

    </header>
  );
};

export default Header;
