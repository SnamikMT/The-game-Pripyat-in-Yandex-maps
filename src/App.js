import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";
import io from "socket.io-client";
import axios from "axios";
import Login from "./components/Login";
import TeamOptions from "./components/TeamOptions";
import Questions from "./components/Questions";
import Results from "./components/Results";
import Header from "./components/Header";
import Categories from "./components/Categories";
import AddTeam from "./components/AddTeam";
import ManageTeams from "./components/ManageTeams";
import Maps from "./components/Maps";
import AdminStatistics from "./components/AdminStatistics";
import Progress from "./components/Progress";
import Game from "./components/Game";
import AddQuestion from "./components/AddQuestion";
import MoveHistory from './components/MoveHistory';
import { GameProvider } from './components/GameContext';
import MessagePopup from './components/MessagePopup';
import config from './components/config';
import { TimerProvider } from './components/TimerContext';
import TeamHistoryCard from './components/TeamHistoryCard'; // Adjust the path as necessary

const socket = io(config.socketUrl);

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [team, setTeam] = useState(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameEnded, setGameEnded] = useState(false);
  const [remainingTime, setRemainingTime] = useState(null);
  const [teamsData, setTeamsData] = useState([]);
  const [answersData, setAnswersData] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [message, setMessage] = useState(null);
  const [hintMessage, setHintMessage] = useState("");

  // Fetch questions when component mounts
  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const response = await axios.get(`${config.apiBaseUrl}/api/questions`);
        setQuestions(response.data);
      } catch (error) {
        console.error("Error fetching questions:", error);
      }
    };
    fetchQuestions();
  }, []);

  useEffect(() => {
    if (gameStarted && remainingTime > 0) {
      const timerInterval = setInterval(() => {
        setRemainingTime((prevTime) => {
          if (prevTime <= 1) {
            clearInterval(timerInterval);
            setGameEnded(true);
            setGameStarted(false);
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);
  
      return () => clearInterval(timerInterval);
    }
  }, [gameStarted, remainingTime]); // добавлено remainingTime

  // Fetch team and answers data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [teamsResponse, answersResponse] = await Promise.all([
          axios.get(`${config.apiBaseUrl}/api/teams`),
          axios.get(`${config.apiBaseUrl}/api/answers`),
        ]);
        setTeamsData(teamsResponse.data || []);
        setAnswersData(answersResponse.data.answers || []);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    axios.get(`${config.apiBaseUrl}/api/teams`)
      .then(response => {
        console.log('Teams data:', response.data); // Лог ответа с сервера
        setTeamsData(response.data || []);
      })
      .catch(error => console.error('Error fetching teams:', error));
  }, []);
  

  useEffect(() => {
    socket.on("update_teams", (teams) => {
      console.log('Received updated teams data:', teams);
      setTeamsData(teams); // Обновление данных команд на клиенте
    });
  
    return () => {
      socket.off("update_teams");
    };
  }, []);
  
  

  // Socket event listeners
  useEffect(() => {
    socket.on("connect", () => {
      console.log("Socket connected:", socket.id);
    });

    socket.on("disconnect", () => {
      console.log("Socket disconnected");
    });

    if (team?.username) {
      socket.on("team_joined", (teamName) => {
        if (team?.username) {
          socket.on("team_joined", (teamName) => {
            if (teamName === team.username) {
              console.log(`${teamName} присоединилась к игре`);
            }
          });
        }
        
      });
    }

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("team_joined");
    };
  }, [team?.username]);

  useEffect(() => {
    socket.on('display_message', (message) => {
      setMessage(message);
    });
  
    socket.on('display_hint', (hint) => {
      setHintMessage(hint);
    });
  
    return () => {
      socket.off('display_message');
      socket.off('display_hint');
    };
  }, []);

  useEffect(() => {
    socket.on('game_ended', () => {
      setRemainingTime(0); // Обнуляем таймер
      setGameEnded(true);  // Показываем сообщение о завершении игры
      localStorage.setItem('gameEnded', 'true');  // Сохраняем состояние в localStorage
    });
  
    return () => {
      socket.off('game_ended');
    };
  }, [socket]);

  useEffect(() => {
    const gameEndedStatus = localStorage.getItem('gameEnded');
    if (gameEndedStatus === 'true') {
      setGameEnded(true);
      setRemainingTime(0); // Обнуляем таймер
    }
  }, []);

  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      const userData = JSON.parse(savedUser);
      setIsAuthenticated(true);
      setTeam(userData);
      socket.emit("team_connected", userData); // Восстановление подключения команды через сокет
    }
  }, []);
  

  // Handle login
  const handleLogin = (credentials) => {
    if (credentials) {
      setIsAuthenticated(true);
      setTeam(credentials);
      socket.emit("team_connected", credentials);
    } else {
      alert("Неправильный логин или пароль!");
    }
  };

  // Handle logout
  const handleLogout = () => {
    if (team) {
      socket.emit("team_disconnected", team.username);
    }
    localStorage.removeItem("user"); // Удаляем данные пользователя
    setIsAuthenticated(false);
    setTeam(null);
  };
  
  // Handle joining the game
  const handleJoinGame = async () => {
    const teamName = team?.username;
    if (!teamName) {
      console.error("Team name is missing.");
      return;
    }
  
    try {
      const response = await axios.post(`${config.apiBaseUrl}/api/join-game`, { teamName });
      console.log('Join game response:', response.data);
    } catch (error) {
      console.error('Error joining game:', error.response?.data || error.message);
    }
  };
  

  // Handle starting the game
  const handleStartGame = async () => {
    try {
      const response = await axios.post(`${config.apiBaseUrl}/api/start-game`);
      setGameStarted(true);
      setRemainingTime(response.data.duration);
  
      // Отправляем информацию всем клиентам
      socket.emit('update_game_status', { started: true, remainingTime: response.data.duration });
  
      console.log("Игра началась успешно.");
    } catch (error) {
      console.error("Ошибка при старте игры:", error.response?.data || error.message);
    }
  };
  
  const handleEndGame = async () => {
    try {
      await axios.post(`${config.apiBaseUrl}/api/end-game`);
      setGameStarted(false);
      setGameEnded(true);
  
      // Отправляем информацию всем клиентам
      socket.emit('update_game_status', { started: false });
  
      console.log("Игра завершена.");
    } catch (error) {
      console.error("Ошибка при завершении игры:", error.response?.data || error.message);
    }
  };
  

  // Handle calculating reward
  const handleCalculateReward = () => {
    const updatedTeams = teamsData.map((team) => {
      const reward = team.points * 100;
      return { ...team, reward };
    });
    setTeamsData(updatedTeams);
  };

  // Handle team preparation
  const handlePrepare = async () => {
    try {
      if (team && team.username) {
        await axios.post(`${config.apiBaseUrl}/api/prepare`, { teamName: team.username });
        console.log("Команда подготовилась.");
      }
    } catch (error) {
      console.error("Ошибка при подготовке команды:", error.response?.data || error.message);
    }
  };

  // Format remaining time
  const formatTime = (timeInSeconds) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = timeInSeconds % 60;
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  const closePopup = () => {
    setMessage(null);
    setHintMessage(null);
  };

  return (
    <TimerProvider socket={socket}>
      <Router>
        {isAuthenticated ? (
          <>
            <Header
              team={team}
              onLogout={handleLogout}
              onStartGame={handleStartGame}
              onEndGame={handleEndGame}
              onCalculateReward={handleCalculateReward}
              gameStarted={gameStarted}
              setGameStarted={setGameStarted}
              setGameEnded={setGameEnded}
              setRemainingTime={setRemainingTime}
              setQuestions={setQuestions}
              socket={socket}
              onPrepare={handlePrepare}
              remainingTime={remainingTime}
            />


            <div className="App">
              <GameProvider>
                <Routes>
                  <Route path="/categories" element={<Categories team={team} />} />
                  <Route path="/options" element={<TeamOptions />} />
                  <Route
                    path="/game"
                    element={
                      <Game
                        team={team}
                        gameStarted={gameStarted}
                        remainingTime={remainingTime}
                        formatTime={formatTime}
                        socket={socket}
                        onJoinGame={handleJoinGame}
                      />
                    }
                  />
                  <Route
                    path="/questions"
                    element={<Questions team={team} gameStarted={gameStarted} questions={questions} />}
                  />
                  <Route path="/results" element={<Results />} />
                  <Route path="/maps" element={<Maps />} />
                  <Route
                    path="/statistics"
                    element={
                      <AdminStatistics
                        gameEnded={gameEnded}
                        remainingTime={remainingTime}
                        formatTime={formatTime}
                        teamsData={teamsData}
                        answersData={answersData}
                        team={team}
                      />
                    }
                  />
                  {team?.role === "admin" && (
                    <>
                      <Route path="/add-team" element={<AddTeam />} />
                      <Route path="/manage-teams" element={<ManageTeams />} />
                      <Route path="/progress" element={<Progress teamsData={teamsData} />} />
                      <Route path="/move-history" element={<MoveHistory />} />
                      <Route path="/add-question" element={<AddQuestion />} />
                    </>
                  )}
                  <Route path="*" element={<Navigate to={team?.role === 'admin' ? "/manage-teams" : "/categories"} />} />
                </Routes>
              </GameProvider>
            </div>

            {message && <MessagePopup message={{ time: "СООБЩЕНИЕ", text: message.replace(/\n/g, "<br />") }} onClose={closePopup} />}
            {hintMessage && <MessagePopup message={{ time: "Подсказка", text: hintMessage.replace(/\n/g, "<br />") }} onClose={closePopup} />}
          </>
        ) : (
          <Login onLogin={handleLogin} />
        )}
      </Router>
    </TimerProvider>
  );
};

export default App;
