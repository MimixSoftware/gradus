require('dotenv').config();

const { validateEnv } = require("./utils/envValidator");
validateEnv();

const express = require('express');
const path = require('path');

const db = require('./db');
const maintenanceMode = require('./middleware/maintenanceMode');
const requestLogger = require("./middleware/requestLogger");
const errorHandler = require("./middleware/errorHandler");
const createSessionMiddleware = require("./middleware/session");

const PORT = process.env.PORT;

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

app.use(createSessionMiddleware(db));

app.use((req, res, next) => {
	res.locals.user = req.session?.user ?? null;
	next();
});

app.use(requestLogger);
app.use(maintenanceMode);

const authRoutes = require("./modules/auth/auth.routes");
app.use("/api/auth", authRoutes);

const pageRoutes = require("./routes/pages");
app.use(pageRoutes);

app.use(errorHandler);

app.listen(PORT, () => {
	console.log(`Server running on port ${PORT}.`);
});