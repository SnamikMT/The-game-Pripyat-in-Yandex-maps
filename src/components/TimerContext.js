import React, { createContext, useState, useEffect } from 'react';

const TimerContext = createContext();

export const TimerProvider = ({ children, socket }) => {
  const [remainingTime, setRemainingTime] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);

  // Обновление времени через сокет
  useEffect(() => {
    socket.on('timer_update', (timeLeft) => {
      const totalTimeInSeconds = timeLeft.minutes * 60 + timeLeft.seconds;
      setRemainingTime(totalTimeInSeconds);
    });

    return () => {
      socket.off('timer_update');
    };
  }, [socket]);

  useEffect(() => {
    let interval;
  
    // Запуск локального таймера только когда игра началась
    if (gameStarted && remainingTime > 0) {
      interval = setInterval(() => {
        setRemainingTime((prevTime) => (prevTime > 0 ? prevTime - 1 : 0));
      }, 1000);
    }
  
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [gameStarted]); // Уберите remainingTime из зависимостей
  

  return (
    <TimerContext.Provider value={{ remainingTime, setRemainingTime, gameStarted, setGameStarted }}>
      {children}
    </TimerContext.Provider>
  );
};

export default TimerContext;
