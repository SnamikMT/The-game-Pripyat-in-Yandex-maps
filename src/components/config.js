// config.js
const config = {
  apiBaseUrl: process.env.REACT_APP_API_BASE_URL || "http://localhost:5000",
  socketUrl: process.env.REACT_APP_SOCKET_URL || "http://localhost:5000"
};

export default config;
