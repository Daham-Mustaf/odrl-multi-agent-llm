# test_gemini.py
import os
from langchain_google_genai import ChatGoogleGenerativeAI

api_key = "AIzaSyBXtL7-NYfSIkOknd70p-KOzmwwmneRC3E"

llm = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash",
    google_api_key=api_key,
    temperature=0.3
)

response = llm.invoke("What is 2+2?")
print(response.content)



from langchain_openai import ChatOpenAI

llm = ChatOpenAI(
    model="gpt-oss:120b",
    openai_api_base="http://dgx.fit.fraunhofer.de/v1",
    openai_api_key="dummy",
    temperature=0.3,
    timeout=120
)

try:
    response = llm.invoke("What is 2+2? Answer briefly.")
    print("✅ FIT Server Connected!")
    print(f"Response: {response.content}")
except Exception as e:
    print(f"❌ Error: {e}")