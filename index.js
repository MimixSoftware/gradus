require('dotenv').config();

const express = require('express');
const path = require('path');

const db = require('./db');
const maintenanceMode = require('./middleware/maintenanceMode');
const requestLogger = require("./middleware/requestLogger");
const errorHandler = require("./middleware/errorHandler");
const asyncHandler = require('./utils/asyncHandler');
const AppError = require('./utils/AppError');

const PORT = process.env.PORT || 3000;

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

app.use(requestLogger);
app.use(maintenanceMode);

app.get('/', (req, res) => {
  res.render('index', { title: 'Home' });
});

app.get('/db-test', asyncHandler(async (req, res, next) => {
  const [rows] = await db.query('SELECT 1 AS ok');
  res.json({ connected: true, result: rows[0] });
}));

app.get(/.*/, (req, res) => {
    res.status(404);
    res.render('error', { title: 'Error', statusCode: '404', message: `The route ${req.originalUrl} does not exist! Please check the URL and try again.`, showHomeButton: true});
});

app.use(errorHandler);

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}.`);
});