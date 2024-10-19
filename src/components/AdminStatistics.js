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

  // Fetch teams, answers, and questions on mount
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

    // Listen for new answers from Socket.io
    socket.on('new_answer', (newAnswer) => {
      setAnswersData((prevAnswers) => [...prevAnswers, newAnswer]);
    });

    return () => {
      socket.off('new_answer');
    };
  }, []);

  // Listen for new teams joining via Socket.io
  useEffect(() => {
    const handleNewTeam = (newTeam) => {
      setTeamsData((prevTeams) => [...prevTeams, newTeam]);
    };

    socket.on('team_joined', handleNewTeam);

    return () => {
      socket.off('team_joined', handleNewTeam);
    };
  }, []);

  // Handle score change and send to server
const handleScoreChange = async (team, questionIndex, score) => {
  const updatedScores = {
    ...scores,
    [`${team}-${questionIndex}`]: score,
  };
  setScores(updatedScores);

  try {
    // Send updated score to the server
    await axios.post(`${config.apiBaseUrl}/api/teams/admin/scores`, {
      team,
      scores: [{ questionIndex, score }],
    });

    // Update 'graded' flag for answers
    const updatedAnswers = answersData.map((answer) => {
      if (answer.team === team) {
        return {
          ...answer,
          answers: {
            ...answer.answers,
            [questionIndex]: {
              ...answer.answers[questionIndex],
              graded: true,
            },
          },
        };
      }
      return answer;
    });
    setAnswersData(updatedAnswers);

    // Update team scores in teamsData
    const updatedTeams = teamsData.map((t) => {
      if (t.username === team) {
        const updatedPoints = (t.points || 0) + score; // Рассчитываем новые очки
        return { ...t, points: updatedPoints }; // Обновляем команду с новыми очками
      }
      return t;
    });
    setTeamsData(updatedTeams); // Обновляем состояние команд

  } catch (error) {
    setErrorMessage('Ошибка сохранения баллов или обновления флага');
    console.error('Ошибка сохранения баллов:', error.response?.data || error.message);
  }
};


// Clear all data for all teams
const confirmAndClearAllData = async () => {
  const isConfirmed = window.confirm('Вы уверены, что хотите очистить все данные для всех команд?');

  if (isConfirmed) {
    try {
      const response = await fetch(`${config.apiBaseUrl}/api/teams/clear-all`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Error ${response.status}: ${errorData}`);
      }

      const result = await response.json();
      console.log('Все данные успешно очищены:', result);

      // Обновляем состояние команд
      const updatedTeams = teamsData.map((team) => ({
        ...team,
        moves: 0,
        points: 0,
        reward: 0,
      }));

      setTeamsData(updatedTeams); // Обновляем состояние команд
      setErrorMessage('Все данные успешно очищены!'); // Сообщение об успехе
    } catch (error) {
      console.error('Ошибка при очистке всех данных:', error);
      setErrorMessage('Ошибка при очистке всех данных. Попробуйте еще раз.'); // Сообщение об ошибке
    }
  } else {
    console.log('Очистка всех данных отменена');
  }
};

const clearRewards = async () => {
  try {
    // Очищаем гонорары для всех команд
    const response = await fetch(`${config.apiBaseUrl}/api/teams/clear-reward`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Error ${response.status}: ${errorData}`);
    }

    const result = await response.json();
    console.log('Все гонорары успешно очищены:', result);

    // Обновляем состояние команд
    const updatedTeams = teamsData.map((team) => ({
      ...team,
      reward: 0, 
    }));

    setTeamsData(updatedTeams); // Обновляем состояние команд
    setErrorMessage('Все гонорары успешно очищены!'); // Сообщение об успехе
  } catch (error) {
    console.error('Ошибка при очистке гонораров:', error);
    setErrorMessage('Ошибка при очистке гонораров. Попробуйте еще раз.'); // Сообщение об ошибке
  }
};

const calculateRewards = async () => {
  try {
    // Отправляем запрос на сервер для расчета наград для всех команд
    const response = await fetch(`${config.apiBaseUrl}/api/teams/calculate-rewards`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Ошибка при расчете наград: ${response.status} ${errorData}`);
    }

    const updatedTeams = await response.json();
    setTeamsData(updatedTeams);  // Обновляем состояние команд на фронтенде
    setErrorMessage('Награды успешно рассчитаны!');  // Сообщение об успешном расчете
  } catch (error) {
    console.error('Ошибка при обновлении наград:', error);
    setErrorMessage('Ошибка при расчете наград. Попробуйте еще раз.');  // Сообщение об ошибке
  }
};


 const handlePointsChange = async (team, value) => {
  const updatedTeams = teamsData.map((t) => {
    if (t.username === team) {
      return { ...t, points: parseInt(value, 10) || 0 }; // Обновляем очки команды
    }
    return t;
  });
  setTeamsData(updatedTeams);

  try {
    // Update points on the server
    await axios.post(`${config.apiBaseUrl}/api/teams/update-points`, {
      team,
      points: parseInt(value, 10) || 0,
    });
  } catch (error) {
    setErrorMessage('Ошибка обновления очков команды');
    console.error('Ошибка обновления очков:', error.response?.data || error.message);
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
            <td>
              <input
                type="number"
                value={team.points || 0}
                onChange={(e) => handlePointsChange(team.username, e.target.value)}
                min="0"
                className="points-input"
              />
            </td>
            <td>{(team.reward ? team.reward.toFixed(2) : '0.00')}</td>
          </tr>
        ))}
      </tbody>
    </table>

      {isAdmin && (
        <>
          <button onClick={calculateRewards} className="action-button gon">Рассчитать Гонорар</button>
          <button onClick={clearRewards} className="action-button">Очистить Гонорар</button>
          <button onClick={confirmAndClearAllData} className="action-button">Очистить Всё</button>
        </>
      )}

      {isAdmin && (
        <>
          <h3 className="answerComand">Ответы команд</h3>
          <div className="answers-container">
            {answersData.length > 0 ? (
              answersData.map((answer, index) => (
                <div key={`answer-${index}`} className="answer-card">
                  <h4 className='ansteam'>{answer.team}</h4>
                  <p>
                    <em>Отправлено в: {answer.submittedAt ? new Date(answer.submittedAt).toLocaleString() : 'неизвестно'}</em>
                  </p>

                  <ul>
                    {Object.entries(answer.answers).map(([qIndex, ans]) => {
                      const question = questions[qIndex];
                      const questionText = question ? question.text : `Вопрос ${qIndex}`;
                      const minScore = question ? question.minScore : 0;
                      const maxScore = question ? question.maxScore : 10;
                      const isGraded = ans.graded;

                      return (
                        <li key={`question-${answer.team}-${qIndex}`}>
                          <strong>{questionText}:</strong> <h4 className='ans'>{ans.text}</h4>
                          <div className="score-input">
                            {isGraded ? (
                              <span>Балл &#10003;</span>
                            ) : (
                              <div className="radio-group">
                                {[...Array(maxScore - minScore + 1)].map((_, i) => (
                                  <label key={i} className="radio-label">
                                    <input
                                      type="radio"
                                      name={`score-${answer.team}-${qIndex}`}
                                      value={minScore + i}
                                      onChange={() => handleScoreChange(answer.team, qIndex, minScore + i)}
                                      className="radio-input"
                                    />
                                    <span className="radio-text">{minScore + i}</span>
                                  </label>
                                ))}
                              </div>
                            )}
                          </div>
                        </li>
                      );
                      
                      
                    })}
                  </ul>
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
