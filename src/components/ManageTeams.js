import React, { useState, useEffect } from "react";
import io from "socket.io-client";

const socket = io("http://localhost:5000");

const ManageTeams = () => {
  const [teams, setTeams] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const response = await fetch("http://localhost:5000/api/users");
        const data = await response.json();
        setTeams(data);
      } catch (error) {
        setError("Error fetching teams");
      }
    };

    fetchTeams();

    socket.on("userAdded", (newUser) => {
      setTeams((prevTeams) => [...prevTeams, newUser]);
    });

    socket.on("userUpdated", (updatedUser) => {
      setTeams((prevTeams) =>
        prevTeams.map((user) =>
          user.username === updatedUser.username ? updatedUser : user
        )
      );
    });

    socket.on("userDeleted", (username) => {
      setTeams((prevTeams) =>
        prevTeams.filter((user) => user.username !== username)
      );
    });

    return () => {
      socket.off("userAdded");
      socket.off("userUpdated");
      socket.off("userDeleted");
    };
  }, []);

  const handleDelete = async (username) => {
    try {
      const response = await fetch(`http://localhost:5000/api/users/${username}`, {
        method: "DELETE",
      });

      if (response.ok) {
        socket.emit("deleteUser", username); // Уведомляем сервер о удалении
      } else {
        setError("Error deleting user");
      }
    } catch (error) {
      setError("Error deleting user");
    }
  };

  return (
    <div>
      <h2>Manage Teams</h2>
      {error && <p>{error}</p>}
      <ul>
        {teams.map((team) => (
          <li key={team.username}>
            {team.username} - {team.role} 
            <button onClick={() => handleDelete(team.username)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ManageTeams;
