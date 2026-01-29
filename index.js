require('dotenv').config();

const PORT = process.env.PORT || 3000;

const express = require('express');
const path = require('path');
const db = require('./db');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

app.get('/', (req, res) => {
    res.render('index', { title: 'Home' });
});

app.get('/db-test', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT 1 AS ok');
    res.json({ connected: true, result: rows[0] });
  } catch (err) {
    res.status(500).json({ connected: false, error: err.message });
  }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}.`);
});