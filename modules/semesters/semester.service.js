const db = require("../../db");
const AppError = require('../../utils/AppError');

function packAvailability(slots) {
	const buf = Buffer.alloc(21, 0);

	for (let i = 0; i < 168; i++) {
		if (slots[i] === 1) {
			const byteIndex = Math.floor(i / 8);
			const bitIndex = i % 8;
			buf[byteIndex] |= 1 << bitIndex;
		}
	}

	return buf;
}

function unpackAvailability(buf) {
	if (!Buffer.isBuffer(buf) || buf.length !== 21) {
		throw new AppError("Invalid availability data.", 500);
	}

	const slots = new Array(168);

	for (let i = 0; i < 168; i++) {
		const byteIndex = Math.floor(i / 8);
		const bitIndex = i % 8;
		slots[i] = (buf[byteIndex] >> bitIndex) & 1;
	}

	return slots;
}

async function overlapCheck(userId, endDate, startDate) {
	const [rows] = await db.query(
		`SELECT 1
		 FROM semesters
		 WHERE user_id = ?
		   AND start_date <= ?
		   AND end_date >= ?
		 LIMIT 1`,
		[userId, endDate, startDate]
	);

	if (rows.length > 0) {
		throw new AppError("Semester dates overlap with an existing semester.", 409);
	}
}

async function findAll(userId) {
	const [rows] = await db.query(
		`SELECT id, user_id, name, start_date, end_date, availability, created_at, updated_at
		FROM semesters
		WHERE user_id = ?
		ORDER BY start_date DESC, id DESC`,
		[userId]
	);

	return rows.map((r) => ({
		id: r.id,
		userId: r.user_id,
		name: r.name,
		startDate: r.start_date,
		endDate: r.end_date,
		availability: unpackAvailability(r.availability),
		createdAt: r.created_at,
		updatedAt: r.updated_at
	}));
}

async function create(userId, { name, startDate, endDate, availability }) {
	await overlapCheck(userId, endDate, startDate);

	try {
		const availabilityBin = packAvailability(availability);

		const [result] = await db.query(
			`INSERT INTO semesters (user_id, name, start_date, end_date, availability)
			VALUES (?, ?, ?, ?, ?)`,
			[userId, name, startDate, endDate, availabilityBin]
		);

		return await findById(userId, result.insertId);
	} catch (err) {
		if (err.code === "ER_DUP_ENTRY") {
			throw new AppError("Semester name already in use.", 409);
		}
		throw err;
	}
}

async function findById(userId, semesterId) {
	const [rows] = await db.query(
		`SELECT id, user_id, name, start_date, end_date, availability, created_at, updated_at
		FROM semesters
		WHERE id = ? AND user_id = ?
		LIMIT 1`,
		[semesterId, userId]
	);

	if (rows.length === 0) {
		throw new AppError("Semester not found.", 404);
	}

	const s = rows[0];

	return {
		id: s.id,
		userId: s.user_id,
		name: s.name,
		startDate: s.start_date,
		endDate: s.end_date,
		availability: unpackAvailability(s.availability),
		createdAt: s.created_at,
		updatedAt: s.updated_at
	};
}

async function update(userId, semesterId, { name, startDate, endDate, availability }) {
	const setParts = [];
	const values = [];

	if (name !== undefined) {
		setParts.push("name = ?");
		values.push(name);
	}

	if (startDate !== undefined && startDate !== undefined) {
		await overlapCheck(userId, endDate, startDate);

		setParts.push("start_date = ?");
		values.push(startDate);

		setParts.push("end_date = ?");
		values.push(endDate);
	}

	if (availability !== undefined) {
		const availabilityBin = packAvailability(availability);
		setParts.push("availability = ?");
		values.push(availabilityBin);
	}

	values.push(semesterId, userId);

	try {
		const [result] = await db.query(
			`UPDATE semesters
			SET ${setParts.join(", ")}
			WHERE id = ? AND user_id = ?`,
			values
		);

		if (result.affectedRows === 0) {
			throw new AppError("Semester not found.", 404);
		}

		return await findById(userId, semesterId);
	} catch (err) {
		if (err.code === "ER_DUP_ENTRY") {
			throw new AppError("Semester name already in use.", 409);
		}
		throw err;
	}
}

async function remove(userId, semesterId) {
	const [result] = await db.query(
		`DELETE FROM semesters
		WHERE id = ? AND user_id = ?`,
		[semesterId, userId]
	);

	if (result.affectedRows === 0) {
		throw new AppError("Semester not found.", 404);
	}
}

module.exports = { findAll, create, findById, update, remove };