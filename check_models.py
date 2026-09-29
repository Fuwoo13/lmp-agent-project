import os
import requests
from dotenv import load_dotenv

load_dotenv()
api_key = os.environ.get("GEMINI_API_KEY")

url = f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}"
response = requests.get(url)

if response.status_code == 200:
    print("🔑 현재 API 키로 사용 가능한 Gemini 모델 목록:")
    for model in response.json().get('models', []):
        name = model['name']
        if "gemini" in name:
            print("-", name)
else:
    print("❌ 에러 발생:", response.status_code, response.text)