const express = require("express");
const router = express.Router();

// Landing page
router.get('/', (req, res) => {
	res.render('index', { title: 'Home' });
});

// Login page
router.get('/login', (req, res) => {
	res.render('login', { title: 'Login' });
});

// Registration page
router.get('/register', (req, res) => {
	res.render('register', { title: 'Register' });
});

// 404 page
router.get(/.*/, (req, res) => {
	res.status(404).render('error', { 
		title: 'Error',
		statusCode: '404',
		message: `The route ${req.originalUrl} does not exist! Please check the URL and try again.`,
		showHomeButton: true
	});
});

module.exports = router;