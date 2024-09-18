import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const Header = ({
  team,
  onLogout,
  gameStarted,
  setGameStarted,
  setGameEnded,
  setQuestions,
  remainingTime,
  setRemainingTime,
  socket,
}) => {
  const [showActions, setShowActions] = useState(false);
  const [gameDuration, setGameDuration] = useState(60);
  const [localQuestions, setLocalQuestions] = useState([]); // Renamed to avoid confusion
  const [newQuestion, setNewQuestion] = useState('');
  const [minScore, setMinScore] = useState(0);
  const [maxScore, setMaxScore] = useState(10);

  // Fetch questions from the server when the component mounts
  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/questions');
        setLocalQuestions(response.data.questions || []);
      } catch (error) {
        console.error('Error loading questions:', error);
      }
    };

    fetchQuestions();
  }, []);

  // Toggle actions visibility
  const toggleActions = () => {
    setShowActions(!showActions);
  };

  // Add a new question
  const handleAddQuestion = async () => {
    try {
      const response = await axios.post('http://localhost:5000/api/add-question', {
        question: {
          text: newQuestion,
          minScore: Number(minScore),
          maxScore: Number(maxScore),
        },
      });
      setLocalQuestions(response.data.questions);
      setNewQuestion('');
      setMinScore(0);
      setMaxScore(10);
    } catch (error) {
      console.error('Error adding question:', error);
    }
  };

  // Delete a question
  const handleDeleteQuestion = async (index) => {
    try {
      const response = await axios.post('http://localhost:5000/api/delete-question', { index });
      setLocalQuestions(response.data.questions);
    } catch (error) {
      console.error('Error deleting question:', error);
    }
  };

  // Start the game
  const handleStartGame = async () => {
    try {
      const response = await axios.post('http://localhost:5000/api/start-game', {
        duration: gameDuration,
      });
      const serverQuestions = response.data.questions;
      socket.emit('game_started', serverQuestions);
      setGameStarted(true);
      setRemainingTime(gameDuration * 60);
    } catch (error) {
      console.error('Error starting game:', error);
    }
  };

  // End the game
  const handleEndGame = async () => {
    try {
      await axios.post('http://localhost:5000/api/end-game');
      setGameEnded(true);
      setGameStarted(false);
      socket.emit('game_ended');
    } catch (error) {
      console.error('Error ending game:', error);
    }
  };

  return (
    <header>
      <nav>
        <ul>
          <li><Link to="/categories">Categories</Link></li>
          <li><Link to="/game">Game</Link></li>
          {team.role === 'admin' && (
            <>
              <li><Link to="/statistics">Statistics</Link></li>
              <li><Link to="/manage-teams">Manage Teams</Link></li>
            </>
          )}
          <li><button onClick={onLogout}>Logout</button></li>
        </ul>
      </nav>

      {team.role === 'admin' && (
        <div className="admin-actions">
          <button onClick={toggleActions}>Actions</button>
          {showActions && (
            <div className="dropdown-actions">
              <label>Game Duration (min):</label>
              <input
                type="number"
                value={gameDuration}
                onChange={(e) => setGameDuration(Number(e.target.value))}
              />

              <h3>Create Questions</h3>
              <label>Question:</label>
              <input
                type="text"
                value={newQuestion}
                onChange={(e) => setNewQuestion(e.target.value)}
                placeholder="Enter question text"
              />
              <label>Min Score:</label>
              <input
                type="number"
                value={minScore}
                onChange={(e) => setMinScore(e.target.value)}
                placeholder="Min score"
              />
              <label>Max Score:</label>
              <input
                type="number"
                value={maxScore}
                onChange={(e) => setMaxScore(e.target.value)}
                placeholder="Max score"
              />
              <button onClick={handleAddQuestion}>Add Question</button>

              <div>
                <h4>Question List:</h4>
                <ul>
                  {localQuestions.map((q, index) => (
                    <li key={index}>
                      {q.text} (Score: {q.minScore} - {q.maxScore})
                      <button onClick={() => handleDeleteQuestion(index)}>Delete</button>
                    </li>
                  ))}
                </ul>
              </div>

              <button onClick={handleStartGame}>Start Game</button>
              <button onClick={handleEndGame}>End Game</button>
            </div>
          )}
        </div>
      )}
    </header>
  );
};

export default Header;
