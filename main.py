import os
from dotenv import load_dotenv
from crewai import Agent, Task, Crew, Process, LLM
from crewai_tools import FileReadTool

# 환경 변수 로드
load_dotenv()

# ==========================================
# 1. 에이전트 대화용 LLM (순수 Gemini 네이티브 연결)
# ==========================================
gemini_llm = LLM(
    model="gemini/gemini-3.5-flash",
    api_key=os.environ.get("GEMINI_API_KEY")
)

# ==========================================
# 2. RAG 도구 (매뉴얼 직접 읽기)
# ==========================================
manual_tool = FileReadTool(file_path='equipment_manual.txt')

# ==========================================
# 3. 에이전트(Agent) 정의
# ==========================================

life_agent = Agent(
    role='현장 안전 및 일상 관리 비서 (L.AX)',
    goal='근로자의 출근을 확인하고, 오늘의 날씨와 현장 상황에 맞는 안전 수칙을 브리핑합니다.',
    backstory='당신은 산업 현장 근로자의 건강과 안전을 최우선으로 생각하는 따뜻하고 꼼꼼한 AI 비서입니다.',
    verbose=True,
    allow_delegation=False,
    llm=gemini_llm,
    max_iter=2
)

mfg_agent = Agent(
    role='제조 설비 트러블슈터 (M.AX)',
    goal='설비 매뉴얼 문서를 읽고(Read), 고장 원인을 정확히 진단하여 조치 가이드를 제공합니다.',
    # 💡 아래 backstory 부분에 "매뉴얼에 없으면 멈춰라"는 강력한 지시를 추가합니다.
    backstory='당신은 20년 경력의 공장 설비 마스터입니다. 느낌이나 직감이 아니라, 반드시 제공된 [설비 매뉴얼] 문서를 읽어보고 팩트 기반으로만 해결책을 제시합니다. 만약 발생한 센서 이상 증상이 매뉴얼에 명시되어 있지 않다면, 절대 임의로 원인을 추측하지 말고 "해당 증상은 매뉴얼에 없음. 임의 조치를 엄격히 금지하며 즉시 제조사에 정밀 점검을 요청할 것"이라고 명시해야 합니다.',
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
# 4. 작업(Task) 정의
# ==========================================

task1 = Task(
    description='오늘 창원 지역의 날씨를 가상으로 설정하고, 근로자의 오전 9시 출근을 가정하여 긍정적인 아침 인사와 함께 오늘 주의해야 할 현장 안전 수칙 3가지를 브리핑하세요.',
    expected_output='아침 인사, 날씨 정보, 맞춤형 안전 수칙 3가지가 포함된 짧은 메시지',
    agent=life_agent
)

# 💡 핵심 변경점: 고정된 텍스트 대신 {sensor_data}라는 구멍(변수)을 뚫어두었습니다.
task2 = Task(
    description='작업 중 "{sensor_data}" 상태가 감지되었습니다. 반드시 파일 읽기 도구(FileReadTool)를 사용하여 equipment_manual.txt의 내용을 읽어보고, 매뉴얼에 명시된 원인 2가지와 에어건 압력, V벨트 장력 수치 등이 포함된 조치 가이드를 제시하세요.',
    expected_output='매뉴얼의 정확한 수치(kgf, bar 등)가 포함된 모터 과열 원인 및 조치 매뉴얼',
    agent=mfg_agent
)

task3 = Task(
    description='task1과 task2의 결과를 종합하여, [작업일시], [특이사항], [조치결과] 양식에 맞춘 오늘의 일일 작업 보고서를 마크다운 형식으로 깔끔하게 작성하세요.',
    expected_output='마크다운 형식으로 작성된 최종 일일 작업 보고서',
    agent=process_agent
)

# ==========================================
# 5. 크루(Crew) 구성 및 실행
# ==========================================

crew = Crew(
    agents=[life_agent, mfg_agent, process_agent],
    tasks=[task1, task2, task3],
    process=Process.sequential,
    max_rpm=3 # API 호출 속도 제한 유지
)

# [수정 후 main.py의 마지막 부분]
def run_lmp_crew(sensor_input, current_time, current_location):
    # P.AX 요원의 Task에 시간과 장소를 강제로 박아넣습니다.
    p_ax_task.description = f"""
    task1과 task2의 결과를 종합하여 일일 작업 보고서를 작성하세요.
    - [작업일시]: {current_time}
    - [작업장소]: {current_location}
    위 시간과 장소를 반드시 보고서 최상단에 명시하고, [특이사항], [조치결과] 양식에 맞춰 마크다운으로 작성하세요.
    """
    
    result = crew.kickoff(inputs={
        'sensor_data': sensor_input,
        'current_time': current_time,
        'current_location': current_location
    })
    return result

if __name__ == "__main__":
    print("🚀 [테스트] L.M.P 멀티 에이전트 파이프라인 가동을 시작합니다...\n")
    # 터미널에서 단독으로 실행할 때 쓰이는 기본 가짜 데이터입니다.
    test_sensor_data = "CM-100 모터 온도 85도 이상 경고 (위험 초과)"
    
    final_result = run_lmp_crew(test_sensor_data)
    
    print("\n============================================")
    print("🎯 최종 결과물 (매뉴얼 문서 기반 작업 보고서)")
    print("============================================")
    print(final_result)