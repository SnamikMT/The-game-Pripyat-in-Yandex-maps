import React, { useState, useEffect } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import '../style/AdminStatistics.css';

import config from './config';

const socket = io(config.socketUrl);

const AdminStatistics = ({ team }) => {
  const [teamsData, setTeamsData] = useState([]);
  const [answersData, setAnswersData] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [scores, setScores] = useState({});
  const [errorMessage, setErrorMessage] = useState('');

  const isAdmin = team?.role === 'admin';

  useEffect(() => {
    const fetchData = async () => {
      try {
        const teamsResponse = await axios.get(`${config.apiBaseUrl}/api/teams`);
        if (Array.isArray(teamsResponse.data)) {
          setTeamsData(teamsResponse.data);
        }

        const answersResponse = await axios.get(`${config.apiBaseUrl}/api/answers`);
        setAnswersData(answersResponse.data || []);

        const questionsResponse = await axios.get(`${config.apiBaseUrl}/api/questions`);
        if (Array.isArray(questionsResponse.data)) {
          setQuestions(questionsResponse.data);
        } else if (questionsResponse.data.questions && Array.isArray(questionsResponse.data.questions)) {
          setQuestions(questionsResponse.data.questions);
        }
      } catch (error) {
        setErrorMessage('Ошибка загрузки данных');
        console.error('Ошибка загрузки данных:', error);
      }
    };

    fetchData();

    socket.on('new_answer', (newAnswer) => {
      setAnswersData((prevAnswers) => [...prevAnswers, newAnswer]);
    });

    return () => {
      socket.off('new_answer'); 
    };
  }, []);

  useEffect(() => {
    const handleNewTeam = (newTeam) => {
      setTeamsData((prevTeams) => [...prevTeams, newTeam]);
    };

    socket.on('team_joined', handleNewTeam);

    return () => {
      socket.off('team_joined', handleNewTeam);
    };
  }, []);

  const handleScoreChange = (team, questionIndex, event) => {
    const { value } = event.target;
    setScores((prevScores) => ({
      ...prevScores,
      [`${team}-${questionIndex}`]: Number(value),
    }));
  };

  const handleSaveScores = async (team) => {
    const teamScores = Object.keys(scores)
      .filter((key) => key.startsWith(team))
      .map((key) => {
        const [_, questionIndex] = key.split('-');
        return { questionIndex: Number(questionIndex), score: scores[key] };
      });

    try {
      const response = await axios.post(`${config.apiBaseUrl}/api/teams/admin/scores`, {
        team,
        scores: teamScores,
      });

      console.log('Scores saved successfully:', response.data);
      if (response.data.teams) {
        setTeamsData(response.data.teams);
      }
    } catch (error) {
      setErrorMessage('Ошибка сохранения баллов');
      console.error('Ошибка сохранения баллов:', error.response?.data || error.message);
    }
  };

  const calculateRewards = async () => {
    const updatedTeams = teamsData.map((team) => {
      const moves = team.moves || 1;
      const points = team.points || 0;
      const reward = points / moves;
  
      return { ...team, reward: reward };
    });
  
    // Обновляем состояние с новыми наградами
    setTeamsData(updatedTeams);
  
    try {
      // Отправляем обновленные данные на сервер для сохранения
      await Promise.all(updatedTeams.map(async (team) => {
        const response = await axios.post(`${config.apiBaseUrl}/api/teams/update-reward`, {
          team: team.username,
          reward: team.reward, // Отправляем новую награду
        });
        console.log(`Награда для команды ${team.username} успешно обновлена:`, response.data);
      }));
    } catch (error) {
      console.error('Ошибка при обновлении наград:', error);
    }
  };

  return (
    <div className="admin-statistics">
      <h2>СТАТИСТИКА</h2>
      {errorMessage && <p className="error-message">{errorMessage}</p>}

      <h3>Прогресс</h3>
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
              <td>{team.reward ? team.reward.toFixed(2) : '0.00'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {isAdmin && (
        <button onClick={calculateRewards} className="action-button gon">Рассчитать Гонорар</button>
      )}

      {isAdmin && (
        <>
          <h3 className='answerComand'>Ответы команд</h3>
          <div className="answers-container">
            {answersData.length > 0 ? (
              answersData.map((answer, index) => (
                <div key={`answer-${index}`} className="answer-card">
                  <h4>{answer.team}</h4>
                  <p>
                    <em>Отправлено в: {answer.submittedAt ? new Date(answer.submittedAt).toLocaleString() : 'неизвестно'}</em>
                  </p>

                  <ul>
                    {Object.entries(answer.answers).map(([qIndex, ans]) => {
                      const question = questions[qIndex];
                      const questionText = question ? question.text : `Вопрос ${qIndex}`;
                      const minScore = question ? question.minScore : 0;
                      const maxScore = question ? question.maxScore : 10;

                      return (
                        <li key={`question-${answer.team}-${qIndex}`}>
                          <strong>{questionText}:</strong> {ans} (Диапазон баллов: {minScore} - {maxScore})
                          <div className="score-input">
                            <label htmlFor={`score-${answer.team}-${qIndex}`}>Балл:</label>
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
                  <button onClick={() => handleSaveScores(answer.team)}>Сохранить баллы</button>
                </div>
              ))
            ) : (
              <p>Нет доступных ответов</p>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default AdminStatistics;
