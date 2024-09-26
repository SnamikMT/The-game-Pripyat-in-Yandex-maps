import React, { createContext, useContext, useState } from "react";

// Создание контекста для игры
const GameContext = createContext();

// Провайдер для игры, оборачивает дочерние компоненты
export const GameProvider = ({ children }) => {
  const [gameData, setGameData] = useState({
    questions: [], // Список вопросов для игры
    gameStarted: false, // Статус игры (началась или нет)
    timeLeft: 0, // Оставшееся время до окончания игры
    submitted: false, // Статус отправки ответов
  });

  return (
    <GameContext.Provider value={{ gameData, setGameData }}>
      {children}
    </GameContext.Provider>
  );
};

// Хук для использования контекста игры
export const useGameContext = () => {
  return useContext(GameContext);
};
