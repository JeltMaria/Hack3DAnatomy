# backend/routers/auth.py

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from passlib.context import CryptContext
import asyncpg

router = APIRouter()

DATABASE_URL = "" # Убедитесь, что URL верный

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class UserRegister(BaseModel):
    username: str
    password: str

async def connect_db():
    try:
        conn = await asyncpg.connect(DATABASE_URL)
        print("Database connection successful")
        return conn
    except Exception as e:
        db_error_message = f"Database connection failed: {e}"
        print(db_error_message)
        # Логируем тело ответа перед отправкой HTTPException
        response_payload = {"detail": f"Database error: {str(e)}"}
        print(f"Sending error response: {response_payload}")
        raise HTTPException(status_code=500, detail=response_payload["detail"])

@router.post("/login-or-register")
async def login_or_register(user: UserRegister):
    print(f"Received request: username={user.username}, password (length)={len(user.password)}") # Не логируйте сам пароль
    conn = await connect_db()
    try:
        user_in_db = await conn.fetchrow("SELECT * FROM users WHERE username = $1", user.username)
        print(f"User in DB: {user_in_db}")
        
        if not user_in_db:
            hashed_password = pwd_context.hash(user.password)
            # print(f"Creating new user with hashed password: {hashed_password}") # Хеш тоже чувствительная информация
            print(f"Creating new user: {user.username}")
            await conn.execute(
                """
                INSERT INTO users (username, password, first_name, last_name)
                VALUES ($1, $2, '', '')
                """,
                user.username, hashed_password
            )
            print("User created successfully")
            response_payload = {"message": "User created successfully"}
            print(f"Sending response: {response_payload}") # <--- Логируем ответ
            return response_payload
        else:
            print("User already exists")
            response_payload = {"message": "User already exists, no changes made"}
            print(f"Sending response: {response_payload}") # <--- Логируем ответ
            return response_payload
    except Exception as e:
        server_error_message = f"Error processing request: {e}"
        print(server_error_message)
        # Логируем тело ответа перед отправкой HTTPException
        response_payload = {"detail": f"Server error: {str(e)}"}
        print(f"Sending error response: {response_payload}")
        raise HTTPException(status_code=500, detail=response_payload["detail"])
    finally:
        if conn: # Убедимся, что conn существует перед закрытием
            await conn.close()
            print("Database connection closed")