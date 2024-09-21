// src/components/Categories.js
import React, { useState, useEffect } from "react";
import { Grid, Typography, Select, MenuItem, TextField, Button, FormControl, InputLabel, Card, CardContent } from "@mui/material";

const Categories = ({ team }) => {
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [foundBlock, setFoundBlock] = useState(null);
  const [updatedTitle, setUpdatedTitle] = useState("");
  const [updatedDescription, setUpdatedDescription] = useState("");

  useEffect(() => {
    fetch('http://localhost:5000/api/blocks')
      .then(response => response.json())
      .then(data => {
        setCategories(data);
      })
      .catch(error => {
        console.error('Ошибка при загрузке данных блоков:', error);
      });
  }, []);

  const handleCategoryChange = (event) => {
    setSelectedCategory(event.target.value);
    setFoundBlock(null);
  };

  const handleInputChange = (event) => {
    setInputValue(event.target.value);
    setFoundBlock(null);
  };

  const handleSearch = () => {
    const categoryData = categories.find((category) => category.category === selectedCategory);
    if (categoryData) {
      const block = categoryData.blocks.find((block) => block.number === parseInt(inputValue));
      if (block) {
        setFoundBlock(block);
        setUpdatedTitle(block.title);
        setUpdatedDescription(block.description);
      } else {
        setFoundBlock(null);
      }
    }
  };

  const updateBlock = () => {
    fetch(`http://localhost:5000/api/blocks/${encodeURIComponent(selectedCategory)}/${inputValue}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: updatedTitle,
        description: updatedDescription,
      }),
    })
      .then(response => response.json())
      .then(data => {
        if (data.message === 'Блок успешно обновлен') {
          setFoundBlock(prevBlock => ({
            ...prevBlock,
            title: updatedTitle,
            description: updatedDescription,
          }));
          alert('Блок успешно обновлен');
        } else {
          alert(data.message);
        }
      })
      .catch(error => {
        console.error('Ошибка при обновлении блока:', error);
      });
  };

  return (
    <div style={{ padding: "20px" }}>
      <Typography variant="h4" gutterBottom>
        Объект для взаимодействия
      </Typography>
      
      <Grid container spacing={2} alignItems="center" style={{ marginBottom: "20px" }}>
        <Grid item xs={12} sm={4}>
          <FormControl fullWidth>
            <InputLabel id="category-select-label">Выберите категорию</InputLabel>
            <Select
              labelId="category-select-label"
              value={selectedCategory}
              onChange={handleCategoryChange}
            >
              {categories.map((category) => (
                <MenuItem key={category.category} value={category.category}>
                  {category.category}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        
        <Grid item xs={12} sm={6}>
          <TextField
            label="Введите номер блока"
            fullWidth
            value={inputValue}
            onChange={handleInputChange}
            type="number"
          />
        </Grid>
        
        <Grid item xs={12} sm={2}>
          <Button variant="contained" color="primary" fullWidth onClick={handleSearch}>
            Искать
          </Button>
        </Grid>
      </Grid>

      {foundBlock && (
        <Card>
          <CardContent>
            <Typography variant="h5">{foundBlock.title}</Typography>
            <Typography variant="body1">{foundBlock.description}</Typography>
            {team && team.role === 'admin' && (
              <>
                <TextField
                  label="Новое название"
                  fullWidth
                  value={updatedTitle}
                  onChange={(e) => setUpdatedTitle(e.target.value)}
                />
                <TextField
                  label="Новое описание"
                  fullWidth
                  value={updatedDescription}
                  onChange={(e) => setUpdatedDescription(e.target.value)}
                />
                <Button variant="contained" color="secondary" onClick={updateBlock}>
                  Обновить блок
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {!foundBlock && selectedCategory && inputValue && (
        <Typography variant="body1" color="error">
          Блок не найден
        </Typography>
      )}
    </div>
  );
};

export default Categories;
