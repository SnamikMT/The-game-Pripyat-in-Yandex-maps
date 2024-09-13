import React, { useState } from "react";
import { TextField, Button, Container, Typography } from "@mui/material";
import axios from "axios";

const Login = ({ onLogin }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("Attempting login with:", username, password);

    try {
      const response = await axios.post("http://localhost:5000/api/login", {
        username,
        password,
      });

      if (response.data) {
        console.log("Login response:", response.data);
        onLogin(response.data);  // Передаем данные пользователя в App.js для изменения состояния
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("Invalid username or password");
    }
  };

  return (
    <Container maxWidth="sm">
      <Typography variant="h4" gutterBottom>
        Login
      </Typography>
      <form onSubmit={handleSubmit}>
        <TextField
          fullWidth
          label="Username"
          variant="outlined"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          style={{ marginBottom: 20 }}
        />
        <TextField
          fullWidth
          label="Password"
          variant="outlined"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ marginBottom: 20 }}
        />
        {error && <Typography color="error">{error}</Typography>}
        <Button fullWidth variant="contained" color="primary" type="submit">
          Login
        </Button>
      </form>
    </Container>
  );
};

export default Login;
