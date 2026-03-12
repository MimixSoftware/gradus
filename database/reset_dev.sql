USE gradus;

DROP TABLE IF EXISTS scheduled_tasks;
DROP TABLE IF EXISTS study_sessions;
DROP TABLE IF EXISTS tasks;
DROP TABLE IF EXISTS assignments;
DROP TABLE IF EXISTS modules;
DROP TABLE IF EXISTS user_settings;
DROP TABLE IF EXISTS semesters;
DROP TABLE IF EXISTS users;

SOURCE database/schema/01_users.sql;
SOURCE database/schema/02_semesters.sql;
SOURCE database/schema/03_user_settings.sql;
SOURCE database/schema/04_modules.sql;
SOURCE database/schema/05_assignments.sql;
SOURCE database/schema/06_tasks.sql;
SOURCE database/schema/07_study_sessions.sql;
SOURCE database/schema/08_scheduled_tasks.sql;

SOURCE database/seeds/dev_seed.sql;