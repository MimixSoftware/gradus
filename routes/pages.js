const express = require("express");
const router = express.Router();

const { requireAuth, redirectIfAuth } = require("../middleware/authGuards");

const assignmentService = require("../modules/assignments/assignment.service");
const { validateRequiredInt } = require("./../utils/validationUtils");

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

// Assignment page
router.get('/assignments/:assignmentId', requireAuth, async (req, res) => {
	const assignmentId = validateRequiredInt(req.params.assignmentId, "Assignment ID", { min: 1 });

	const assignment = await assignmentService.findById(req.user.id, assignmentId);

	if (!assignment) {
		res.status(404).render('error', { 
			title: 'Error',
			statusCode: '404',
			message: 'Assignment not found.',
			showHomeButton: true
		});
	}

	res.render('assignment', { title: assignment.name, assignmentId: assignment.id });
});

// Study Sessions page
router.get('/study-sessions', requireAuth, (req, res) => {
	res.render('studySessions', { title: 'Study Sessions' });
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