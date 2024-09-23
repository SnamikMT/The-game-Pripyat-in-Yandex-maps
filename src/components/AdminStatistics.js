import React, { useState, useEffect } from 'react';
import axios from 'axios';
import io from 'socket.io-client';

const socket = io('http://localhost:5000'); // Убедитесь, что это правильный адрес вашего сервера

const AdminStatistics = ({ team }) => {
  const [teamsData, setTeamsData] = useState([]);
  const [answersData, setAnswersData] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [scores, setScores] = useState({});

  // Проверяем, является ли пользователь администратором
  const isAdmin = team?.role === 'admin';

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Загрузка команд
        const teamsResponse = await axios.get('http://localhost:5000/api/teams');
        if (Array.isArray(teamsResponse.data)) {
          setTeamsData(teamsResponse.data);
        }

        // Загрузка ответов
        const answersResponse = await axios.get('http://localhost:5000/api/answers');
        setAnswersData(answersResponse.data || []);

        // Загрузка вопросов
        const questionsResponse = await axios.get('http://localhost:5000/api/questions');
        if (Array.isArray(questionsResponse.data)) {
          setQuestions(questionsResponse.data);
        } else if (questionsResponse.data.questions && Array.isArray(questionsResponse.data.questions)) {
          setQuestions(questionsResponse.data.questions);
        }
      } catch (error) {
        console.error('Ошибка загрузки данных:', error);
      }
    };

    fetchData();

    // Обработка новых ответов от сокетов
    socket.on('new_answer', (newAnswer) => {
      setAnswersData((prevAnswers) => [...prevAnswers, newAnswer]);
    });

    return () => {
      socket.off('new_answer');
    };
  }, []);

  useEffect(() => {
    const handleNewTeam = (newTeam) => {
      setTeamsData(prevTeams => [...prevTeams, newTeam]);
    };

    socket.on('team_joined', handleNewTeam);

    return () => {
      socket.off('team_joined', handleNewTeam);
    };
  }, []);

  // Обработка изменения очков
  const handleScoreChange = (team, questionIndex, event) => {
    const { value } = event.target;
    setScores(prevScores => ({
      ...prevScores,
      [`${team}-${questionIndex}`]: Number(value),
    }));
  };

  // Сохранение очков для команды
  const handleSaveScores = async (team) => {
    const teamScores = Object.keys(scores)
      .filter(key => key.startsWith(team))
      .map(key => {
        const [_, questionIndex] = key.split('-');
        return { questionIndex: Number(questionIndex), score: scores[key] };
      });

    try {
      const response = await axios.post('http://localhost:5000/api/teams/admin/scores', {
        team,
        scores: teamScores,
      });

      console.log('Scores saved successfully:', response.data);
      if (response.data.teams) {
        setTeamsData(response.data.teams);
      }
    } catch (error) {
      console.error('Error saving scores:', error.response?.data || error.message);
    }
  };

  return (
    <div className="admin-statistics">
      <h2>Admin Statistics</h2>

      <h3>Teams Statistics</h3>
      <table className="teams-table">
        <thead>
          <tr>
            <th>Команда</th>
            <th>Ходы</th>
            <th>Очки</th>
            <th>Награда</th>
          </tr>
        </thead>
        <tbody>
          {teamsData.map((team) => (
            <tr key={team.username}>
              <td>{team.username}</td>
              <td>{team.moves}</td>
              <td>{team.points}</td>
              <td>{team.reward}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Этот блок виден только админу */}
      {isAdmin && (
        <>
          <h3>Teams' Answers</h3>
          <div className="answers-container">
            {answersData.length > 0 ? (
              answersData.map((answer, index) => (
                <div key={`answer-${index}`} className="answer-card">
                  <h4>{answer.team}</h4>
                  <ul>
                    {Object.entries(answer.answers).map(([qIndex, ans]) => {
                      const question = questions[qIndex];
                      const questionText = question ? question.text : `Question ${qIndex}`;
                      const minScore = question ? question.minScore : 0;
                      const maxScore = question ? question.maxScore : 10;

                      return (
                        <li key={`question-${answer.team}-${qIndex}`}>
                          <strong>{questionText}:</strong> {ans} (Score range: {minScore} - {maxScore})
                          <div className="score-input">
                            <label htmlFor={`score-${answer.team}-${qIndex}`}>Score:</label>
                            <input
                              type="number"
                              id={`score-${answer.team}-${qIndex}`}
                              min={minScore}
                              max={maxScore}
                              value={scores[`${answer.team}-${qIndex}`] || ''}
                              onChange={(e) => handleScoreChange(answer.team, qIndex, e)}
                            />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                  <button onClick={() => handleSaveScores(answer.team)}>Save Scores</button>
                </div>
              ))
            ) : (
              <p>No answers available</p>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default AdminStatistics;
