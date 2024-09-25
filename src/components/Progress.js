import React, { useEffect, useState } from "react";
import axios from 'axios';

import config from './config';


import "../style/style.css";

const Progress = () => {
  const [teamsData, setTeamsData] = useState([]);

  useEffect(() => {
    const fetchTeamsData = async () => {
      try {
        const response = await axios.get(`${config.apiBaseUrl}/api/teams-progress`);
        setTeamsData(response.data.answers); // Получаем данные ответов команд
      } catch (error) {
        console.error("Ошибка при получении данных о прогрессе команд:", error);
      }
    };

    fetchTeamsData();
  }, []);

  return (
    <div>
      <h2>Прогресс команд</h2>

      {/* Таблица с командами */}
      <table className="teams-table">
        <thead>
          <tr>
            <th>Название команды</th>
            <th>Баллы</th>
            <th>Ходы</th>
          </tr>
        </thead>
        <tbody>
          {teamsData.length > 0 ? (
            teamsData.map((team, index) => (
              <tr key={index}>
                <td>{team.team}</td>
                <td>{/* Здесь будут баллы команды */}</td>
                <td>{/* Здесь будут ходы команды */}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="3">Данных о командах пока нет.</td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Карточки с ответами команд */}
      <div className="team-cards-container">
        {teamsData.length > 0 ? (
          teamsData.map((team, index) => (
            <div className="team-card" key={index}>
              <h3>Команда: {team.team}</h3>
              <ul>
                {Object.keys(team.answers).map((key, i) => (
                  <li key={i}>
                    Вопрос {i + 1}: {team.answers[key]}
                  </li>
                ))}
              </ul>
            </div>
          ))
        ) : (
          <p>Данных о командах пока нет.</p>
        )}
      </div>
    </div>
  );
};

export default Progress;
