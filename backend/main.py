from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from database import get_db, init_db, seed_exercises, seed_admin
from auth import (
    hash_password, verify_password, create_token,
    get_current_user, require_trainer, require_admin
)
from models import *

app = FastAPI(title="Blugen API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup():
    init_db()
    seed_exercises()
    seed_admin()


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# AUTH
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@app.post("/api/auth/login")
def login(req: LoginRequest):
    with get_db() as db:
        user = db.execute(
            "SELECT * FROM users WHERE phone=? AND is_active=1",
            (req.phone,)
        ).fetchone()
    if not user or not verify_password(req.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="شماره یا رمز عبور اشتباه است")
    token = create_token(user["id"], user["role"])
    return {
        "token": token,
        "user": {
            "id": user["id"],
            "phone": user["phone"],
            "name": user["name"],
            "role": user["role"],
        }
    }

@app.post("/api/auth/change-password")
def change_password(req: ChangePasswordRequest, current=Depends(get_current_user)):
    with get_db() as db:
        user = db.execute("SELECT * FROM users WHERE id=?", (current["user_id"],)).fetchone()
        if not verify_password(req.old_password, user["password_hash"]):
            raise HTTPException(status_code=400, detail="رمز فعلی اشتباه است")
        db.execute(
            "UPDATE users SET password_hash=? WHERE id=?",
            (hash_password(req.new_password), current["user_id"])
        )
    return {"message": "رمز عبور تغییر کرد"}

@app.get("/api/auth/me")
def get_me(current=Depends(get_current_user)):
    with get_db() as db:
        user = db.execute(
            "SELECT id, phone, name, role FROM users WHERE id=?",
            (current["user_id"],)
        ).fetchone()
    return dict(user)


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# USERS (trainer/admin only)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@app.get("/api/users")
def list_users(role: str = None, current=Depends(require_trainer)):
    with get_db() as db:
        if role:
            users = db.execute(
                "SELECT id, phone, name, role, created_at FROM users WHERE role=? AND is_active=1",
                (role,)
            ).fetchall()
        else:
            users = db.execute(
                "SELECT id, phone, name, role, created_at FROM users WHERE is_active=1"
            ).fetchall()
    return [dict(u) for u in users]

@app.post("/api/users")
def create_user(req: UserCreate, current=Depends(require_trainer)):
    default_password = req.phone[-4:]
    with get_db() as db:
        existing = db.execute("SELECT id FROM users WHERE phone=?", (req.phone,)).fetchone()
        if existing:
            raise HTTPException(status_code=400, detail="این شماره قبلاً ثبت شده")
        cursor = db.execute(
            "INSERT INTO users (phone, name, password_hash, role) VALUES (?, ?, ?, ?)",
            (req.phone, req.name, hash_password(default_password), req.role)
        )
        user_id = cursor.lastrowid
    return {"id": user_id, "phone": req.phone, "name": req.name, "role": req.role}

@app.delete("/api/users/{user_id}")
def deactivate_user(user_id: int, current=Depends(require_admin)):
    with get_db() as db:
        db.execute("UPDATE users SET is_active=0 WHERE id=?", (user_id,))
    return {"message": "کاربر غیرفعال شد"}


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# EXERCISES
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@app.get("/api/exercises")
def list_exercises(current=Depends(get_current_user)):
    with get_db() as db:
        rows = db.execute(
            "SELECT * FROM exercises WHERE is_active=1 ORDER BY muscle_group, name"
        ).fetchall()
    return [dict(r) for r in rows]

@app.post("/api/exercises")
def create_exercise(req: ExerciseCreate, current=Depends(require_trainer)):
    with get_db() as db:
        cursor = db.execute(
            "INSERT INTO exercises (name, name_en, muscle_group, emoji) VALUES (?, ?, ?, ?)",
            (req.name, req.name_en, req.muscle_group, req.emoji)
        )
    return {"id": cursor.lastrowid, **req.model_dump()}


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# PACKAGES
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@app.get("/api/packages")
def list_packages(trainee_id: int = None, current=Depends(get_current_user)):
    with get_db() as db:
        if current["role"] == "trainee":
            trainee_id = current["user_id"]
        if trainee_id:
            rows = db.execute(
                "SELECT * FROM packages WHERE trainee_id=? AND is_active=1 ORDER BY created_at DESC",
                (trainee_id,)
            ).fetchall()
        else:
            rows = db.execute(
                "SELECT * FROM packages WHERE is_active=1 ORDER BY created_at DESC"
            ).fetchall()
    return [dict(r) for r in rows]

@app.post("/api/packages")
def create_package(req: PackageCreate, current=Depends(require_trainer)):
    with get_db() as db:
        cursor = db.execute(
            """INSERT INTO packages (trainee_id, trainer_id, total_sessions, package_type, start_date)
               VALUES (?, ?, ?, ?, ?)""",
            (req.trainee_id, current["user_id"], req.total_sessions, req.package_type, req.start_date)
        )
    return {"id": cursor.lastrowid, **req.model_dump()}


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# PROGRAMS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@app.get("/api/programs")
def list_programs(trainee_id: int = None, current=Depends(get_current_user)):
    with get_db() as db:
        if current["role"] == "trainee":
            trainee_id = current["user_id"]
        if trainee_id:
            programs = db.execute(
                "SELECT * FROM programs WHERE trainee_id=? AND is_active=1 ORDER BY created_at DESC",
                (trainee_id,)
            ).fetchall()
        else:
            programs = db.execute(
                "SELECT * FROM programs WHERE is_active=1 ORDER BY created_at DESC"
            ).fetchall()

        result = []
        for p in programs:
            prog = dict(p)
            exercises = db.execute(
                """SELECT pe.*, e.name, e.name_en, e.muscle_group, e.emoji
                   FROM program_exercises pe
                   JOIN exercises e ON e.id = pe.exercise_id
                   WHERE pe.program_id=?
                   ORDER BY pe.sort_order""",
                (p["id"],)
            ).fetchall()
            prog["exercises"] = [dict(ex) for ex in exercises]
            result.append(prog)
    return result

@app.post("/api/programs")
def create_program(req: ProgramCreate, current=Depends(require_trainer)):
    with get_db() as db:
        cursor = db.execute(
            """INSERT INTO programs (trainee_id, trainer_id, name, session_number, package_id, notes)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (req.trainee_id, current["user_id"], req.name, req.session_number, req.package_id, req.notes)
        )
        program_id = cursor.lastrowid

        for i, ex in enumerate(req.exercises):
            db.execute(
                """INSERT INTO program_exercises
                   (program_id, exercise_id, sets, reps, rest_seconds, weight, sort_order, notes)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                (program_id, ex.exercise_id, ex.sets, ex.reps, ex.rest_seconds, ex.weight, i, ex.notes)
            )

        # Update package used sessions
        if req.package_id:
            db.execute(
                "UPDATE packages SET used_sessions = used_sessions + 1 WHERE id=?",
                (req.package_id,)
            )

    return {"id": program_id, "message": "برنامه ثبت شد"}

@app.delete("/api/programs/{program_id}")
def delete_program(program_id: int, current=Depends(require_trainer)):
    with get_db() as db:
        db.execute("UPDATE programs SET is_active=0 WHERE id=?", (program_id,))
    return {"message": "برنامه حذف شد"}


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# WORKOUT LOGS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@app.post("/api/logs")
def log_workout(entries: list[WorkoutLogEntry], current=Depends(get_current_user)):
    with get_db() as db:
        for entry in entries:
            db.execute(
                """INSERT INTO workout_logs
                   (trainee_id, program_id, exercise_id, set_number, weight, reps, completed)
                   VALUES (?, ?, ?, ?, ?, ?, ?)""",
                (current["user_id"], entry.program_id, entry.exercise_id,
                 entry.set_number, entry.weight, entry.reps, int(entry.completed))
            )
    return {"message": f"{len(entries)} لاگ ثبت شد"}

@app.get("/api/logs")
def get_logs(program_id: int = None, current=Depends(get_current_user)):
    with get_db() as db:
        trainee_id = current["user_id"] if current["role"] == "trainee" else None
        if program_id and trainee_id:
            rows = db.execute(
                """SELECT wl.*, e.name as exercise_name
                   FROM workout_logs wl
                   JOIN exercises e ON e.id = wl.exercise_id
                   WHERE wl.trainee_id=? AND wl.program_id=?
                   ORDER BY wl.logged_at DESC""",
                (trainee_id, program_id)
            ).fetchall()
        elif trainee_id:
            rows = db.execute(
                """SELECT wl.*, e.name as exercise_name
                   FROM workout_logs wl
                   JOIN exercises e ON e.id = wl.exercise_id
                   WHERE wl.trainee_id=?
                   ORDER BY wl.logged_at DESC LIMIT 200""",
                (trainee_id,)
            ).fetchall()
        else:
            rows = db.execute(
                """SELECT wl.*, e.name as exercise_name, u.name as trainee_name
                   FROM workout_logs wl
                   JOIN exercises e ON e.id = wl.exercise_id
                   JOIN users u ON u.id = wl.trainee_id
                   ORDER BY wl.logged_at DESC LIMIT 200"""
            ).fetchall()
    return [dict(r) for r in rows]

@app.get("/api/logs/progress/{exercise_id}")
def get_exercise_progress(exercise_id: int, current=Depends(get_current_user)):
    trainee_id = current["user_id"]
    with get_db() as db:
        rows = db.execute(
            """SELECT MAX(weight) as max_weight, DATE(logged_at) as date
               FROM workout_logs
               WHERE trainee_id=? AND exercise_id=? AND completed=1
               GROUP BY DATE(logged_at)
               ORDER BY date DESC LIMIT 30""",
            (trainee_id, exercise_id)
        ).fetchall()
    return [dict(r) for r in rows]


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# DASHBOARD STATS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@app.get("/api/stats/trainer")
def trainer_stats(current=Depends(require_trainer)):
    with get_db() as db:
        total_trainees = db.execute(
            "SELECT COUNT(*) FROM users WHERE role='trainee' AND is_active=1"
        ).fetchone()[0]
        total_programs = db.execute(
            "SELECT COUNT(*) FROM programs WHERE trainer_id=? AND is_active=1",
            (current["user_id"],)
        ).fetchone()[0]
        active_packages = db.execute(
            """SELECT COUNT(*) FROM packages
               WHERE trainer_id=? AND is_active=1 AND used_sessions < total_sessions""",
            (current["user_id"],)
        ).fetchone()[0]
    return {
        "total_trainees": total_trainees,
        "total_programs": total_programs,
        "active_packages": active_packages,
    }

@app.get("/api/stats/trainee")
def trainee_stats(current=Depends(get_current_user)):
    uid = current["user_id"]
    with get_db() as db:
        total_workouts = db.execute(
            "SELECT COUNT(DISTINCT DATE(logged_at)) FROM workout_logs WHERE trainee_id=?",
            (uid,)
        ).fetchone()[0]
        total_sets = db.execute(
            "SELECT COUNT(*) FROM workout_logs WHERE trainee_id=? AND completed=1",
            (uid,)
        ).fetchone()[0]
        active_programs = db.execute(
            "SELECT COUNT(*) FROM programs WHERE trainee_id=? AND is_active=1",
            (uid,)
        ).fetchone()[0]
    return {
        "total_workouts": total_workouts,
        "total_sets": total_sets,
        "active_programs": active_programs,
    }


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# HEALTH CHECK
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@app.get("/api/health")
def health():
    return {"status": "ok", "version": "1.0.0"}
