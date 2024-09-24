import React, { useState, useEffect } from 'react';

const MessagePopup = ({ message, onClose }) => {
  return (
    <div className="message-popup">
      <h3>{message.time}</h3>
      <p>{message.text}</p>
      <button onClick={onClose}>Закрыть</button>
    </div>
  );
};

export default MessagePopup;
