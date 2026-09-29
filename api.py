import os
import requests
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from crewai import Agent, Task, Crew, Process, LLM
from crewai.tools import tool # 커스텀 도구 생성용
from crewai_tools import FileReadTool

# 환경 변수 로드
load_dotenv()

# FastAPI 앱 생성
app = FastAPI(title="L.M.P Multi-Agent API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================
# ★ 신규 추가: 실시간 날씨 검색 커스텀 도구
# ==========================================
@tool("Real-time Weather Tool")
def weather_tool(location: str) -> str:
    """이 도구는 특정 지역의 현재 실시간 날씨 정보를 가져옵니다. location에는 도시 이름(예: Changwon)을 영어로 입력하세요."""
    try:
        # 가입 없이 쓸 수 있는 무료 오픈 날씨 API 사용
        response = requests.get(f"https://wttr.in/{location}?format=%l:+%c+%t,+%w,+%h")
        return response.text
    except Exception as e:
        return f"날씨 정보를 가져오는 데 실패했습니다: {e}"

async def run_lmp_pipeline():
    gemini_llm = LLM(
        model="gemini/gemini-3.5-flash",
        api_key=os.environ.get("GEMINI_API_KEY")
    )
    
    manual_tool = FileReadTool(file_path='equipment_manual.txt')

    # ==========================================
    # 에이전트(Agent) 정의
    # ==========================================
    life_agent = Agent(
        role='현장 안전 및 일상 관리 비서 (L.AX)',
        goal='근로자의 출근을 확인하고, 실시간 날씨를 조회하여 현장 상황에 맞는 안전 수칙을 브리핑합니다.',
        backstory='당신은 산업 현장 근로자의 건강과 안전을 최우선으로 생각하는 따뜻하고 꼼꼼한 AI 비서입니다.',
        verbose=True,
        allow_delegation=False,
        llm=gemini_llm,
        tools=[weather_tool], # ★ L.AX에게 날씨 검색 도구 장착
        max_iter=3
    )

    mfg_agent = Agent(
        role='제조 설비 트러블슈터 (M.AX)',
        goal='설비 매뉴얼 문서를 읽고(Read), 고장 원인을 정확히 진단하여 조치 가이드를 제공합니다.',
        backstory='당신은 20년 경력의 공장 설비 마스터입니다. 느낌이나 직감이 아니라, 반드시 제공된 [설비 매뉴얼] 문서를 읽어보고 팩트 기반으로만 해결책을 제시합니다.',
        verbose=True,
        allow_delegation=False,
        llm=gemini_llm,
        tools=[manual_tool],
        max_iter=3
    )

    process_agent = Agent(
        role='업무 보고서 자동화 전문가 (P.AX)',
        goal='앞선 상황을 종합하여 정형화된 일일 작업 보고서를 작성합니다.',
        backstory='당신은 완벽한 문서 작성 능력을 갖춘 행정 전문가입니다. 복잡한 현장 상황을 깔끔하고 명확한 텍스트로 요약해냅니다.',
        verbose=True,
        allow_delegation=False,
        llm=gemini_llm,
        max_iter=2
    )

    # ==========================================
    # 작업(Task) 정의
    # ==========================================
    task1 = Task(
        description='오전 9시 근로자의 출근을 가정합니다. 반드시 "Real-time Weather Tool"을 사용하여 "Changwon"의 실시간 날씨를 조회한 후, 긍정적인 아침 인사와 함께 실제 날씨 데이터에 기반한 현장 안전 수칙 3가지를 브리핑하세요.',
        expected_output='아침 인사, 조회된 실제 날씨 정보, 날씨 맞춤형 현장 안전 수칙 3가지가 포함된 메시지',
        agent=life_agent
    )

    task2 = Task(
        description='작업 중 "CM-100 모터 온도 85도 이상 경고 알림"이 발생했습니다. 반드시 파일 읽기 도구(FileReadTool)를 사용하여 equipment_manual.txt의 내용을 읽어보고, 매뉴얼에 명시된 원인 2가지와 에어건 압력, V벨트 장력 수치 등이 포함된 조치 가이드를 제시하세요.',
        expected_output='매뉴얼의 정확한 수치(kgf, bar 등)가 포함된 모터 과열 원인 및 조치 매뉴얼',
        agent=mfg_agent
    )

    task3 = Task(
        description='task1(실제 날씨 포함)과 task2의 결과를 종합하여, [작업일시], [특이사항], [조치결과] 양식에 맞춘 오늘의 일일 작업 보고서를 마크다운 형식으로 깔끔하게 작성하세요.',
        expected_output='마크다운 형식으로 작성된 최종 일일 작업 보고서',
        agent=process_agent
    )

    crew = Crew(
        agents=[life_agent, mfg_agent, process_agent],
        tasks=[task1, task2, task3],
        process=Process.sequential
    )

    result = await crew.kickoff_async()
    return result.raw

@app.post("/api/generate-report")
async def generate_report_api():
    try:
        report_content = await run_lmp_pipeline()
        return {"status": "success", "data": report_content}
    except Exception as e:
        return {"status": "error", "message": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)