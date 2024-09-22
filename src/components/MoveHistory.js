import React, { useEffect, useState } from 'react';
import axios from 'axios';

const MoveHistory = () => {
  const [teamMoves, setTeamMoves] = useState([]);

  useEffect(() => {
    const fetchTeamMoves = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/teams'); // Получаем данные из teams.json
        setTeamMoves(response.data);
      } catch (error) {
        console.error('Error fetching team moves:', error);
      }
    };

    fetchTeamMoves();
  }, []);

  return (
    <div className="move-history-container">
      <h2>История ходов</h2>
      {teamMoves.length > 0 ? (
        <table>
          <thead>
            <tr>
              <th>Команда</th>
              <th>Категория</th>
              <th>Время запроса</th>
            </tr>
          </thead>
          <tbody>
            {teamMoves.map((team, index) => (
              <tr key={index}>
                <td>{team.name}</td>
                {team.history && team.history.length > 0 ? (
                  team.history.map((move, moveIndex) => (
                    <tr key={moveIndex}>
                      <td>{team.name}</td>
                      <td>{move.category}</td>
                      <td>{new Date(move.timestamp).toLocaleString()}</td>
                    </tr>
                  ))
                ) : (
                  <td colSpan="3">Нет данных</td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>Данных нет</p>
      )}
    </div>
  );
};

export default MoveHistory;
