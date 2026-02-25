USE gradus;
CREATE TABLE study_sessions (
	id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
	semester_id INT UNSIGNED NOT NULL,
	day_of_week TINYINT UNSIGNED NOT NULL,
	start_time TIME NOT NULL,
	duration_minutes INT UNSIGNED NOT NULL,
	created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

	CONSTRAINT fk_study_sessions_semester FOREIGN KEY (semester_id) REFERENCES semesters(id) ON DELETE CASCADE,
	CONSTRAINT chk_study_sessions_day_of_week CHECK (day_of_week BETWEEN 0 AND 6),
	CONSTRAINT chk_study_sessions_duration_minutes CHECK (duration_minutes BETWEEN 15 AND 240),
	CONSTRAINT uq_study_sessions_unique_slot UNIQUE (semester_id, day_of_week, start_time),
	CONSTRAINT chk_study_sessions_no_spillover
	CHECK (
		TIME_TO_SEC(start_time) + duration_minutes * 60 <= 86400
	)
);