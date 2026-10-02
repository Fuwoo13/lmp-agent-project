import os
from dotenv import load_dotenv
from crewai import Agent, Task, Crew, Process, LLM
from crewai_tools import FileReadTool

load_dotenv()

gemini_llm = LLM(
    model="gemini/gemini-3.5-flash",
    api_key=os.environ.get("GEMINI_API_KEY")
)

manual_tool = FileReadTool(file_path='equipment_manual.txt')

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
    goal='설비 매뉴얼 문서를 읽고, 고장 원인을 진단하여 조치 가이드를 제공합니다.',
    backstory='당신은 20년 경력의 공장 설비 마스터입니다. 느낌이나 직감이 아니라, 반드시 제공된 [설비 매뉴얼] 문서를 읽어보고 팩트 기반으로만 해결책을 제시합니다. 매뉴얼에 없으면 임의 조치를 금지합니다.',
    verbose=True,
    allow_delegation=False,
    llm=gemini_llm,
    tools=[manual_tool], 
    max_iter=3
)

process_agent = Agent(
    role='업무 보고서 자동화 전문가 (P.AX)',
    goal='앞선 상황을 종합하여 정형화된 일일 작업 보고서를 작성합니다.',
    backstory='당신은 완벽한 문서 작성 능력을 갖춘 행정 전문가입니다. 팩트에 기반하여 문서를 작성합니다.',
    verbose=True,
    allow_delegation=False,
    llm=gemini_llm,
    max_iter=2
)

# 💡 수정 1: 날씨 환각 차단 프롬프트
task1 = Task(
    description='오늘 창원의 실제 실시간 날씨 데이터는 다음과 같습니다: "{current_weather}". 이 날씨 데이터를 절대적으로 신뢰하여 현장 안전 수칙 3가지를 브리핑하세요. 비가 오지 않는데 비가 온다고 하거나 기온을 임의로 변경하는 등 가상의 날씨를 지어내는 것을 엄격히 금지합니다.',
    expected_output='실제 날씨 정보가 반영된 맞춤형 안전 수칙 3가지',
    agent=life_agent
)

task2 = Task(
    description='작업 중 "{sensor_data}" 상태가 감지되었습니다. 반드시 파일 읽기 도구(FileReadTool)를 사용하여 equipment_manual.txt의 내용을 읽어보고 조치 가이드를 제시하세요.',
    expected_output='매뉴얼의 수치가 포함된 조치 매뉴얼',
    agent=mfg_agent
)

task3 = Task(
    description='task1과 task2의 결과를 종합하여 일일 작업 보고서를 작성하세요.',
    expected_output='작업일시, 작업장소, 특이사항, 조치결과가 포함된 마크다운 일일 작업 보고서',
    agent=process_agent
)

crew = Crew(
    agents=[life_agent, mfg_agent, process_agent],
    tasks=[task1, task2, task3],
    process=Process.sequential,
    max_rpm=3
)

# 💡 수정된 run_lmp_crew 함수 (줄바꿈 및 Bullet point 엄격 통제)
def run_lmp_crew(sensor_input, current_time, current_location, current_weather):
    task3.description = f"""
    task1과 task2의 결과를 종합하여 일일 작업 보고서를 작성하세요.
    보고서 최상단에는 반드시 아래의 3가지 기본 정보를 Bullet point(-) 기호를 사용하여 각각 '독립된 줄(새 줄)'에 작성하세요. 절대로 한 줄에 연달아 쓰지 마세요.
    
    - **작업일시**: {current_time}
    - **작업장소**: {current_location}
    - **기상상황**: {current_weather}
    
    위 기본 정보 아래에 [특이사항], [조치결과] 양식에 맞춰 마크다운 형식으로 깔끔하게 작성하세요. 
    절대 비, 눈, 강풍 등을 임의로 지어내지 말고, 전달받은 기상상황 팩트만 기록하세요.
    """
    
    result = crew.kickoff(inputs={
        'sensor_data': sensor_input,
        'current_time': current_time,
        'current_location': current_location,
        'current_weather': current_weather
    })
    return result

if __name__ == "__main__":
    print("🚀 로컬 테스트 가동...")
    print(run_lmp_crew("CM-100 모터 과열", "2026-10-01", "창원", "현재 계절은 가을이며, 기온은 20℃ 입니다."))