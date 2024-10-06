import React, { useEffect, useState } from 'react';
import axios from 'axios';
import config from './config';
import Background from './Background.jpg';
import DocumentIcon from './document-icon.png';
import VoiceMessageIcon from './voice-message-icon.png';
import { Card, CardContent, Typography } from '@mui/material'; // Импортируйте компоненты Material-UI

const TeamHistoryBlocks = ({ team }) => {
  const [teamMoves, setTeamMoves] = useState([]);
  const [blocks, setBlocks] = useState([]);

  // Загружаем данные команды (историю) и блоки
  useEffect(() => {
    const fetchTeamMoves = async () => {
      try {
        const response = await axios.get(`${config.apiBaseUrl}/api/teams`);
        setTeamMoves(response.data);
      } catch (error) {
        console.error('Error fetching team moves:', error);
      }
    };

    const fetchBlocks = async () => {
      try {
        const response = await axios.get(`${config.apiBaseUrl}/api/blocks`);
        setBlocks(response.data);
      } catch (error) {
        console.error('Error fetching blocks:', error);
      }
    };

    fetchTeamMoves();
    fetchBlocks();
  }, []);

  // Функция для поиска блока по номеру и категории
  const getBlockByNumberAndCategory = (blockNumber, category) => {
    if (!category) return null;
  
    const categoryBlocks = blocks.find(
      blockCategory => blockCategory.category && blockCategory.category.toLowerCase() === category.toLowerCase()
    );
  
    if (categoryBlocks) {
      const block = categoryBlocks.blocks.find(b => b.number === blockNumber);
      if (block) {
        // Проверяем, что у блока есть аудиофайл, и устанавливаем полный путь
        const voiceMessagePreview = block.voiceMessageUrl ? `${config.apiBaseUrl}${block.voiceMessageUrl}` : "";
        
        // Возвращаем блок с обновленным путем к аудиофайлу
        return {
          ...block,
          voiceMessagePreview,
        };
      }
    }
  
    console.log("Category not found");
    return null;
  };
  

  // Фильтруем и сортируем ходы команды для текущего пользователя
  const filteredTeamMoves = teamMoves
    .filter(t => t.username === team?.username)
    .map(team => ({
      ...team,
      history: team.history.sort((a, b) => a.blockNumber - b.blockNumber), // Сортируем по blockNumber
    }));

  return (
    <div>
      {filteredTeamMoves.length > 0 ? (
        filteredTeamMoves.map((team, index) => (
          <div key={index}>
            {/* <h3>Команда: {team.username}</h3> */}
            {team.history.length > 0 ? (
              team.history.map((historyItem, historyIndex) => {
                const block = getBlockByNumberAndCategory(historyItem.blockNumber, historyItem.category);
                return (
                  <div key={historyIndex}>
                    {block ? (
                      <Card style={{ marginTop: "20px" }}>
                        <CardContent>
                          <div className="categoryHead">
                            {block.imageUrl && (
                              <img src={`${config.apiBaseUrl}${block.imageUrl}`} alt={block.title} style={{ width: '100px', marginBottom: '10px' }} />
                            )}
                            {block.showDocumentIcon && (
                              <img src={DocumentIcon} alt="Document" style={{ width: 70, height: 70, marginBottom: "10px" }} />
                            )}
                            {block.showVoiceMessageIcon && (
                              <img src={VoiceMessageIcon} alt="Voice Message" style={{ width: 70, height: 70, marginBottom: "10px" }} />
                            )}
                          </div>
                          <Typography variant="h5" style={{ marginBottom: "10px", fontSize: "25px", textAlign: "center" }}>
                            {block.title}
                          </Typography>
                          <Typography variant="body1" style={{ marginBottom: "10px", fontSize: "15px" }}>
                            {block.description}
                          </Typography>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: "10px" }}>
                            {block.image2Url && (
                              <img src={`${config.apiBaseUrl}${block.image2Url}`} alt={block.title} style={{ width: '60%', marginBottom: '10px' }} />
                            )}
                            {block.voiceMessagePreview ? (
                              <audio controls src={block.voiceMessagePreview} style={{ width: '100%', marginBottom: '10px' }} />
                            ) : (
                              console.log('Аудио не найдено для блока:', block)
                            )}

                          </div>
                        </CardContent>
                      </Card>
                    ) : (
                      <p>Блок с номером {historyItem.blockNumber} и категорией {historyItem.category} не найден</p>
                    )}
                  </div>
                );
              })
            ) : (
              <p>История отсутствует</p>
            )}
          </div>
        ))
      ) : (
        <p>Нет доступных данных о команде</p>
      )}
    </div>
  );
};

export default TeamHistoryBlocks;