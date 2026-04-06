from pydantic import BaseModel
from typing import Optional

# ── Auth ──
class LoginRequest(BaseModel):
    phone: str
    password: str

class LoginResponse(BaseModel):
    token: str
    user: dict

class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str

# ── Users ──
class UserCreate(BaseModel):
    phone: str
    name: str
    role: str = "trainee"

# ── Exercises ──
class ExerciseCreate(BaseModel):
    name: str
    name_en: Optional[str] = None
    muscle_group: Optional[str] = None
    emoji: str = "🏋️"

# ── Programs ──
class ProgramExerciseInput(BaseModel):
    exercise_id: int
    sets: int = 3
    reps: int = 10
    rest_seconds: int = 60
    weight: float = 0
    notes: Optional[str] = None

class ProgramCreate(BaseModel):
    trainee_id: int
    name: str
    session_number: Optional[int] = None
    package_id: Optional[int] = None
    notes: Optional[str] = None
    exercises: list[ProgramExerciseInput]

# ── Packages ──
class PackageCreate(BaseModel):
    trainee_id: int
    total_sessions: int
    package_type: str = "every_other_day"
    start_date: Optional[str] = None

# ── Workout Logs ──
class WorkoutLogEntry(BaseModel):
    program_id: int
    exercise_id: int
    set_number: int
    weight: float
    reps: int
    completed: bool = True
