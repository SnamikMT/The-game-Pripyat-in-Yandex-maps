import React, { useEffect, useState } from 'react';

const Questions = ({ questions }) => {
  const [expandedQuestions, setExpandedQuestions] = useState(() => {
    const storedState = localStorage.getItem('expandedQuestions');
    return storedState ? JSON.parse(storedState) : {};
  });

  const [isSubmitted, setIsSubmitted] = useState(() => {
    const storedSubmission = localStorage.getItem('isSubmitted');
    return storedSubmission === 'true'; // Преобразуем в boolean
  });

  const toggleQuestion = (index) => {
    setExpandedQuestions((prevState) => {
      const newState = { ...prevState, [index]: !prevState[index] };
      localStorage.setItem('expandedQuestions', JSON.stringify(newState));
      return newState;
    });
  };

  const handleSubmit = () => {
    // Логика отправки ответов на сервер или другую обработку
    setIsSubmitted(true);
    localStorage.setItem('isSubmitted', 'true');
  };

  useEffect(() => {
    // Здесь может быть логика проверки отправленных данных с сервера
  }, []);

  if (isSubmitted) {
    return <p>Ваши ответы успешно отправлены!</p>;
  }

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
      <button onClick={handleSubmit}>Отправить ответы</button>
    </div>
  );
};

export default Questions;
