// src/components/Results.js
import React, { useState } from "react";

const Results = ({ teams }) => {
  const [scores, setScores] = useState({});

  const handleScoreChange = (team, score) => {
    setScores({ ...scores, [team]: score });
  };

  const calculateResults = () => {
    // Формула подсчета результатов
    return teams.map((team) => ({
      team,
      result: scores[team] ? scores[team] : 0, // Пример расчета
    }));
  };

  const results = calculateResults();

  return (
    <div>
      <h2>Results</h2>
      {teams.map((team) => (
        <div key={team}>
          <label>{team}:</label>
          <input
            type="number"
            onChange={(e) => handleScoreChange(team, e.target.value)}
          />
        </div>
      ))}
      <div>
        <h3>Final Results:</h3>
        {results.map((result) => (
          <p key={result.team}>
            {result.team}: {result.result}
          </p>
        ))}
      </div>
    </div>
  );
};

export default Results;
