import React, { useState, useEffect } from "react";
import { Grid, Typography, Select, MenuItem, TextField, Button, FormControl, InputLabel, Card, CardContent, Checkbox, FormControlLabel } from "@mui/material";
import config from "./config"; // Импортируйте файл конфигурации
import Background from './Background.jpg'; // Импортируем картинку для фона
import DocumentIcon from './document-icon.png'; // Фиксированная картинка для "документика"
import VoiceMessageIcon from './voice-message-icon.png'; // Фиксированная картинка для "голосового сообщения"

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

  // Состояния для галочек
  const [showDocumentIcon, setShowDocumentIcon] = useState(false);
  const [showVoiceMessageIcon, setShowVoiceMessageIcon] = useState(false);

  // Загрузка категорий из API
  useEffect(() => {
    fetch('http://localhost:5000/api/blocks')
      .then(response => response.json())
      .then(data => {
        setCategories(data);
      })
      .catch(error => {
        console.error('Error loading block data:', error);
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
        setImagePreview(block.imageUrl || ""); // Установить изображение из блока
        setIsEditing(false);
      } else {
        setFoundBlock(null);
      }
    }
  };

  const updateBlock = () => {
    const formData = new FormData();
    formData.append("title", updatedTitle);
    formData.append("description", updatedDescription);
    if (updatedImage) {
      formData.append("image", updatedImage);
    }

    fetch(`http://localhost:5000/api/blocks/${encodeURIComponent(selectedCategory)}/${inputValue}`, {
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
          }));
          setImagePreview(data.imageUrl || imagePreview); // Обновляем предварительный просмотр
          alert('Block successfully updated');
          setIsEditing(false);
        } else {
          alert(data.message);
        }
      })
      .catch(error => {
        console.error('Error updating block:', error);
      });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) {
      alert('Please select an image');
      return;
    }

    setUpdatedImage(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result); // Предварительный просмотр загружаемого изображения
    };
    reader.readAsDataURL(file);
  };

  return (
    <div 
      style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh', 
        padding: "20px",
        backgroundImage: `url(${Background})`, // Устанавливаем фон
        backgroundSize: 'cover', // Картинка будет покрывать весь экран
        backgroundAttachment: 'fixed', // Фиксированная картинка фона
        backgroundPosition: 'center' 
      }}
    >
      <div style={{ width: '100%', maxWidth: '600px', background: 'rgba(255, 255, 255, 0.8)', padding: '20px', borderRadius: '10px' }}>
        <Typography variant="h4" gutterBottom>
          Block Interaction
        </Typography>
        
        <Grid container spacing={2} alignItems="center" style={{ marginBottom: "20px" }}>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth>
              <InputLabel id="category-select-label">Select Category</InputLabel>
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
              label="Enter Block Number"
              fullWidth
              value={inputValue}
              onChange={handleInputChange}
              type="number"
            />
          </Grid>
          
          <Grid item xs={12} sm={2}>
            <Button variant="contained" color="primary" fullWidth onClick={handleSearch}>
              Search
            </Button>
          </Grid>
        </Grid>

        {foundBlock && (
          <Card>
            <CardContent style={{ textAlign: 'center' }}> {/* Центрирование содержимого */} 
              <Typography variant="h5">{foundBlock.title}</Typography>
              {foundBlock && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  <img 
                    src={`${config.BASE_URL}${foundBlock.imageUrl}`} // Строим полный URL
                    alt="Preview"
                    style={{ 
                      width: '30%', 
                      height: 'auto', 
                      marginTop: '10px', 
                      maxWidth: '100%', // Ограничиваем максимальную ширину изображения
                      objectFit: 'contain', // Сохраняем пропорции изображения
                    }}
                  />
                  {/* Фиксированные картинки */}
                  {showDocumentIcon && (
                    <img
                      src={DocumentIcon}
                      alt="Document Icon"
                      style={{ width: '10%', marginLeft: '10px' }}
                    />
                  )}
                  {showVoiceMessageIcon && (
                    <img
                      src={VoiceMessageIcon}
                      alt="Voice Message Icon"
                      style={{ width: '10%', marginLeft: '10px' }}
                    />
                  )}
                </div>
              )}

              <Typography variant="body1">{foundBlock.description}</Typography>

              {team && team.role === 'admin' && (
                <>
                  {/* Галочки для администратора */}
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={showDocumentIcon}
                        onChange={(e) => setShowDocumentIcon(e.target.checked)}
                      />
                    }
                    label="Show Document Icon"
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={showVoiceMessageIcon}
                        onChange={(e) => setShowVoiceMessageIcon(e.target.checked)}
                      />
                    }
                    label="Show Voice Message Icon"
                  />
                  
                  <Button 
                    variant="contained" 
                    color={isEditing ? "secondary" : "primary"} 
                    onClick={() => setIsEditing(!isEditing)}
                    style={{ marginTop: "10px" }}
                  >
                    {isEditing ? 'Cancel Edit' : 'Edit'}
                  </Button>
                  {isEditing && (
                    <>
                      <TextField
                        label="New Title"
                        fullWidth
                        value={updatedTitle}
                        onChange={(e) => setUpdatedTitle(e.target.value)}
                        style={{ marginTop: "10px" }}
                      />
                      <TextField
                        label="New Description"
                        fullWidth
                        value={updatedDescription}
                        onChange={(e) => setUpdatedDescription(e.target.value)}
                        style={{ marginTop: "10px", marginBottom: "10px" }}
                      />
                      <Button
                        variant="contained"
                        component="label"
                        style={{ marginBottom: "10px" }}
                      >
                        Upload Image
                        <input
                          type="file"
                          accept="image/*"
                          hidden
                          onChange={handleImageChange}
                        />
                      </Button>
                      {imagePreview && (
                        <div>
                          <Typography variant="caption">Preview:</Typography>
                          <img
                            src={imagePreview}
                            alt="Preview"
                            style={{ width: "100%", maxHeight: "300px", objectFit: "contain" }}
                          />
                        </div>
                      )}
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={updateBlock}
                      >
                        Save Changes
                      </Button>
                    </>
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
