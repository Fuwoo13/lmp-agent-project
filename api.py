from fastapi import FastAPI, UploadFile, File
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
# 💡 핵심: main.py에서 완벽하게 작동이 증명된 gemini_llm을 그대로 가져옵니다.
from main import run_lmp_crew, gemini_llm 
from crewai import Agent, Task, Crew
import sqlite3
import base64
import os
from dotenv import load_dotenv
import litellm

load_dotenv()

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

class TranslateRequest(BaseModel):
    text: str
    lang: str

@app.post("/api/generate-report")
def generate_report(data: dict):
    sensor_input = data.get("sensor_data", "CM-100 모터 과열")
    current_time = data.get("timestamp", "시간 정보 없음")
    current_location = data.get("location", "창원국가산업단지")
    current_weather = data.get("weather", "맑음 (기온 정보 없음)") 
    
    print(f"요청 수신 - 날씨: {current_weather} / 고장: {sensor_input}")
    
    try:
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
        mime_type = file.content_type or "image/jpeg"
        b64_img = base64.b64encode(image_bytes).decode('utf-8')
        
        prompt = """
        당신은 깐깐한 공장 현장 안전 관리자입니다. 
        첨부된 사진은 현장 작업자가 설비 고장을 조치한 후 '승인'을 받기 위해 올린 증빙 사진입니다.
        사진을 분석하여 조치가 정상적으로 이루어졌는지 판독하세요.
        판독 결과는 반드시 첫 줄에 '✅ [승인 통과]' 또는 '❌ [재조치 필요]'로 시작해야 하며, 
        그 이유를 2~3문장으로 전문가처럼 간략히 설명해 주세요.
        """
        
        response = litellm.completion(
            model="gemini/gemini-1.5-flash",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {"type": "image_url", "image_url": {"url": f"data:{mime_type};base64,{b64_img}"}}
                    ]
                }
            ],
            api_key=os.environ.get("GEMINI_API_KEY")
        )
        
        return {"status": "success", "message": response.choices[0].message.content}
        
    except Exception as e:
        print(f"이미지 판독 중 에러 발생: {e}")
        return {"status": "error", "message": "사진 판독 중 오류가 발생했습니다."}

# 💡 번역 라우터를 우회 통신망인 CrewAI '번역 에이전트'로 완전 교체!
@app.post("/api/translate")
def translate_report(req: TranslateRequest):
    try:
        # 보고서 작성에 성공했던 LLM을 장착한 전문 번역 에이전트를 투입합니다.
        translator_agent = Agent(
            role='전문 산업 번역가',
            goal=f'제공된 문서를 {req.lang}로 완벽하게 번역합니다.',
            backstory='당신은 산업 현장 용어에 능통한 원어민 수준의 기술 번역가입니다.',
            llm=gemini_llm, # 성공 보장 치트키
            allow_delegation=False,
            verbose=True
        )
        
        translation_task = Task(
            description=f"다음 마크다운 형식의 산업 현장 안전 보고서를 '{req.lang}' 언어로 완벽하게 번역해줘. 마크다운 문법과 양식은 그대로 유지해야 해:\n\n{req.text}",
            expected_output=f"{req.lang}로 번역된 마크다운 텍스트",
            agent=translator_agent
        )
        
        crew = Crew(agents=[translator_agent], tasks=[translation_task])
        result = str(crew.kickoff())
        
        return {"status": "success", "translated_text": result}
        
    except Exception as e:
        print(f"번역 중 에러 발생: {e}")
        return {"status": "error", "message": str(e)}