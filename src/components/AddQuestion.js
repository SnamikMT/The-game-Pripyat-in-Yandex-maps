// src/components/AddQuestion.js
import React, { useState, useEffect } from 'react';
import { TextField, Button, Container, Typography, List, ListItem, ListItemText } from '@mui/material';
import axios from 'axios';

import config from './config';


const AddQuestion = () => {
  const [question, setQuestion] = useState("");
  const [answers, setAnswers] = useState([]);
  const [questionsList, setQuestionsList] = useState([]);

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const response = await axios.get(`${config.apiBaseUrl}/api/questions`);
        setQuestionsList(response.data.questions);
      } catch (error) {
        console.error("Error fetching questions", error);
      }
    };

    fetchQuestions();
  }, []);

  const handleAddQuestion = async () => {
    try {
      const response = await axios.post(`${config.apiBaseUrl}/api/add-question`, {
        question,
        answers,
      });
      if (response.data.success) {
        alert("Question added successfully!");
        const updatedQuestions = [...questionsList, { question, answers }];
        setQuestionsList(updatedQuestions);
        setQuestion("");
        setAnswers([]);
      }
    } catch (error) {
      console.error("Error adding question", error);
    }
  };

  const handleDeleteQuestions = async () => {
    try {
      // TODO: Implement deletion logic
    } catch (error) {
      console.error("Error deleting questions", error);
    }
  };

  return (
    <Container maxWidth="sm">
      <Typography variant="h4">Add New Question</Typography>
      <TextField
        fullWidth
        label="Question"
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        style={{ marginBottom: 20 }}
      />
      <TextField
        fullWidth
        label="Answers (comma-separated)"
        value={answers.join(",")}
        onChange={(e) => setAnswers(e.target.value.split(","))}
        style={{ marginBottom: 20 }}
      />
      <Button variant="contained" color="primary" onClick={handleAddQuestion}>
        Add Question
      </Button>

      <Typography variant="h5" style={{ marginTop: 40 }}>Manage Questions</Typography>
      <List>
        {questionsList.map((q, index) => (
          <ListItem key={index}>
            <ListItemText primary={q.question} secondary={q.answers.join(", ")} />
          </ListItem>
        ))}
      </List>
      <Button
        variant="contained"
        color="secondary"
        onClick={handleDeleteQuestions}
      >
        Delete Selected Questions
      </Button>
    </Container>
  );
};

export default AddQuestion;
