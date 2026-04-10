const mysql = require('mysql2/promise');

const pool = mysql.createPool({
	host: process.env.DB_HOST,
	user: process.env.DB_USER,
	password: process.env.DB_PASSWORD,
	database: process.env.DB_NAME,
	port: Number(process.env.DB_PORT),
	waitForConnections: true,
	connectionLimit: 10,
	timezone: "Z",
	dateStrings: ["DATE"]
});

pool.on('connection', (conn) => {
	conn.query("SET time_zone = '+00:00'");
});

module.exports = pool;