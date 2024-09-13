// src/components/TeamOptions.js
import React, { useState } from "react";
import { Button, Grid, Typography, Container } from "@mui/material";

const options = Array.from({ length: 36 }, (_, i) => `Option ${i + 1}`);

const TeamOptions = ({ onOptionSelect }) => {
  const [selectedOption, setSelectedOption] = useState(null);

  const handleOptionClick = (option) => {
    setSelectedOption(option);
    onOptionSelect(option);
  };

  return (
    <Container maxWidth="md">
      <Typography variant="h4" gutterBottom>
        Choose an Option
      </Typography>
      <Grid container spacing={2}>
        {options.map((option) => (
          <Grid item xs={4} key={option}>
            <Button
              fullWidth
              variant={selectedOption === option ? "contained" : "outlined"}
              color="primary"
              onClick={() => handleOptionClick(option)}
            >
              {option}
            </Button>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
};

export default TeamOptions;
