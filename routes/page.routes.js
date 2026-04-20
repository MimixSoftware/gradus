const express = require("express");
const router = express.Router();

const { requireAuth, redirectIfAuth } = require("../middleware/authGuards");

const assignmentService = require("../modules/assignments/assignment.service");
const { validateRequiredInt } = require("../utils/validationUtils");

// Landing page
router.get('/', redirectIfAuth, (req, res) => {
	res.render('index', { title: 'Home', currentYear: new Date().getFullYear() });
});

// Login page
router.get('/login', redirectIfAuth, (req, res) => {
	res.render('login', { title: 'Login', currentYear: new Date().getFullYear() });
});

// Forgot Password page
router.get('/forgot-password', redirectIfAuth, (req, res) => {
	res.render('forgotPassword', { title: 'Forgot Password', currentYear: new Date().getFullYear() });
});

// Registration page
router.get('/register', redirectIfAuth, (req, res) => {
	res.render('register', { title: 'Register', currentYear: new Date().getFullYear() });
});

// Dashboard page
router.get('/dashboard', requireAuth, (req, res) => {
	res.render('dashboard', { title: 'Dashboard', currentYear: new Date().getFullYear() });
});

// Assignment page
router.get('/assignments/:assignmentId', requireAuth, async (req, res) => {
	const assignmentId = validateRequiredInt(req.params.assignmentId, "Assignment ID", { min: 1 });

	const assignment = await assignmentService.findById(req.user.id, assignmentId);

	if (!assignment) {
		res.status(404).render('error', { 
			title: 'Error',
			currentYear: new Date().getFullYear(),
			statusCode: '404',
			message: 'Assignment not found.',
			showHomeButton: true
		});
	}

	res.render('assignment', { title: assignment.name, currentYear: new Date().getFullYear(), assignmentId: assignment.id, assignmentName: assignment.name });
});

// Study Sessions page
router.get('/study-sessions', requireAuth, (req, res) => {
	res.render('studySessions', { title: 'Study Sessions', currentYear: new Date().getFullYear() });
});

// Schedule page
router.get('/schedule', requireAuth, (req, res) => {
	res.render('schedule', { title: 'My Schedule', currentYear: new Date().getFullYear() });
});

// Settings page
router.get('/settings', requireAuth, (req, res) => {
	res.render('settings', { title: 'Settings', currentYear: new Date().getFullYear() });
});

// Statistics page
router.get('/statistics', requireAuth, (req, res) => {
	res.render('statistics', { title: 'Statistics', currentYear: new Date().getFullYear() });
});

// 404 page
router.get(/.*/, (req, res) => {
	res.status(404).render('error', { 
		title: 'Error',
		currentYear: new Date().getFullYear(),
		statusCode: '404',
		message: `The route ${req.originalUrl} does not exist! Please check the URL and try again.`,
		showHomeButton: true
	});
});

module.exports = router;