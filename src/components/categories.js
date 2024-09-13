// src/components/Categories.js
import React from "react";
import { Grid, Typography, Card, CardContent } from "@mui/material";

const categories = [
  { name: "А (люди)", blocks: 12 },
  { name: "Б (предметы)", blocks: 12 },
  { name: "С (транспорт/строения)", blocks: 12 },
];

const Categories = () => {
  return (
    <div style={{ padding: "20px" }}>
      <Typography variant="h4" gutterBottom>
        Объект для взаимодействия
      </Typography>
      {categories.map((category) => (
        <div key={category.name} style={{ marginBottom: "20px" }}>
          <Typography variant="h5">{category.name}</Typography>
          <Grid container spacing={2}>
            {Array.from({ length: category.blocks }).map((_, index) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={index}>
                <Card>
                  <CardContent>
                    <Typography variant="body1">Номер блока {index + 1}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </div>
      ))}
    </div>
  );
};

export default Categories;
