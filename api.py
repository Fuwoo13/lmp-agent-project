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

# ==========================================
# 💡 신규 기능: 멀티모달 Vision AI 사진 판독 API
# ==========================================
@app.post("/api/verify-image")
async def verify_image(file: UploadFile = File(...)):
    try:
        # 1. 프론트엔드에서 보낸 사진 파일 읽기
        image_bytes = await file.read()
        
        # 2. 사진 판독을 위한 비전 지원 AI 모델 호출 (Gemini 1.5 Flash)
        model = genai.GenerativeModel('gemini-1.5-flash')
        
        # 3. AI에게 내릴 날카로운 판독 지시사항(프롬프트)
        prompt = """
        당신은 깐깐한 공장 현장 안전 관리자입니다. 
        첨부된 사진은 현장 작업자가 설비(모터, 밸브 등) 고장을 조치한 후 '승인'을 받기 위해 올린 증빙 사진입니다.
        사진을 분석하여 수리, 청소, 또는 교체 조치가 정상적으로 이루어졌는지 판독하세요.
        판독 결과는 반드시 첫 줄에 '✅ [승인 통과]' 또는 '❌ [재조치 필요]'로 시작해야 하며, 
        그 이유를 2~3문장으로 전문가처럼 간략히 설명해 주세요.
        """
        
        # 4. 이미지 데이터 형식 변환 후 AI에게 전송
        image_parts = [{"mime_type": file.content_type, "data": image_bytes}]
        response = model.generate_content([prompt, image_parts[0]])
        
        return {"status": "success", "message": response.text}
        
    except Exception as e:
        print(f"이미지 판독 중 에러 발생: {e}")
        return {"status": "error", "message": "사진 판독 중 오류가 발생했습니다."}