import React, { useEffect, useState } from 'react';
import axios from 'axios';
import config from './config';
import Background from './Background.jpg';
import DocumentIcon from './document-icon.png';
import VoiceMessageIcon from './voice-message-icon.png';
import { Card, CardContent, Typography } from '@mui/material'; // Импортируйте компоненты Material-UI

const TeamHistoryBlocks = ({ team, newSearchHistory }) => {
  const [teamMoves, setTeamMoves] = useState([]);
  const [blocks, setBlocks] = useState([]);

  // Загружаем данные команды (историю) и блоки
  useEffect(() => {
    const fetchTeamMoves = async () => {
      try {
        const response = await axios.get(`${config.apiBaseUrl}/api/teams`);
        console.log("Team moves data from API:", response.data);
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

  // Хук для обновления истории команды при каждом новом запросе
  useEffect(() => {
    if (newSearchHistory) {
      console.log("New search history:", newSearchHistory);
      setTeamMoves(prevMoves => {
        const updatedMoves = prevMoves.map(teamMove => {
          if (teamMove.username === team.username) {
            const updatedHistory = [
              ...teamMove.history,
              ...newSearchHistory.filter(
                newItem => !teamMove.history.some(
                  existingItem => existingItem.blockNumber === newItem.blockNumber && existingItem.category === newItem.category
                )
              )
            ];
            return {
              ...teamMove,
              history: updatedHistory, // Обновляем историю без дубликатов
            };
          }
          return teamMove;
        });
        console.log("Updated team moves without duplicates:", updatedMoves);
        return updatedMoves;
      });
    }
  }, [newSearchHistory, team.username]);
  
  

  
  // Функция для поиска блока по номеру и категории
  const getBlockByNumberAndCategory = (blockNumber, category) => {
    if (!category) return null;

    const categoryBlocks = blocks.find(
      blockCategory => blockCategory.category && blockCategory.category.toLowerCase() === category.toLowerCase()
    );

    if (categoryBlocks) {
      const block = categoryBlocks.blocks.find(b => b.number === blockNumber);
      if (block) {
        const voiceMessagePreview = block.voiceMessageUrl ? `${config.apiBaseUrl}${block.voiceMessageUrl}` : "";
        return {
          ...block,
          voiceMessagePreview,
        };
      }
    }

    console.log("Category not found");
    return null;
  };

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
                          ) : null}

                          </div>
                        </CardContent>
                      </Card>
                    ) : (
                      <p></p>
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
