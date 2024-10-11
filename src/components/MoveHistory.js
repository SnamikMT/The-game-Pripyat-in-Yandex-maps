import React, { useEffect, useState } from 'react';
import axios from 'axios';
import config from './config';

const MoveHistory = () => {
  const [teamMoves, setTeamMoves] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [activeTab, setActiveTab] = useState('history'); // Для управления активной вкладкой
  const [searchTerm, setSearchTerm] = useState(''); // Для фильтрации блоков

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

  // Функция для получения данных блока по номеру и категории
  const getBlockByNumberAndCategory = (blockNumber, category) => {
    if (!category) {
      return null;
    }

    const categoryBlocks = blocks.find(
      blockCategory => blockCategory.category && blockCategory.category.toLowerCase() === category.toLowerCase()
    );

    if (categoryBlocks) {
      const block = categoryBlocks.blocks.find(b => b.number === blockNumber);
      return block || null;
    }

    return null; // Если блок или категория не найдены
  };

  // Проверка, посещала ли команда данный блок
  const hasVisitedBlock = (teamHistory, blockNumber, category) => {
    return teamHistory.some(
      move => move.blockNumber === blockNumber && move.category.toLowerCase() === category.toLowerCase()
    );
  };

  // Фильтр по введенному поисковому запросу
  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value.toLowerCase()); // Приводим запрос к нижнему регистру для корректного поиска
  };

  const filterBlocksBySearch = (blockCategory, block) => {
    const blockTitle = block.title.toLowerCase();
    const blockNumber = block.number.toString();
    return blockTitle.includes(searchTerm) || blockNumber.includes(searchTerm);
  };

  return (
    <div className="move-history-container">
      <h2 className='historyH' style={{ color: 'white'}}>История ходов и блоков</h2>

      {/* Вкладки для переключения */}
      <div className="tabs">
        <button
          className={`tab-button ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          История ходов
        </button>
        <button
          className={`tab-button ${activeTab === 'blocks' ? 'active' : ''}`}
          onClick={() => setActiveTab('blocks')}
        >
          Посещение блоков
        </button>
      </div>

      {/* Контент для активной вкладки */}
      {activeTab === 'history' && (
        <div className="history-tab">
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
      )}

      {activeTab === 'blocks' && (
        <div className="visits-tab">
          {/* Поле поиска */}
          <input
            type="text"
            placeholder="Поиск по блокам..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="visits-search-input"
          />

          {blocks.length > 0 && teamMoves.length > 0 ? (
            blocks.map((blockCategory, categoryIndex) => (
              <div key={categoryIndex} className="visits-category">
                <h3 className="visits-category-title">Категория: {blockCategory.category}</h3>
                {blockCategory.blocks
                  .filter(block => filterBlocksBySearch(blockCategory, block)) // Применяем фильтр по поисковому запросу
                  .map((block, blockIndex) => {
                    const teamsVisited = teamMoves.filter(team =>
                      hasVisitedBlock(team.history, block.number, blockCategory.category)
                    );
                    const teamsNotVisited = teamMoves.filter(team =>
                      !hasVisitedBlock(team.history, block.number, blockCategory.category)
                    );

                    return (
                      <div key={blockIndex} className="visits-block-card">
                        <h4 className="visits-block-title">Блок: {block.title} (№{block.number})</h4>
                        
                        <div className="visits-block-info">
                          <p className="visits-block-status">Посетили блок:</p>
                          {teamsVisited.length > 0 ? (
                            <ul className="visits-block-team-list">
                              {teamsVisited.map((team, index) => (
                                <li key={index} className="visits-block-team">{team.username}</li>
                              ))}
                            </ul>
                          ) : (
                            <p className="visits-block-empty">Нет команд, посетивших этот блок</p>
                          )}
                          
                          <p className="visits-block-status">Не посетили блок:</p>
                          {teamsNotVisited.length > 0 ? (
                            <ul className="visits-block-team-list">
                              {teamsNotVisited.map((team, index) => (
                                <li key={index} className="visits-block-team">{team.username}</li>
                              ))}
                            </ul>
                          ) : (
                            <p className="visits-block-empty">Все команды посетили этот блок</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            ))
          ) : (
            <p>Данных нет</p>
          )}
        </div>
      )}

    </div>
  );
};

export default MoveHistory;
