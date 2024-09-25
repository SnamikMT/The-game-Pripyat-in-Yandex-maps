import React, { useState, useEffect } from 'react';

import io from 'socket.io-client';

import axios from 'axios';

import config from './config';

const socket = io(config.socketUrl);

const Questions = ({ team }) => {
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Подписываемся на событие старта игры
    socket.on('game_started', (questions) => {
      setQuestions(questions); // Сохраняем полученные вопросы в стейт
    });

    // Очищаем слушатель при размонтировании компонента
    return () => {
      socket.off('game_started');
    };
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setAnswers((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (Object.values(answers).length < questions.length) {
      setError('Please answer all questions.');
      return;
    }
    try {
      await axios.post('/api/answers', { team: team.username, answers });
      setSubmitted(true);
    } catch (error) {
      setError('Failed to submit answers. Please try again.');
    }
  };

  if (submitted) {
    return <h2>Your answers have been submitted. Thank you!</h2>;
  }

  return (
    <form onSubmit={handleSubmit}>
      {questions.length > 0 ? (
        questions.map((question, index) => (
          <div key={index}>
            <label>{index + 1}. {question.question}</label>
            <input
              type="text"
              name={`q${index + 1}`}
              onChange={handleChange}
              required
            />
          </div>
        ))
      ) : (
        <h2>Waiting for game to start...</h2>
      )}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <button type="submit" disabled={questions.length === 0}>Submit Answers</button>
    </form>
  );
};

export default Questions;
