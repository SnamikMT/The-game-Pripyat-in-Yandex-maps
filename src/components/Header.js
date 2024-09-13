import React from "react";
import { Link } from "react-router-dom";
import '../style/style.css';

const Header = ({ team, onLogout }) => {
  return (
    <header>
      <nav>
        <ul>
          <li><Link to="/categories">Категории</Link></li>
          <li><Link to="/options">Опции</Link></li>
          <li><Link to="/questions">Вопросы</Link></li>
          <li><Link to="/results">Результаты</Link></li>
          <li><Link to="/maps">Карты</Link></li> {/* Новый раздел для карт */}

          {/* Если пользователь авторизован, показываем кнопку "Игра" */}
          {team && (
            <li><Link to="/game">Игра</Link></li>
          )}
          
          {/* Если пользователь — админ, показываем дополнительные кнопки */}
          {team.role === "admin" && (
            <>
              <li><Link to="/add-team">Добавить команду</Link></li>
              <li><Link to="/manage-teams">Управление командами</Link></li>
            </>
          )}

          <li><button onClick={onLogout}>Выйти</button></li>
        </ul>
      </nav>
    </header>
  );
};

export default Header;
