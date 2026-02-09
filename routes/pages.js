const express = require("express");
const router = express.Router();

const { requireAuth, redirectIfAuth } = require("../middleware/authGuards");

// Landing page
router.get('/', redirectIfAuth, (req, res) => {
	res.render('index', { title: 'Home' });
});

// Login page
router.get('/login', redirectIfAuth, (req, res) => {
	res.render('login', { title: 'Login' });
});

// Registration page
router.get('/register', redirectIfAuth, (req, res) => {
	res.render('register', { title: 'Register' });
});

// Dashboard page
router.get('/dashboard', requireAuth, (req, res) => {
	res.render('dashboard', { title: 'Dashboard' });
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