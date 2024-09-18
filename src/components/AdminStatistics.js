import React, { useEffect, useState } from "react";
import axios from "axios";

const AdminStatistics = ({ gameEnded, remainingTime, formatTime }) => {
  const [teamsData, setTeamsData] = useState([]);
  const [answersData, setAnswersData] = useState([]);

  // Fetch teams data
  const fetchTeamsData = async () => {
    try {
      const response = await axios.get("http://localhost:5000/api/teams");
      console.log("Teams data:", response.data);
      setTeamsData(response.data || []);
    } catch (error) {
      console.error("Ошибка при получении данных о командах:", error);
    }
  };

  // Fetch answers data
  const fetchAnswersData = async () => {
    try {
      const response = await axios.get("http://localhost:5000/api/answers");
      if (response.data && Array.isArray(response.data.answers)) {
        console.log("Answers data:", response.data.answers);
        setAnswersData(response.data.answers);
      } else {
        console.error("Нет данных с ответами");
        setAnswersData([]);
      }
    } catch (error) {
      console.error("Ошибка при получении данных с ответами:", error);
      setAnswersData([]);
    }
  };

  // Periodic data update
  useEffect(() => {
    fetchTeamsData();
    fetchAnswersData();
    const interval = setInterval(() => {
      fetchTeamsData();
      fetchAnswersData();
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // Combine teams with their answers
  const teamsWithAnswers = teamsData.map((team) => {
    const teamName = team.name ? team.name.trim().toLowerCase() : "";
    const teamAnswer = answersData.find(
      (answer) => answer.team && answer.team.trim().toLowerCase() === teamName
    );
    return { ...team, answers: teamAnswer ? teamAnswer.answers : null };
  });

  const teamsWithoutAnswers = teamsWithAnswers.filter((team) => !team.answers);

  return (
    <div>
      <h2>Статистика игры</h2>
      {gameEnded ? (
        <p>Игра завершена</p>
      ) : (
        <p>
          Игра продолжается... Осталось времени: {formatTime(remainingTime)}
        </p>
      )}

      {teamsData.length === 0 ? (
        <p>Нет доступных команд.</p>
      ) : (
        <div>
          <table>
            <thead>
              <tr>
                <th>Команды</th>
                <th>Ходы</th>
                <th>Баллы</th>
                <th>Гонорар</th>
              </tr>
            </thead>
            <tbody>
              {teamsWithAnswers.map((team, index) => (
                <tr key={index}>
                  <td>{team.name}</td>
                  <td>{team.moves || '-'}</td>
                  <td>{team.points || '-'}</td>
                  <td>{team.reward || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div>
            <h3>Ответы команд:</h3>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "20px" }}>
              {teamsWithAnswers.map((team, index) => (
                <div
                  key={index}
                  style={{
                    border: "1px solid #ccc",
                    borderRadius: "8px",
                    padding: "16px",
                    width: "300px",
                    boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
                  }}
                >
                  <h4>{team.name}</h4>
                  {team.answers ? (
                    <ul>
                      {Object.keys(team.answers).map((questionKey, i) => (
                        <li key={i}>{`${questionKey}: ${team.answers[questionKey]}`}</li>
                      ))}
                    </ul>
                  ) : (
                    <p>Нет ответов</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {teamsWithoutAnswers.length > 0 && (
            <div>
              <h3>Игроки, которые пока что не дали ответы на вопросы:</h3>
              <ul>
                {teamsWithoutAnswers.map((team, index) => (
                  <li key={index}>{team.name}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminStatistics;
