require('dotenv').config();

const { validateEnv } = require("./utils/envValidator");
validateEnv();

const express = require('express');
const path = require('path');

const db = require('./database/db');
const maintenanceMode = require('./middleware/maintenanceMode');
const requestLogger = require("./middleware/requestLogger");
const errorHandler = require("./middleware/errorHandler");
const createSessionMiddleware = require("./middleware/session");
const attachUser = require("./middleware/attachUser");

const PORT = process.env.PORT;

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

app.use(createSessionMiddleware(db));

app.use(attachUser);

app.use(requestLogger);
app.use(maintenanceMode);

const authRoutes = require("./modules/auth/auth.routes");
app.use("/api/auth", authRoutes);

const preferenceRoutes = require("./modules/preferences/preference.routes");
app.use("/api/preferences", preferenceRoutes);

const semesterRoutes = require("./modules/semesters/semester.routes");
app.use("/api/semesters", semesterRoutes);

const moduleRoutes = require("./modules/modules/module.routes");
app.use("/api/modules", moduleRoutes);

const assignmentRoutes = require("./modules/assignments/assignment.routes");
app.use("/api/assignments", assignmentRoutes);

const taskRoutes = require("./modules/tasks/task.routes");
app.use("/api/tasks", taskRoutes);

const pageRoutes = require("./routes/pages");
app.use(pageRoutes);

app.use(errorHandler);

app.listen(PORT, () => {
	console.log(`Server running on port ${PORT}.`);
});