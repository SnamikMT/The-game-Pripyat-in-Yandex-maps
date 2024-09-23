import React, { useState } from "react";
import axios from "axios";
import '../style/AddUser.css';  // Подключаем стили

const AddUser = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!username || !password || !role) {
      setError("Все поля обязательны");
      return;
    }

    try {
      const response = await axios.post("http://localhost:5000/api/users", {
        username,
        password,
        role,
      });

      if (response.status === 201) {
        setSuccess("Пользователь успешно создан!");
        setError(""); 
        setUsername("");
        setPassword("");
        setRole("");
      }
    } catch (err) {
      console.error("Ошибка при создании пользователя:", err);
      if (err.response && err.response.data) {
        setError(err.response.data.message);
      } else {
        setError("Ошибка при создании пользователя");
      }
    }
  };

  return (
    <div className="add-user-container">
      <h2>Добавить пользователя</h2>
      {error && <p className="error-message">{error}</p>}
      {success && <p className="success-message">{success}</p>}
      <form className="add-user-form" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Имя пользователя"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="form-input"
        />
        <input
          type="password"
          placeholder="Пароль"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="form-input"
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="form-select"
        >
          <option value="">Выберите роль</option>
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>
        <button type="submit" className="submit-button">Добавить</button>
      </form>
    </div>
  );
};

export default AddUser;
