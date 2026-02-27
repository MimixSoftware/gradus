USE gradus;
CREATE TABLE scheduled_tasks (
	id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
	task_id INT UNSIGNED NOT NULL,
	study_session_id INT UNSIGNED NOT NULL,
	session_date DATE NOT NULL,
	start_minute INT UNSIGNED NOT NULL,
	duration_minutes INT UNSIGNED NOT NULL,
	created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

	CONSTRAINT fk_scheduled_tasks_task FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
	CONSTRAINT fk_scheduled_tasks_session FOREIGN KEY (study_session_id) REFERENCES study_sessions(id) ON DELETE CASCADE,
	CONSTRAINT chk_scheduled_tasks_start_minute_step CHECK (start_minute % 15 = 0),
	CONSTRAINT chk_scheduled_tasks_duration_minutes CHECK (duration_minutes BETWEEN 15 AND 240),
	CONSTRAINT chk_scheduled_tasks_duration_minutes_step CHECK (duration_minutes % 15 = 0),
	CONSTRAINT uq_scheduled_tasks_unique_slot UNIQUE (study_session_id, session_date, start_minute),
	CONSTRAINT uq_scheduled_tasks_unique_task_per_session UNIQUE (task_id, study_session_id, session_date),
	CONSTRAINT chk_scheduled_tasks_no_spillover
	CHECK (
		start_minute + duration_minutes <= 240
	)
);