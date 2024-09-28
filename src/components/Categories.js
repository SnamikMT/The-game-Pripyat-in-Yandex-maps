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
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Snackbar,
  Alert,
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
  const [updatedSecondImage, setUpdatedSecondImage] = useState(null);
  const [secondImagePreview, setSecondImagePreview] = useState("");
  const [updatedVoiceMessage, setUpdatedVoiceMessage] = useState(null);
  const [voiceMessagePreview, setVoiceMessagePreview] = useState("");
  const [confirmSearchOpen, setConfirmSearchOpen] = useState(false);
  const [searchNotFoundOpen, setSearchNotFoundOpen] = useState(false);

  useEffect(() => {
    fetch(`${config.apiBaseUrl}/api/blocks`)
      .then(response => response.json())
      .then(data => setCategories(data))
      .catch(error => console.error('Error loading block data:', error));
  }, []);

  const handleCategoryChange = (event) => {
    setSelectedCategory(event.target.value);
    setFoundBlock(null);
    setHasSearched(false);
  };

  const handleInputChange = (event) => {
    setInputValue(event.target.value);
    setFoundBlock(null);
    setHasSearched(false);
  };

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
        setImagePreview(block.imageUrl ? `${config.apiBaseUrl}${block.imageUrl}` : "");
        setSecondImagePreview(block.image2Url ? `${config.apiBaseUrl}${block.image2Url}` : "");
        setVoiceMessagePreview(block.voiceMessageUrl ? `${config.apiBaseUrl}${block.voiceMessageUrl}` : "");
        setIsEditing(false);

        if (team && team.username) {
          await updateMoves(team.username);
          await saveSearchHistory(team.username, block.number, selectedCategory);
        }
      } else {
        setFoundBlock(null);
        await updateMoves(team.username);
        setSearchNotFoundOpen(true);
      }
    }
    setHasSearched(true);
  };

  const handleConfirmSearch = () => {
    setConfirmSearchOpen(false);
    handleSearch();
  };

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

  const updateBlock = async () => {
    const updatedData = {
      title: updatedTitle,
      description: updatedDescription,
      showDocumentIcon: foundBlock.showDocumentIcon,
      showVoiceMessageIcon: foundBlock.showVoiceMessageIcon,
    };
  
    // Загрузка изображений и голосового сообщения, если они были обновлены
    if (updatedImage || updatedSecondImage || updatedVoiceMessage) {
      const formData = new FormData();
      
      if (updatedImage) {
        formData.append('image', updatedImage);
      }
      
      if (updatedSecondImage) {
        formData.append('secondImage', updatedSecondImage);
      }
      
      if (updatedVoiceMessage) {
        formData.append('voiceMessage', updatedVoiceMessage);
      }
  
      try {
        // Запрос на загрузку файлов
        const uploadResponse = await fetch(`${config.apiBaseUrl}/api/upload`, {
          method: 'POST',
          body: formData,
        });
  
        const uploadedFiles = await uploadResponse.json();
  
        // Добавление ссылок на загруженные файлы в updatedData
        if (uploadedFiles.imageUrl) {
          updatedData.imageUrl = uploadedFiles.imageUrl;
        }
        
        if (uploadedFiles.image2Url) {
          updatedData.image2Url = uploadedFiles.image2Url;
        }
        
        if (uploadedFiles.voiceMessageUrl) {
          updatedData.voiceMessageUrl = uploadedFiles.voiceMessageUrl;
        }
      } catch (error) {
        console.error('Error uploading files:', error);
      }
    }
  
    // Форматирование категории для запроса
    const formattedCategory = selectedCategory.replace(/\s/g, '_').replace(/\(/g, '').replace(/\)/g, '');
  
    // Обновление блока
    fetch(`${config.apiBaseUrl}/api/blocks/${formattedCategory}/${inputValue}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updatedData),
    })
      .then(response => response.json())
      .then(data => {
        console.log('Block updated:', data);
        setIsEditing(false); // Завершение режима редактирования
      })
      .catch(error => {
        console.error('Error updating block:', error);
      });
  };

  const deleteFile = async (fileType) => {
    const formattedCategory = selectedCategory.replace(/\s/g, '_').replace(/\(/g, '').replace(/\)/g, '');
    
    const fileName = 
      fileType === 'image' ? foundBlock.imageUrl.split('/').pop() :
      fileType === 'secondImage' ? foundBlock.image2Url.split('/').pop() :
      fileType === 'voiceMessage' ? foundBlock.voiceMessageUrl.split('/').pop() :
      null;
  
    if (!fileName) return;
  
    try {
      const response = await fetch(`${config.apiBaseUrl}/api/delete-file`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileName,
          category: formattedCategory,
          blockNumber: inputValue, // предполагается, что это номер блока
        }),
      });
      
      if (response.ok) {
        console.log('File deleted successfully');
        // Обновление состояния блока после удаления файла
        setFoundBlock(prev => ({
          ...prev,
          [fileType === 'image' ? 'imageUrl' : fileType === 'secondImage' ? 'image2Url' : 'voiceMessageUrl']: '',
        }));
      } else {
        console.error('Error deleting file:', await response.json());
      }
    } catch (error) {
      console.error('Error deleting file:', error);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUpdatedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSecondImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUpdatedSecondImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setSecondImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleVoiceMessageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUpdatedVoiceMessage(file);
      const reader = new FileReader();
      reader.onloadend = () => setVoiceMessagePreview(reader.result);
      reader.readAsDataURL(file);
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
            <FormControl fullWidth variant="outlined">
              <InputLabel id="category-select-label">Выбрать категорию</InputLabel>
              <Select
                labelId="category-select-label"
                value={selectedCategory}
                onChange={handleCategoryChange}
                label="Выбрать категорию"
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
              variant="outlined"
              value={inputValue}
              onChange={handleInputChange}
              fullWidth
            />
          </Grid>

          <Grid item xs={12} sm={2}>
            <Button variant="contained" color="primary" onClick={() => setConfirmSearchOpen(true)}>
              Найти
            </Button>
          </Grid>
        </Grid>

        {foundBlock && (
          <Card style={{ marginTop: "20px" }}>
          <CardContent>
            <div className="categoryHead">
              {imagePreview && (
                <img src={imagePreview} alt="Image preview" style={{ width: '100px', marginBottom: '10px' }} />
              )}
              {foundBlock.showDocumentIcon && (
                <img src={DocumentIcon} alt="Document" style={{ width: 70, height: 70, marginBottom: "10px" }} />
              )}
              {foundBlock.showVoiceMessageIcon && (
                <img src={VoiceMessageIcon} alt="Voice Message" style={{ width: 70, height: 70, marginBottom: "10px" }} />
              )}
            </div>
          
            <Typography variant="h5" style={{ marginBottom: "10px" , fontSize: "25px", textAlign: "center"}}>{foundBlock.title}</Typography>
            <Typography variant="body1" style={{ marginBottom: "10px", fontSize: "15px" }}>{foundBlock.description}</Typography>
        
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: "10px" }}>
 
              
              {secondImagePreview && (
                <img src={secondImagePreview} alt="Second Image preview" style={{ width: '60%', marginBottom: '10px' }} />
              )}
              {voiceMessagePreview && (
                <audio controls src={voiceMessagePreview} style={{ width: '100%', marginBottom: '10px' }} />
              )}
            </div>
        
            {isEditing && (
              <>
                <TextField
                  label="Обновить заголовок"
                  variant="outlined"
                  value={updatedTitle}
                  onChange={(e) => setUpdatedTitle(e.target.value)}
                  fullWidth
                  style={{ marginBottom: '10px' }}
                />
                <TextField
                  label="Обновить описание"
                  variant="outlined"
                  value={updatedDescription}
                  onChange={(e) => setUpdatedDescription(e.target.value)}
                  fullWidth
                  style={{ marginBottom: '10px' }}
                />
                <input type="file" accept="image/*" onChange={handleImageChange} style={{ marginBottom: '10px' }} />
                <Button
                  variant="outlined"
                  color="secondary"
                  onClick={() => deleteFile('image')}
                  style={{ marginBottom: '10px', width: '100%' }}
                >
                  Удалить изображение
                </Button>
        
                <input type="file" accept="image/*" onChange={handleSecondImageChange} style={{ marginBottom: '10px' }} />
                <Button
                  variant="outlined"
                  color="secondary"
                  onClick={() => deleteFile('secondImage')}
                  style={{ marginBottom: '10px', width: '100%' }}
                >
                  Удалить второе изображение
                </Button>
        
                <input type="file" accept="audio/*" onChange={handleVoiceMessageChange} style={{ marginBottom: '10px' }} />
                <Button
                  variant="outlined"
                  color="secondary"
                  onClick={() => deleteFile('voiceMessage')}
                  style={{ marginBottom: '10px', width: '100%' }}
                >
                  Удалить голосовое сообщение
                </Button>
        
                <Button
                  variant="contained"
                  color="primary"
                  onClick={updateBlock}
                  style={{ marginBottom: '10px', width: '100%' }}
                >
                  Сохранить
                </Button>
              </>
            )}
        
            {team?.role === "admin" && !isEditing && (
              <Button
                variant="outlined"
                color="secondary"
                onClick={() => setIsEditing(true)}
                style={{ marginTop: '10px', width: '100%' }}
              >
                Редактировать
              </Button>
            )}
          </CardContent>
        </Card>
        
        )}
      {/* Модальное окно подтверждения поиска */}
      <Dialog 
        open={confirmSearchOpen} 
        onClose={() => setConfirmSearchOpen(false)} 
        PaperProps={{
          style: { backgroundColor: '#363636', color: 'white' }, // Темный фон и белый текст
        }}
      >
        <DialogTitle style={{ color: 'white' }}>Подтвердите поиск</DialogTitle>
        <DialogContent>
          <DialogContentText style={{ color: 'white' }}>
            Вы действительно хотите выполнить поиск?
          </DialogContentText>
        </DialogContent>
            <DialogActions>
              <Button 
                onClick={() => setConfirmSearchOpen(false)} 
                style={{
                  backgroundColor: '#ed3f3f', 
                  color: 'white',
                  borderRadius: '5px',
                  padding: '8px 15px',
                }}
              >
                Отмена
              </Button>
              <Button 
                onClick={handleConfirmSearch} 
                style={{
                  backgroundColor: '#ffeba0', 
                  color: '#272727',
                  borderRadius: '5px',
                  padding: '8px 15px',
                }}
              >
                Да
              </Button>
            </DialogActions>
          </Dialog>

          {/* Уведомление, если ничего не найдено */}
          <Snackbar 
            open={searchNotFoundOpen} 
            autoHideDuration={3000} 
            onClose={() => setSearchNotFoundOpen(false)}
            anchorOrigin={{ vertical: 'top', horizontal: 'center' }} // Позиционирование уведомления
          >
            <Alert 
              onClose={() => setSearchNotFoundOpen(false)} 
              severity="warning" 
              style={{  
                backgroundColor: '#363636', 
                color: 'white', 
                borderRadius: '5px', 
                padding: '10px 20px',
              }}
            >
              Ничего не найдено по запросу.
            </Alert>
          </Snackbar>

      </div>
    </div>
  );
};

export default Categories;
