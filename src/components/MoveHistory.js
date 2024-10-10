import React, { useEffect, useState } from 'react';
import axios from 'axios';

import config from './config';
import { colors } from '@mui/material';

const MoveHistory = () => {
  const [teamMoves, setTeamMoves] = useState([]);
  const [blocks, setBlocks] = useState([]);

  useEffect(() => {
    const fetchTeamMoves = async () => {
      try {
        const response = await axios.get(`${config.apiBaseUrl}/api/teams`); // Получаем данные из teams.json
        setTeamMoves(response.data);
      } catch (error) {
        console.error('Error fetching team moves:', error);
      }
    };

    const fetchBlocks = async () => {
      try {
        const response = await axios.get(`${config.apiBaseUrl}/api/blocks`); // Получаем данные блоков
        setBlocks(response.data);
      } catch (error) {
        console.error('Error fetching blocks:', error);
      }
    };

    fetchTeamMoves();
    fetchBlocks();
  }, []);

  const getBlockByNumberAndCategory = (blockNumber, category) => {
    if (!category) {
      return null; // Если категория не определена, возвращаем null
    }
  
    const categoryBlocks = blocks.find(blockCategory => blockCategory.category && blockCategory.category.toLowerCase() === category.toLowerCase());
  
    if (categoryBlocks) {
      const block = categoryBlocks.blocks.find(b => b.number === blockNumber);
      return block || null;
    }
  
    console.log("Категория не найдена");
    return null; // Если блок или категория не найдены
  };

  return (
    <div className="move-history-container">
      <h2 style={{ color: 'white'}}>История ходов</h2>
      {teamMoves.length > 0 ? (
        teamMoves.map((team, index) => (
          <div key={index} className="team-card">
            <h3>Команда: {team.username}</h3>
            <div className="team-history">
              {team.history && team.history.length > 0 ? (
                team.history.slice().reverse().map((move, moveIndex) => { // Сортировка в обратном порядке
                  const block = getBlockByNumberAndCategory(move.blockNumber, move.category); // Ищем блок по номеру и категории
                  return (
                    <div key={moveIndex} className="move-card">
                      <h4>Категория: {move.category}</h4>
                      <p>Номер блока: {move.blockNumber}</p>
                      <p>Время запроса: {new Date(move.timestamp).toLocaleString()}</p>
                      <div className="block-preview">
                        {block ? (
                          <>
                            <p>Предпросмотр блока: {block.title}</p>
                            {block.imageUrl ? (
                              <img src={`${config.apiBaseUrl}${block.imageUrl}`} alt={block.title} style={{ width: '100px' }} />
                            ) : (
                              <p>Изображение отсутствует</p>
                            )}
                          </>
                        ) : (
                          <p>Блок не найден</p>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <p>Нет данных о ходах для этой команды</p>
              )}
            </div>
          </div>
        ))
      ) : (
        <p>Данных нет</p>
      )}
    </div>
  );
};

export default MoveHistory;
