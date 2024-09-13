import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";
import io from "socket.io-client"; // Подключаем Socket.io клиент
import Login from "./components/Login";
import TeamOptions from "./components/TeamOptions";
import Questions from "./components/Questions";
import Results from "./components/Results";
import Header from "./components/Header";
import Categories from "./components/categories";
import AddTeam from "./components/AddTeam";
import ManageTeams from "./components/ManageTeams";
import Maps from "./components/Maps";
import GameRoom from "./components/GameRoom";

const socket = io("http://localhost:5000"); // Подключаемся к серверу WebSocket

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [team, setTeam] = useState(null);
  const [connectedTeams, setConnectedTeams] = useState([]);

  // Обработка логина
  const handleLogin = (credentials) => {
    if (credentials) {
      setIsAuthenticated(true);
      setTeam(credentials);

      // Отправляем информацию на сервер о новом пользователе
      socket.emit("team_connected", credentials);
    } else {
      alert("Неправильный логин или пароль!");
    }
  };

  // Обработка выхода
  const handleLogout = () => {
    setIsAuthenticated(false);
    setTeam(null);
    socket.emit("team_disconnected", team);
  };

  // При подключении к серверу получаем обновлённый список команд
  useEffect(() => {
    socket.on("connected_teams", (teams) => {
      setConnectedTeams(teams);
    });

    // Очистка при размонтировании компонента
    return () => {
      socket.off("connected_teams");
    };
  }, []);

  return (
    <Router>
      {isAuthenticated ? (
        <>
          <Header team={team} onLogout={handleLogout} />
          <div className="App">
            <Routes>
              <Route path="/categories" element={<Categories />} />
              <Route path="/options" element={<TeamOptions />} />
              <Route path="/questions" element={<Questions />} />
              <Route path="/results" element={<Results teams={connectedTeams} />} />
              <Route path="/maps" element={<Maps />} />
              <Route path="/game" element={<GameRoom team={team} />} />

              {team.role === "admin" && (
                <>
                  <Route path="/add-team" element={<AddTeam />} />
                  <Route path="/manage-teams" element={<ManageTeams />} />
                </>
              )}

              <Route path="*" element={<Navigate to="/categories" />} />
            </Routes>
          </div>
        </>
      ) : (
        <Routes>
          <Route path="/login" element={<Login onLogin={handleLogin} />} />
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      )}
    </Router>
  );
};

export default App;
