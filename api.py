from fastapi import FastAPI, UploadFile, File
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from main import run_lmp_crew
import sqlite3
from datetime import datetime
import google.generativeai as genai
import os

genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def init_db():
    conn = sqlite3.connect('lmp_database.db')
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS reports 
                 (id INTEGER PRIMARY KEY AUTOINCREMENT, 
                  sensor_data TEXT, 
                  date TEXT, 
                  location TEXT,
                  report_text TEXT)''')
    conn.commit()
    conn.close()

init_db()

@app.post("/api/generate-report")
async def generate_report(data: dict):
    sensor_input = data.get("sensor_data", "CM-100 모터 과열")
    current_time = data.get("timestamp", "시간 정보 없음")
    current_location = data.get("location", "창원국가산업단지")
    # 💡 프론트엔드가 보내준 날씨 데이터를 받습니다. (없으면 기본값)
    current_weather = data.get("weather", "맑음 (기온 정보 없음)") 
    
    print(f"요청 수신 - 날씨: {current_weather} / 고장: {sensor_input}")
    
    try:
        # 💡 run_lmp_crew에 current_weather 변수를 4번째로 넘겨줍니다.
        result_text = str(run_lmp_crew(sensor_input, current_time, current_location, current_weather))
        
        conn = sqlite3.connect('lmp_database.db')
        c = conn.cursor()
        c.execute("INSERT INTO reports (sensor_data, date, location, report_text) VALUES (?, ?, ?, ?)",
                  (sensor_input, current_time, current_location, result_text))
        conn.commit()
        conn.close()
        
        return {"status": "success", "report": result_text}
    except Exception as e:
        print(f"크루 실행 중 에러 발생: {e}")
        return {"status": "error", "message": str(e)}

@app.get("/api/reports-history")
def get_reports_history():
    conn = sqlite3.connect('lmp_database.db')
    c = conn.cursor()
    c.execute("SELECT id, sensor_data, date, location FROM reports ORDER BY id DESC LIMIT 10")
    rows = c.fetchall()
    conn.close()
    
    history = [{"id": r[0], "sensor_data": r[1], "date": r[2], "location": r[3]} for r in rows]
    return {"status": "success", "history": history}

@app.post("/api/verify-image")
async def verify_image(file: UploadFile = File(...)):
    try:
        image_bytes = await file.read()
        model = genai.GenerativeModel('gemini-1.5-flash')
        
        prompt = """
        당신은 깐깐한 공장 현장 안전 관리자입니다. 
        첨부된 사진은 현장 작업자가 설비 고장을 조치한 후 '승인'을 받기 위해 올린 증빙 사진입니다.
        사진을 분석하여 조치가 정상적으로 이루어졌는지 판독하세요.
        판독 결과는 반드시 첫 줄에 '✅ [승인 통과]' 또는 '❌ [재조치 필요]'로 시작해야 하며, 
        그 이유를 2~3문장으로 전문가처럼 간략히 설명해 주세요.
        """
        
        image_parts = [{"mime_type": file.content_type, "data": image_bytes}]
        response = model.generate_content([prompt, image_parts[0]])
        
        return {"status": "success", "message": response.text}
        
    except Exception as e:
        print(f"이미지 판독 중 에러 발생: {e}")
        return {"status": "error", "message": "사진 판독 중 오류가 발생했습니다."}