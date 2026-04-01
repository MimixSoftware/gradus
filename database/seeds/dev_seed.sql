-- USER 1 PASSWORD: password

USE gradus;

-- users
INSERT INTO users (email, forename, surname, password_hash)
VALUES
(
	'john@email.com',
	'John',
	'Smith',
	'$2b$12$Cf.xZ3Z09x8WS/S2DCibXuDKVbVbZQwGFDNYSGrWWZms0Yuf3SJza'
);

-- semesters
INSERT INTO semesters (user_id, name, start_date, end_date)
VALUES
(
	1,
	'Year 3 Semester 2',
	'2026-01-15',
	'2026-05-30'
);

-- settings
INSERT INTO user_settings (user_id, active_semester_id, theme)
VALUES
(1, 1, 'light');

-- modules
INSERT INTO modules (semester_id, name, credits, colour)
VALUES
(1, 'Web Application Development', 5, '#22C55E'),
(1, 'Operating Systems', 5, '#EAB308'),
(1, 'Maths for Computer Science', 5, '#3B82F6');


-- assignments
INSERT INTO assignments (module_id, name, description, status, weight, confidence, deadline)
VALUES
(2, 'Essay on Memory Management', 'A 2000 word essay on memory management techniques.', 'active', 40, null, '2026-04-26 22:59:00'),
(1, 'Website Assignment 2', null, 'active', null, null, '2026-05-03 22:59:00');

-- tasks
INSERT INTO tasks (assignment_id, name, description, status, deadline, etc_minutes, atc_minutes)
VALUES
(1, 'Create Essay Doc', 'Create the essay Google Doc and structure.', 'done', null, 15, 10),
(1, 'Write Intro', null, 'doing', '2026-04-19 11:00:00', null, null),
(1, 'Section on Paging', '3 paragraphs.', 'doing', null, 45, null),
(1, 'Section on Segmentation', '3 paragraphs.', 'todo', null, 45, null),
(1, 'Section on Virtual Memory', '3 paragraphs.', 'todo', null, 45, null),
(1, 'Proofread and Submit', 'Quick skim over the document and submit on Canvas.', 'todo', null, 30, null);

-- study_sessions
INSERT INTO study_sessions (semester_id, day_of_week, start_time, duration_minutes)
VALUES
(1, 2, '18:00:00', 120),
(1, 3, '08:00:00', 60),
(1, 6, '12:00:00', 180);