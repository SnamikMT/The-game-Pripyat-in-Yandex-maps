import React, { useState, useEffect } from 'react';
import axios from 'axios';
import io from 'socket.io-client';

const socket = io('http://localhost:5000'); // подключение к Socket.IO

const AdminStatistics = () => {
  const [teamsData, setTeamsData] = useState([]);
  const [answersData, setAnswersData] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [scores, setScores] = useState({}); // Состояние для хранения оценок

  useEffect(() => {
    axios.get('http://localhost:5000/api/teams')
      .then(response => setTeamsData(response.data || []))
      .catch(error => console.error('Error fetching teams:', error));

    axios.get('http://localhost:5000/api/answers')
      .then(response => setAnswersData(response.data || []))
      .catch(error => console.error('Error fetching answers:', error));

    axios.get('http://localhost:5000/api/questions')
      .then(response => {
        if (Array.isArray(response.data)) {
          setQuestions(response.data);
        } else if (response.data.questions && Array.isArray(response.data.questions)) {
          setQuestions(response.data.questions);
        }
      })
      .catch(error => console.error('Error fetching questions:', error));

    socket.on('new_answer', (newAnswer) => {
      setAnswersData((prevAnswers) => [...prevAnswers, newAnswer]);
    });

    return () => {
      socket.off('new_answer');
    };
  }, []);

  const handleScoreChange = (team, questionIndex, event) => {
    const { value } = event.target;
    setScores(prevScores => ({
      ...prevScores,
      [`${team}-${questionIndex}`]: value
    }));
  };

  const handleSaveScores = (team) => {
    // Замените эту функцию на функцию для сохранения баллов на сервере
    console.log(`Scores for ${team}:`, scores);
  };

  return (
    <div>
      <h2>Admin Statistics</h2>

      {/* Таблица с командами и статистикой */}
      <h3>Teams Statistics</h3>
      <table>
        <thead>
          <tr>
            <th>Team</th>
            <th>Moves</th>
            <th>Points</th>
            <th>Reward</th>
          </tr>
        </thead>
        <tbody>
          {teamsData.length > 0 ? (
            teamsData.map(team => (
              <tr key={team.name}>
                <td>{team.name}</td>
                <td>{team.moves}</td>
                <td>{team.points}</td>
                <td>{team.reward}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="4">No teams available</td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Секция с командами, которые участвуют в игре */}
      <h3>Participating Teams</h3>
      <div className="team-cards-container">
        {teamsData.length > 0 ? (
          teamsData.map(team => (
            <div key={team.name} className="team-card">
              <h3>{team.name}</h3>
              <p>Moves: {team.moves}</p>
              <p>Points: {team.points}</p>
              <p>Reward: {team.reward}</p>
            </div>
          ))
        ) : (
          <p>No teams currently participating</p>
        )}
      </div>

      {/* Секция с ответами команд */}
      <h3>Teams' Answers</h3>
      <div className="answers-container">
        {answersData.length > 0 ? (
          answersData.map(answer => (
            <div key={answer.team} className="answer-card">
              <h4>{answer.team}</h4>
              <ul>
                {Object.entries(answer.answers).map(([index, ans]) => {
                  const question = questions[index];
                  const questionText = question ? question.text : `Question ${index}`;
                  const minScore = question ? question.minScore : 0;
                  const maxScore = question ? question.maxScore : 10;

                  return (
                    <li key={index}>
                      <strong>{questionText}:</strong> {ans} (Score range: {minScore} - {maxScore})
                      <div className="score-input">
                        <label htmlFor={`score-${answer.team}-${index}`}>Score:</label>
                        <input
                          type="number"
                          id={`score-${answer.team}-${index}`}
                          min={minScore}
                          max={maxScore}
                          value={scores[`${answer.team}-${index}`] || ''}
                          onChange={(e) => handleScoreChange(answer.team, index, e)}
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
    </div>
  );
};

export default AdminStatistics;
