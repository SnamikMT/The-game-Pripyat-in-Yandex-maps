// src/components/Questions.js
import React, { useState } from "react";

const Questions = ({ onSubmitAnswers }) => {
  const [answers, setAnswers] = useState({
    q1: "",
    q2: "",
    q3: "",
    q4: "",
    q5: "",
    q6: "",
    q7: ""
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setAnswers((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmitAnswers(answers);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>1) Кто из коллег Левина сотрудничал с западными спецслужбами? / 0-10</label>
        <input type="text" name="q1" value={answers.q1} onChange={handleChange} />
      </div>
      <div>
        <label>2) В какой лаборатории они работали? / 0-5</label>
        <input type="text" name="q2" value={answers.q2} onChange={handleChange} />
      </div>
      <div>
        <label>3) Назовите псевдоним агента западных спецслужб? / 0-5</label>
        <input type="text" name="q3" value={answers.q3} onChange={handleChange} />
      </div>
      <div>
        <label>4) Под каким именем и фамилией он работал в Припяти? / 0-5</label>
        <input type="text" name="q4" value={answers.q4} onChange={handleChange} />
      </div>
      <div>
        <label>5) Какой объект, кроме ЧАЭС, интересовал западные спецслужбы? / 0-5</label>
        <input type="text" name="q5" value={answers.q5} onChange={handleChange} />
      </div>
      <div>
        <label>6) Кто писал анонимные письма в КГБ? / 0-10</label>
        <input type="text" name="q6" value={answers.q6} onChange={handleChange} />
      </div>
      <div>
        <label>7) Какую выгоду получали коллеги Левина от сотрудничества с иностранным агентом? / 0-5</label>
        <input type="text" name="q7" value={answers.q7} onChange={handleChange} />
      </div>
      <button type="submit">Отправить ответы</button>
    </form>
  );
};

export default Questions;
