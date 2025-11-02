# emotion-analyzer
Emotion analysis from text.\
**dataset used for training the model**: https://huggingface.co/bulpara/emotion-analysis-8-categories

## To run the Frontend:
1. npm install
2. npm run dev

## To run the Backend:

First, create a .env file in the backend and add\
OPENROUTER_API_KEY="your_api_key_for_LLM"

Then, make a backend directory saved_models. Paste your joblib model there
1. python -m venv venv
2. ./venv/Scripts/activate.ps1
1. pip install -r "requirements.txt"
2. python app.py
