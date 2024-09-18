import React, { useEffect, useState } from "react";
import axios from "axios";

const AdminAnswers = () => {
  const [teamsWithAnswers, setTeamsWithAnswers] = useState([]);
  const [teamsWithoutAnswers, setTeamsWithoutAnswers] = useState([]);

  useEffect(() => {
    const fetchAnswers = async () => {
      try {
        const response = await axios.get("http://localhost:5000/api/answers");
        const teamsData = response.data;
        
        // Разделяем команды с ответами и без
        const answeredTeams = teamsData.filter(team => team.answers.length > 0);
        const unansweredTeams = teamsData.filter(team => team.answers.length === 0);
        
        setTeamsWithAnswers(answeredTeams);
        setTeamsWithoutAnswers(unansweredTeams);
      } catch (error) {
        console.error("Ошибка при получении ответов команд:", error);
      }
    };

    fetchAnswers();
  }, []);

  return (
    <div>
      <h2>Ответы команд</h2>

      <h3>Команды, которые ответили:</h3>
      {teamsWithAnswers.length > 0 ? (
        <table>
          <thead>
            <tr>
              <th>Команда</th>
              <th>Ответы</th>
            </tr>
          </thead>
          <tbody>
            {teamsWithAnswers.map((team, index) => (
              <tr key={index}>
                <td>{team.name}</td>
                <td>
                  <ul>
                    {team.answers.map((answer, i) => (
                      <li key={i}>{`Вопрос ${i + 1}: ${answer}`}</li>
                    ))}
                  </ul>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>Нет команд, которые бы ответили.</p>
      )}

      <h3>Команды, которые еще не ответили:</h3>
      {teamsWithoutAnswers.length > 0 ? (
        <ul>
          {teamsWithoutAnswers.map((team, index) => (
            <li key={index}>{team.name}</li>
          ))}
        </ul>
      ) : (
        <p>Все команды ответили.</p>
      )}
    </div>
  );
};

export default AdminAnswers;
