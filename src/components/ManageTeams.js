import React, { useState, useEffect } from "react";
import io from "socket.io-client";
import AddUser from "./AddUser"; 
import '../style/ManageTeams.css';  // Подключаем стили

const socket = io("http://localhost:5000");

const ManageTeams = () => {
  const [teams, setTeams] = useState([]);
  const [error, setError] = useState("");
  const [viewHidden, setViewHidden] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [editMode, setEditMode] = useState(null); // Состояние редактирования
  const [editData, setEditData] = useState({ username: "", password: "" }); // Данные для редактирования

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const response = await fetch("http://localhost:5000/api/users");
        const data = await response.json();
        setTeams(data);
      } catch (error) {
        setError("Ошибка при загрузке пользователей");
      }
    };

    fetchTeams();

    socket.on("userAdded", (newUser) => {
      setTeams((prevTeams) => [...prevTeams, newUser]);
    });

    socket.on("userUpdated", (updatedUser) => {
      setTeams((prevTeams) =>
        prevTeams.map((user) =>
          user.username === updatedUser.username ? updatedUser : user
        )
      );
    });

    socket.on("userDeleted", (username) => {
      setTeams((prevTeams) =>
        prevTeams.filter((user) => user.username !== username)
      );
    });

    return () => {
      socket.off("userAdded");
      socket.off("userUpdated");
      socket.off("userDeleted");
    };
  }, []);

  const handleDelete = async (username) => {
    try {
      const response = await fetch(`http://localhost:5000/api/users/${username}`, {
        method: "DELETE",
      });

      if (response.ok) {
        socket.emit("deleteUser", username); 
      } else {
        setError("Ошибка при удалении пользователя");
      }
    } catch (error) {
      setError("Ошибка при удалении пользователя");
    }
  };

  const handleEdit = (team) => {
    setEditMode(team.username);
    setEditData({ username: team.username, password: "" });
  };

  const handleSaveEdit = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/users/${editData.username}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username: editData.username, password: editData.password }),
      });

      if (response.ok) {
        socket.emit("updateUser", editData); 
        setEditMode(null); // Выйти из режима редактирования
      } else {
        setError("Ошибка при обновлении пользователя");
      }
    } catch (error) {
      setError("Ошибка при обновлении пользователя");
    }
  };

  const filteredTeams = teams
    .filter((team) => team.isHidden === viewHidden)
    .filter((team) =>
      team.username.toLowerCase().includes(searchQuery.toLowerCase())
    );

  return (
    <div className="manage-teams-container">
      <h2 className="comand">Управление командами</h2>
      {error && <p>{error}</p>}

      <AddUser />

      <div className="buttons-container">
        <button 
          onClick={() => setViewHidden(false)} 
          className={`toggle-button ${!viewHidden ? "active" : ""}`}
        >
          Активные
        </button>
        <button 
          onClick={() => setViewHidden(true)} 
          className={`toggle-button ${viewHidden ? "active" : ""}`}
        >
          Скрытые
        </button>
      </div>

      <div className="search-container">
        <input
          type="text"
          placeholder="Поиск по имени пользователя"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
      </div>

      <ul className="teams-list">
        {filteredTeams.length === 0 ? (
          <p>Нет пользователей в этом разделе.</p>
        ) : (
          filteredTeams.map((team) => (
            <li key={team.username} className="team-item">
              {editMode === team.username ? (
                <div className="edit-container">
                  <input
                    type="text"
                    value={editData.username}
                    onChange={(e) =>
                      setEditData({ ...editData, username: e.target.value })
                    }
                    placeholder="Новый логин"
                  />
                  <input
                    type="password"
                    value={editData.password}
                    onChange={(e) =>
                      setEditData({ ...editData, password: e.target.value })
                    }
                    placeholder="Новый пароль"
                  />
                  <button className="save-button" onClick={handleSaveEdit}>
                    Сохранить
                  </button>
                </div>
              ) : (
                <>
                  {team.username} - {team.role}
                  <button
                    className="edit-button"
                    onClick={() => handleEdit(team)}
                  >
                    Изменить
                  </button>
                  <button
                    className="delete-button"
                    onClick={() => handleDelete(team.username)}
                  >
                    Удалить
                  </button>
                </>
              )}
            </li>
          ))
        )}
      </ul>
    </div>
  );
};

export default ManageTeams;
