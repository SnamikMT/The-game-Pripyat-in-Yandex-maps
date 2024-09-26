import React, { useEffect, useState } from 'react';

const Questions = ({ questions }) => {
  const [expandedQuestions, setExpandedQuestions] = useState(() => {
    const storedState = localStorage.getItem('expandedQuestions');
    return storedState ? JSON.parse(storedState) : {};
  });

  const toggleQuestion = (index) => {
    setExpandedQuestions((prevState) => {
      const newState = { ...prevState, [index]: !prevState[index] };
      localStorage.setItem('expandedQuestions', JSON.stringify(newState));
      return newState;
    });
  };

  return (
    <div>
      {questions.map((question, index) => (
        <div key={index}>
          <h3 onClick={() => toggleQuestion(index)}>
            {question.title}
          </h3>
          {expandedQuestions[index] && <p>{question.content}</p>}
        </div>
      ))}
    </div>
  );
};

export default Questions;
