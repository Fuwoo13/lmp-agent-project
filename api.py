from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from main import run_lmp_crew
import sqlite3
from datetime import datetime

app = FastAPI()

# CORS 설정 (리액트와 통신 허용)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================
# 💡 DB 초기화 (SQLite)
# ==========================================
def init_db():
    conn = sqlite3.connect("reports.db")
    c = conn.cursor()
    # 보고서를 저장할 테이블 생성
    c.execute('''CREATE TABLE IF NOT EXISTS reports 
                 (id INTEGER PRIMARY KEY AUTOINCREMENT, 
                  created_at TEXT, 
                  sensor_data TEXT, 
                  report_content TEXT)''')
    conn.commit()
    conn.close()

init_db() # 서버가 켜질 때 DB 세팅 실행

# ==========================================
# 🚀 기존 기능: 보고서 생성 및 DB 저장
# ==========================================
@app.post("/api/generate-report")
def generate_report(data: dict):
    # 프론트엔드에서 보낸 센서 종류, 시간, 장소 데이터를 꺼냅니다.
    sensor_input = data.get("sensor_data", "CM-100 모터 과열")
    current_time = data.get("timestamp", "시간 정보 없음")
    current_location = data.get("location", "창원국가산업단지")
    
    print(f"요청 수신: {current_location} / {current_time} / {sensor_input}")
    
    # 3개의 데이터를 모두 AI에게 전달합니다.
    result_text = str(run_lmp_crew(sensor_input, current_time, current_location))
    
    # DB 저장 로직 (이전과 동일)
    import sqlite3
    conn = sqlite3.connect("reports.db")
    c = conn.cursor()
    c.execute("INSERT INTO reports (created_at, sensor_data, report_content) VALUES (?, ?, ?)", 
              (current_time, sensor_input, result_text))
    conn.commit()
    conn.close()
    
    return {"report": result_text}

# ==========================================
# 💡 신규 기능: 과거 보고서 목록 불러오기 API
# ==========================================
@app.get("/api/reports-history")
def get_reports_history():
    conn = sqlite3.connect("reports.db")
    c = conn.cursor()
    # 최근 저장된 보고서 5개를 역순으로 불러옵니다
    c.execute("SELECT id, created_at, sensor_data FROM reports ORDER BY id DESC LIMIT 5")
    rows = c.fetchall()
    conn.close()
    
    # 프론트엔드가 쓰기 편하게 리스트(JSON) 형태로 변환
    history_list = [{"id": row[0], "date": row[1], "sensor_data": row[2]} for row in rows]
    return {"history": history_list}