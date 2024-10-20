import React, { useState } from "react";
import { TextField, Button, Container, Typography, Box } from "@mui/material";
import axios from 'axios';

import config from './config';

const Login = ({ onLogin }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("Attempting login with:", username, password);
  
    try {
      const response = await axios.post(`${config.apiBaseUrl}/api/login`, {
        username,
        password,
      });
  
      if (response.data) {
        console.log("Login response:", response.data);
        localStorage.setItem("user", JSON.stringify(response.data)); // Сохраняем данные пользователя
        onLogin(response.data); // Передаем данные пользователя в App.js для изменения состояния
      }
    } catch (err) {
      console.error("Login error:", err.response);
      if (err.response && err.response.status === 403) {
        setError("Ваш аккаунт скрыт. Пожалуйста, обратитесь к администратору.");
      } else {
        setError("Неверные имя пользователя или пароль");
      }
    }
  };

  return (
    <Container maxWidth="sm" style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Box 
        sx={{ 
          boxShadow: 3, 
          p: 3, 
          borderRadius: 2, 
          backgroundColor: '#fff', 
          width: '100%' 
        }}
      >
        <Typography variant="h4" gutterBottom align="center">
          Вход
        </Typography>
        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="Название команды"
            variant="outlined"
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase())} // Преобразуем в нижний регистр
            style={{ marginBottom: 20 }}
          />
          <TextField
            fullWidth
            label="Пароль"
            variant="outlined"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ marginBottom: 20 }}
          />
          {error && <Typography color="error" align="center">{error}</Typography>}
          <Button 
            fullWidth 
            variant="contained" 
            sx={{ 
              backgroundColor: '#1f1f1f',  // Белый цвет фона
              color: 'white',  // Черный цвет текста
              fontWeight: 'bold',  // Жирный текст
              '&:hover': { backgroundColor: '#ffeb99', color: '#1f1f1f' }  // Цвет при наведении
            }} 
            type="submit"
          >
            Войти
          </Button>
        </form>
      </Box>
    </Container>
  );
};

export default Login;
