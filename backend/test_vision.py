import os
from groq import Groq
from dotenv import load_dotenv

load_dotenv()
client = Groq(api_key=os.getenv('GROQ_API_KEY'))
models = [m.id for m in client.models.list().data]

image_msg = [{'type': 'image_url', 'image_url': {'url': 'data:image/jpeg;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='}}, {'type': 'text', 'text': 'hi'}]

for model in models:
    try:
        client.chat.completions.create(model=model, messages=[{'role': 'user', 'content': image_msg}], max_tokens=10)
        print(f"SUCCESS: {model}")
    except Exception as e:
        pass
