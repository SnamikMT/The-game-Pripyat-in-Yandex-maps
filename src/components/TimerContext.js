import React, { createContext, useState, useEffect } from 'react';

const TimerContext = createContext();

export const TimerProvider = ({ children, socket }) => {
  const [remainingTime, setRemainingTime] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);

  // Обновление времени через сокет при получении таймера с сервера
  useEffect(() => {
    socket.on('timer_update', (timeLeft) => {
      const totalTimeInSeconds = timeLeft.minutes * 60 + timeLeft.seconds;
      setRemainingTime(totalTimeInSeconds);
    });

    // Отслеживание начала игры через сокет
    socket.on('game_start', () => {
      setGameStarted(true);
    });

    socket.on('game_end', () => {
      setGameStarted(false);
      setRemainingTime(0);
    });

    return () => {
      socket.off('timer_update');
      socket.off('game_start');
      socket.off('game_end');
    };
  }, [socket]);

  // Локальный таймер, если игра началась
  useEffect(() => {
    let interval;

    if (gameStarted && remainingTime > 0) {
      interval = setInterval(() => {
        setRemainingTime((prevTime) => {
          if (prevTime <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [gameStarted, remainingTime]);

  return (
    <TimerContext.Provider value={{ remainingTime, setRemainingTime, gameStarted, setGameStarted }}>
      {children}
    </TimerContext.Provider>
  );
};

export default TimerContext;
