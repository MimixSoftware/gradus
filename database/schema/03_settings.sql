USE gradus;
CREATE TABLE user_settings (
	user_id INT UNSIGNED PRIMARY KEY,
	active_semester_id INT UNSIGNED NULL,
	theme ENUM('light','dark','system') NOT NULL DEFAULT 'light',
	created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

	CONSTRAINT fk_user_settings_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
	CONSTRAINT fk_user_settings_semester FOREIGN KEY (active_semester_id) REFERENCES semesters(id) ON DELETE SET NULL
);