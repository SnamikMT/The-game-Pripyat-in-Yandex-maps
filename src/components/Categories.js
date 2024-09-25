import React, { useState, useEffect } from "react";
import {
  Grid,
  Typography,
  Select,
  MenuItem,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Card,
  CardContent,
  Checkbox,
  FormControlLabel,
} from "@mui/material";
import config from "./config";
import Background from './Background.jpg';
import DocumentIcon from './document-icon.png';
import VoiceMessageIcon from './voice-message-icon.png';

const Categories = ({ team }) => {
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [foundBlock, setFoundBlock] = useState(null);
  const [updatedTitle, setUpdatedTitle] = useState("");
  const [updatedDescription, setUpdatedDescription] = useState("");
  const [updatedImage, setUpdatedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Получение блоков при монтировании
  useEffect(() => {
    fetch(`${config.apiBaseUrl}/api/blocks`)
      .then(response => response.json())
      .then(data => setCategories(data))
      .catch(error => console.error('Error loading block data:', error));
  }, []);

  // Обработка смены категории
  const handleCategoryChange = (event) => {
    setSelectedCategory(event.target.value);
    setFoundBlock(null);
    setHasSearched(false);
  };

  // Обработка ввода номера блока
  const handleInputChange = (event) => {
    setInputValue(event.target.value);
    setFoundBlock(null);
    setHasSearched(false);
  };

  // Поиск блока по категории и номеру
const handleSearch = async () => {
  const categoryData = categories.find(category => category.category === selectedCategory);
  if (categoryData) {
    const block = categoryData.blocks.find(block => block.number === parseInt(inputValue));
    if (block) {
      setFoundBlock({
        ...block,
        showDocumentIcon: block.showDocumentIcon || false,
        showVoiceMessageIcon: block.showVoiceMessageIcon || false,
      });
      setUpdatedTitle(block.title);
      setUpdatedDescription(block.description);
      setImagePreview(block.imageUrl ? `${config.BASE_URL}${block.imageUrl}` : "");
      setIsEditing(false);

      // Увеличиваем количество ходов и записываем историю
      if (team && team.username) {
        await updateMoves(team.username);
        await saveSearchHistory(team.username, block.number, selectedCategory);
      }
    } else {
      setFoundBlock(null);
    }
  }
  setHasSearched(true);
};

// Функция для сохранения истории поиска
const saveSearchHistory = async (teamName, blockNumber, category) => {
  try {
    const response = await fetch(`${config.apiBaseUrl}/api/save-history`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ teamName, blockNumber, category }),
    });
    const result = await response.json();
    if (result.message === 'История поиска сохранена') {
      console.log('История поиска успешно записана');
    } else {
      console.error(result.message);
    }
  } catch (error) {
    console.error('Ошибка при записи истории поиска:', error);
  }
};

  // Обновление количества ходов через API
  const updateMoves = async (teamName) => {
    try {
      const response = await fetch(`${config.apiBaseUrl}/api/update-moves`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ teamName }),
      });
      const result = await response.json();
      if (result.success) {
        console.log(`Moves updated: ${result.moves}`);
      } else {
        console.error(result.message);
      }
    } catch (error) {
      console.error('Error updating moves:', error);
    }
  };

  // Обновление информации о блоке
  const updateBlock = () => {
    const formData = new FormData();
    formData.append("title", updatedTitle);
    formData.append("description", updatedDescription);
    if (updatedImage) {
      formData.append("image", updatedImage);
    }
    formData.append("showDocumentIcon", foundBlock.showDocumentIcon);
    formData.append("showVoiceMessageIcon", foundBlock.showVoiceMessageIcon);

    fetch(`${config.apiBaseUrl}/${encodeURIComponent(selectedCategory)}/${inputValue}`, {
      method: 'PUT',
      body: formData,
    })
      .then(response => response.json())
      .then(data => {
        if (data.message === 'Block successfully updated') {
          setFoundBlock(prevBlock => ({
            ...prevBlock,
            title: updatedTitle,
            description: updatedDescription,
            imageUrl: data.imageUrl || prevBlock.imageUrl,
            showDocumentIcon: foundBlock.showDocumentIcon,
            showVoiceMessageIcon: foundBlock.showVoiceMessageIcon,
          }));
          setImagePreview(data.imageUrl || imagePreview);
          alert('Block successfully updated');
          setIsEditing(false);
        } else {
          alert(data.message);
        }
      })
      .catch(error => console.error('Error updating block:', error));
  };

  // Обработка изменения изображения
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUpdatedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    } else {
      alert('Пожалуйста выберете изображение');
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        padding: "20px",
        backgroundImage: `url(${Background})`,
        backgroundSize: 'cover',
        backgroundAttachment: 'fixed',
        backgroundPosition: 'center'
      }}
    >
      <div style={{ width: '100%', maxWidth: '600px', background: 'rgba(255, 255, 255, 0.8)', padding: '20px', borderRadius: '10px' }}>
        <Typography variant="h4" gutterBottom>
          Сделать ход
        </Typography>

        <Grid container spacing={2} alignItems="center" style={{ marginBottom: "20px" }}>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth>
              <InputLabel id="category-select-label">Выбрать категорию</InputLabel>
              <Select
                labelId="category-select-label"
                value={selectedCategory}
                onChange={handleCategoryChange}
              >
                {categories.map(category => (
                  <MenuItem key={category.category} value={category.category}>
                    {category.category}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              label="Введите номер"
              fullWidth
              value={inputValue}
              onChange={handleInputChange}
              type="number"
            />
          </Grid>

          <Grid item xs={12} sm={2}>
            <Button className="searchCategory" variant="contained" color="#ffeb99" fullWidth onClick={handleSearch}>
              Поиск
            </Button>
          </Grid>
        </Grid>

        {foundBlock && (
          <Card>
            <CardContent style={{ textAlign: 'center' }}>
              <Typography variant="h5">{foundBlock.title}</Typography>
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                {imagePreview && (
                  <img
                    src={imagePreview}
                    alt="Preview"
                    style={{ width: '30%', height: 'auto', marginTop: '10px', objectFit: 'contain' }}
                  />
                )}
                {foundBlock.showDocumentIcon && (
                  <img src={DocumentIcon} alt="Document Icon" style={{ width: '10%', marginLeft: '10px' }} />
                )}
                {foundBlock.showVoiceMessageIcon && (
                  <img src={VoiceMessageIcon} alt="Voice Message Icon" style={{ width: '10%', marginLeft: '10px' }} />
                )}
              </div>
              <Typography variant="body1">{foundBlock.description}</Typography>

              {team && team.role === 'admin' && (
                <>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={foundBlock.showDocumentIcon}
                        onChange={() => setFoundBlock(prevBlock => ({ ...prevBlock, showDocumentIcon: !prevBlock.showDocumentIcon }))}
                      />
                    }
                    label="Show Document Icon"
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={foundBlock.showVoiceMessageIcon}
                        onChange={() => setFoundBlock(prevBlock => ({ ...prevBlock, showVoiceMessageIcon: !prevBlock.showVoiceMessageIcon }))}
                      />
                    }
                    label="Show Voice Message Icon"
                  />

                  {isEditing ? (
                    <>
                      <TextField
                        label="Update Title"
                        value={updatedTitle}
                        onChange={(e) => setUpdatedTitle(e.target.value)}
                        fullWidth
                      />
                      <TextField
                        label="Update Description"
                        value={updatedDescription}
                        onChange={(e) => setUpdatedDescription(e.target.value)}
                        fullWidth
                      />
                      <input type="file" accept="image/*" onChange={handleImageChange} />
                      <Button variant="contained" color="primary" onClick={updateBlock}>Обновить</Button>
                    </>
                  ) : (
                    <Button variant="outlined" color="secondary" onClick={() => setIsEditing(true)}>Редактировать</Button>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Categories;
