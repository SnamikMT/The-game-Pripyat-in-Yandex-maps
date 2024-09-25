import React, { useState } from "react";
import axios from 'axios';

import config from './config';

const AddTeam = () => {  
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("user");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const trimmedUsername = username.trim().toLowerCase();
      await axios.post(`${config.apiBaseUrl}/api/users`, {
        username: trimmedUsername,
        password,
        role,
      });

      setMessage("Команда успешно добавлена!");
    } catch (error) {
      if (error.response) {
        setMessage(error.response.data.message || "Ошибка при добавлении команды");
      } else {
        setMessage("Ошибка при добавлении команды");
      }
      console.error("Error adding team:", error);
    }
  };

  return (
    <div>
      <h2>Добавить команду</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Логин"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Пароль"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <select value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>
        <button type="submit">Добавить команду</button>
      </form>
      {message && <p>{message}</p>}
    </div>
  );
};

export default AddTeam;
