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

const socket = io("http://localhost:5000");

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [team, setTeam] = useState(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameEnded, setGameEnded] = useState(false);
  const [remainingTime, setRemainingTime] = useState(null);
  const [teamsData, setTeamsData] = useState([]);
  const [answersData, setAnswersData] = useState([]);
  const [questions, setQuestions] = useState([]);

  // Fetch questions when component mounts
  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const response = await axios.get("http://localhost:5000/api/questions");
        setQuestions(response.data);
      } catch (error) {
        console.error("Error fetching questions:", error);
      }
    };
    fetchQuestions();
  }, []);

  // Timer setup when game starts
  useEffect(() => {
    if (gameStarted) {
      const timerInterval = setInterval(() => {
        setRemainingTime((prevTime) => {
          if (prevTime <= 0) {
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
  }, [gameStarted]);

  // Fetch team and answers data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [teamsResponse, answersResponse] = await Promise.all([
          axios.get("http://localhost:5000/api/teams"),
          axios.get("http://localhost:5000/api/answers"),
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
    axios.get('http://localhost:5000/api/teams')
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
      const response = await axios.post('http://localhost:5000/api/join-game', { teamName });
      console.log('Join game response:', response.data);
    } catch (error) {
      console.error('Error joining game:', error.response?.data || error.message);
    }
  };
  

  // Handle starting the game
  const handleStartGame = async () => {
    try {
      const response = await axios.post("http://localhost:5000/api/start-game");
      setGameStarted(true);
      setRemainingTime(response.data.duration);
      console.log("Игра началась успешно.");
    } catch (error) {
      console.error("Ошибка при старте игры:", error.response?.data || error.message);
    }
  };

  // Handle ending the game
  const handleEndGame = async () => {
    try {
      await axios.post("http://localhost:5000/api/end-game");
      setGameStarted(false);
      setGameEnded(true);
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
        await axios.post("http://localhost:5000/api/prepare", { teamName: team.username });
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

  return (
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
            socket={socket}
            onPrepare={handlePrepare}
            setQuestions={setQuestions}
            remainingTime={remainingTime}
          />
          <div className="App">
            <Routes>
            // Измените строку в App.js
              <Route path="/categories" element={<Categories team={team} />} />
              <Route path="/options" element={<TeamOptions />} />
              <Route
                path="/questions"
                element={<Questions team={team} gameStarted={gameStarted} questions={questions} />}
              />
              <Route path="/results" element={<Results />} />
              <Route path="/maps" element={<Maps />} />
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
              {team?.role === "admin" && (
                <>
                  <Route path="/add-team" element={<AddTeam />} />
                  <Route path="/manage-teams" element={<ManageTeams />} />
                  <Route path="/progress" element={<Progress teamsData={teamsData} />} />
                  <Route
                    path="/statistics"
                    element={
                      <AdminStatistics
                        gameEnded={gameEnded}
                        remainingTime={remainingTime}
                        formatTime={formatTime}
                        teamsData={teamsData}
                        answersData={answersData}
                      />
                    }
                  />
                  <Route path="/add-question" element={<AddQuestion />} />
                </>
              )}
              <Route path="*" element={<Navigate to="/game" />} />
            </Routes>
          </div>
        </>
      ) : (
        <Login onLogin={handleLogin} />
      )}
    </Router>
  );
};

export default App;
