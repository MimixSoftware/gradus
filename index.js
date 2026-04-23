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

app.locals.assetVersion = "230420262";

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

app.set("trust proxy", 1);

app.use(createSessionMiddleware(db));

app.use(attachUser);

app.use(requestLogger);
app.use(maintenanceMode);

const authRoutes = require("./modules/auth/auth.routes");
app.use("/api/auth", authRoutes);

const settingsRoutes = require("./modules/settings/settings.routes");
app.use("/api/settings", settingsRoutes);

const semesterRoutes = require("./modules/semesters/semester.routes");
app.use("/api/semesters", semesterRoutes);

const moduleRoutes = require("./modules/modules/module.routes");
app.use("/api/modules", moduleRoutes);

const assignmentRoutes = require("./modules/assignments/assignment.routes");
app.use("/api/assignments", assignmentRoutes);

const taskRoutes = require("./modules/tasks/task.routes");
app.use("/api/tasks", taskRoutes);

const studySessionRoutes = require("./modules/studySessions/studySession.routes");
app.use("/api/study-sessions", studySessionRoutes);

const scheduledTaskRoutes = require("./modules/scheduledTasks/scheduledTask.routes");
app.use("/api/scheduled-tasks", scheduledTaskRoutes);

const statisticsRoutes = require("./modules/statistics/statistics.routes");
app.use("/api/statistics", statisticsRoutes);

const pageRoutes = require("./routes/page.routes");
app.use(pageRoutes);

app.use(errorHandler);

app.listen(PORT, () => {
	console.log(`Server running on port ${PORT}.`);
});