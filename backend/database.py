import sqlite3
import os
from contextlib import contextmanager

DB_PATH = os.getenv("DATABASE_URL", "sqlite:///./data/blugen.db").replace("sqlite:///", "")

def get_db_path():
    os.makedirs(os.path.dirname(DB_PATH) or ".", exist_ok=True)
    return DB_PATH

@contextmanager
def get_db():
    conn = sqlite3.connect(get_db_path())
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

def init_db():
    with get_db() as db:
        db.executescript("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                phone TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                password_hash TEXT NOT NULL,
                role TEXT NOT NULL CHECK(role IN ('admin', 'trainer', 'trainee')),
                is_active INTEGER DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS exercises (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                name_en TEXT,
                muscle_group TEXT,
                emoji TEXT DEFAULT '🏋️',
                is_active INTEGER DEFAULT 1
            );

            CREATE TABLE IF NOT EXISTS packages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                trainee_id INTEGER NOT NULL REFERENCES users(id),
                trainer_id INTEGER NOT NULL REFERENCES users(id),
                total_sessions INTEGER NOT NULL,
                used_sessions INTEGER DEFAULT 0,
                package_type TEXT DEFAULT 'every_other_day',
                start_date TEXT,
                is_active INTEGER DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS programs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                trainee_id INTEGER NOT NULL REFERENCES users(id),
                trainer_id INTEGER NOT NULL REFERENCES users(id),
                package_id INTEGER REFERENCES packages(id),
                name TEXT NOT NULL,
                session_number INTEGER,
                notes TEXT,
                is_active INTEGER DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS program_exercises (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                program_id INTEGER NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
                exercise_id INTEGER NOT NULL REFERENCES exercises(id),
                sets INTEGER NOT NULL DEFAULT 3,
                reps INTEGER NOT NULL DEFAULT 10,
                rest_seconds INTEGER DEFAULT 60,
                weight REAL DEFAULT 0,
                sort_order INTEGER DEFAULT 0,
                notes TEXT
            );

            CREATE TABLE IF NOT EXISTS workout_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                trainee_id INTEGER NOT NULL REFERENCES users(id),
                program_id INTEGER NOT NULL REFERENCES programs(id),
                exercise_id INTEGER NOT NULL REFERENCES exercises(id),
                set_number INTEGER NOT NULL,
                weight REAL,
                reps INTEGER,
                completed INTEGER DEFAULT 0,
                logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_programs_trainee ON programs(trainee_id);
            CREATE INDEX IF NOT EXISTS idx_workout_logs_trainee ON workout_logs(trainee_id);
            CREATE INDEX IF NOT EXISTS idx_packages_trainee ON packages(trainee_id);
        """)

def seed_exercises():
    exercises = [
        ("پرس سینه", "Bench Press", "سینه", "🏋️"),
        ("اسکات", "Squat", "پا", "🦵"),
        ("ددلیفت", "Deadlift", "پشت", "💪"),
        ("پرس سرشانه", "Shoulder Press", "شانه", "🏋️"),
        ("جلو بازو", "Bicep Curl", "بازو", "💪"),
        ("پشت بازو", "Tricep Extension", "بازو", "💪"),
        ("زیر بغل", "Lat Pulldown", "پشت", "🔙"),
        ("ساق پا", "Calf Raise", "پا", "🦵"),
        ("شکم", "Crunch", "شکم", "🎯"),
        ("پرس پا", "Leg Press", "پا", "🦵"),
        ("فلای سینه", "Chest Fly", "سینه", "🏋️"),
        ("لانگ", "Lunge", "پا", "🦵"),
        ("بارفیکس", "Pull Up", "پشت", "💪"),
        ("دیپ", "Dip", "سینه", "🏋️"),
        ("ردیف با هالتر", "Barbell Row", "پشت", "🔙"),
        ("جلو ران", "Leg Extension", "پا", "🦵"),
        ("پشت ران", "Leg Curl", "پا", "🦵"),
        ("نشر از جانب", "Lateral Raise", "شانه", "🏋️"),
        ("پلانک", "Plank", "شکم", "🎯"),
        ("شراگ", "Shrug", "شانه", "🏋️"),
    ]
    with get_db() as db:
        existing = db.execute("SELECT COUNT(*) FROM exercises").fetchone()[0]
        if existing == 0:
            db.executemany(
                "INSERT INTO exercises (name, name_en, muscle_group, emoji) VALUES (?, ?, ?, ?)",
                exercises
            )

def seed_admin():
    from auth import hash_password
    with get_db() as db:
        existing = db.execute("SELECT COUNT(*) FROM users WHERE role='admin'").fetchone()[0]
        if existing == 0:
            db.execute(
                "INSERT INTO users (phone, name, password_hash, role) VALUES (?, ?, ?, ?)",
                ("09120000000", "مدیر سیستم", hash_password("0000"), "admin")
            )
