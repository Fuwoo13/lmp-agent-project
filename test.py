import os
import requests
from dotenv import load_dotenv

# .env 파일에서 API 키 불러오기
load_dotenv()
api_key = os.environ.get("GEMINI_API_KEY")

print("🔍 구글 Gemini 서버 다이렉트 연결 테스트를 시작합니다...\n")

# 구글 Gemini 1.5 Flash 공식 엔드포인트
url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"

payload = {
    "contents": [{"parts": [{"text": "안녕? 넌 누구니? 한 줄로 대답해줘."}]}]
}
headers = {"Content-Type": "application/json"}

# 다이렉트 요청 보내기
response = requests.post(url, json=payload, headers=headers)

if response.status_code == 200:
    print("성공. API 키와 모델이 정상적으로 작동합니다.")
    print("Gemini 응답:", response.json()['candidates'][0]['content']['parts'][0]['text'])
else:
    print("에러 발생 (상태 코드):", response.status_code)
    print("상세 내용:", response.text)