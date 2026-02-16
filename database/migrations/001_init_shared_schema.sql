-- Migration for shared PostgreSQL database schema for OmniPost and Webook-3.0 applications
  
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE omnipost_accounts (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE omnipost_posts (
    id SERIAL PRIMARY KEY,
    account_id INT REFERENCES omnipost_accounts(id),
    content TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE omnipost_post_platforms (
    id SERIAL PRIMARY KEY,
    post_id INT REFERENCES omnipost_posts(id),
    platform_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE webook_projects (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE webook_chapters (
    id SERIAL PRIMARY KEY,
    project_id INT REFERENCES webook_projects(id),
    title VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE webook_quizzes (
    id SERIAL PRIMARY KEY,
    chapter_id INT REFERENCES webook_chapters(id),
    title VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE webook_questions (
    id SERIAL PRIMARY KEY,
    quiz_id INT REFERENCES webook_quizzes(id),
    question_text TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE webook_answers (
    id SERIAL PRIMARY KEY,
    question_id INT REFERENCES webook_questions(id),
    answer_text TEXT NOT NULL,
    is_correct BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE webook_user_progress (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    quiz_id INT REFERENCES webook_quizzes(id),
    progress_percentage DECIMAL(5,2) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE webook_badges (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE webook_user_badges (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    badge_id INT REFERENCES webook_badges(id),
    awarded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE payments_orders (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    amount DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE refresh_tokens (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    token VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for optimization
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_omnipost_accounts_user_id ON omnipost_accounts(user_id);
CREATE INDEX idx_omnipost_posts_account_id ON omnipost_posts(account_id);
CREATE INDEX idx_webook_projects_user_id ON webook_projects(user_id);
CREATE INDEX idx_webook_chapters_project_id ON webook_chapters(project_id);
CREATE INDEX idx_webook_quizzes_chapter_id ON webook_quizzes(chapter_id);
CREATE INDEX idx_webook_questions_quiz_id ON webook_questions(quiz_id);
CREATE INDEX idx_webook_answers_question_id ON webook_answers(question_id);
CREATE INDEX idx_webook_user_progress_user_id ON webook_user_progress(user_id);
CREATE INDEX idx_webhook_user_progress_quiz_id ON webook_user_progress(quiz_id);
CREATE INDEX idx_webook_user_badges_user_id ON webook_user_badges(user_id);
CREATE INDEX idx_webook_user_badges_badge_id ON webook_user_badges(badge_id);
CREATE INDEX idx_payments_orders_user_id ON payments_orders(user_id);
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
