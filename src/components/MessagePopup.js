import React from 'react';

const MessagePopup = ({ message, onClose }) => {
  return (
    <div className="message-popup">
      <h3>{message.time}</h3>
      <p dangerouslySetInnerHTML={{ __html: message.text.replace(/\n/g, '<br />') }} /> {/* Заменяем \n на <br /> */}
      <button onClick={onClose}>Закрыть</button>
    </div>
  );
};

export default MessagePopup;
