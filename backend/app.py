import os
import json
import requests
import traceback
import re
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import joblib
import torch
from transformers import BertForSequenceClassification
import nltk
from nltk.tokenize import sent_tokenize

# --- Load Environment Variables ---
load_dotenv()
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")

# --- Load Local Emotion Model ---
# ... (This section is unchanged) ...
MODEL_PATH = os.path.join("saved_models", "final_cpu.joblib")
if not os.path.exists(MODEL_PATH):
    raise FileNotFoundError(f"Model file not found at {MODEL_PATH}")
loaded_data = joblib.load(MODEL_PATH)
model_config = loaded_data['model_config']
model_state_dict = loaded_data['model_state_dict']
tokenizer = loaded_data['tokenizer']
model = BertForSequenceClassification(model_config)
model.load_state_dict(model_state_dict)
device = torch.device("cpu")
model.to(device)
model.eval()

# Download NLTK data
try:
    nltk.data.find('tokenizers/punkt')
except nltk.downloader.DownloadError:
    nltk.download('punkt')

# Initialize Flask app
app = Flask(__name__)
CORS(app)

# --- Prediction & LLM Logic ---
MAX_LEN = 128
emotion_labels = ['joy', 'trust', 'fear', 'surprise', 'sadness', 'disgust', 'anger', 'anticipation']

def predict_sentence_emotions(sentence):
    # ... (This function is unchanged) ...
    encoding = tokenizer.encode_plus(
        sentence, add_special_tokens=True, max_length=MAX_LEN,
        return_token_type_ids=False, padding='max_length', truncation=True,
        return_attention_mask=True, return_tensors='pt',
    )
    input_ids = encoding['input_ids'].to(device)
    attention_mask = encoding['attention_mask'].to(device)
    with torch.no_grad():
        outputs = model(input_ids=input_ids, attention_mask=attention_mask)
    probs = torch.sigmoid(outputs.logits).cpu().numpy()[0]
    return [emotion_labels[i] for i, prob in enumerate(probs) if prob > 0.5]

def get_characters_from_llm(text):
    if not OPENROUTER_API_KEY:
        raise ValueError("OPENROUTER_API_KEY not found in .env file.")
        
    response = requests.post(
        url="https://openrouter.ai/api/v1/chat/completions",
        headers={"Authorization": f"Bearer {OPENROUTER_API_KEY}"},
        data=json.dumps({
            "model": "mistralai/mistral-7b-instruct:free",
            "messages": [
                {"role": "system", "content": "You are a literary analyst. Your task is to identify main characters from a transcript and extract all sentences related to each. Your output must be a valid JSON object only, with no other text, explanations, or markdown formatting like ```json."},
                {"role": "user", "content": f"Analyze the transcript below. Identify main characters and provide a list of sentences for each. The output must be a JSON object where each key is a character's name and the value is a list of sentences mentioning them.\n\nTranscript:\n\"\"\"\n{text}\n\"\"\"\n\nJSON output only:"}
            ]
        })
    )
    
    if response.status_code != 200:
        raise Exception(f"OpenRouter API error: {response.status_code} - {response.text}")

    # --- FIX FOR JSONDecodeError ---
    
    # 1. Correctly access the message content with [0]
    llm_response_content = response.json()['choices'][0]['message']['content']
    
    # 2. (Important for Debugging) Print the raw response to the Flask terminal
    print("--- Raw LLM Response ---")
    print(llm_response_content)
    print("------------------------")

    # 3. Use regex to reliably find the JSON object within the string
    json_match = re.search(r'\{.*\}', llm_response_content, re.DOTALL)
    
    if not json_match:
        # If no JSON is found, raise a clear error
        raise json.JSONDecodeError("LLM did not return a valid JSON object.", llm_response_content, 0)
    
    json_string = json_match.group(0)
    return json.loads(json_string)


# --- API Endpoints ---

@app.route('/analyze', methods=['POST'])
def analyze_text():
    # ... (This function is unchanged and correct) ...
    data = request.get_json()
    text = data.get('text', '')
    try:
        sentences = sent_tokenize(text)
        results = []
        for sentence in sentences:
            if sentence.strip():
                emotions = predict_sentence_emotions(sentence)
                results.append({"sentence": sentence, "emotions": emotions})
        return jsonify(results)
    except Exception as e:
        print(traceback.format_exc())
        return jsonify({"error": "An internal error occurred."}), 500

@app.route('/analyze_characters', methods=['POST'])
def analyze_characters():
    # ... (This function is unchanged and correct) ...
    data = request.get_json()
    text = data.get('text', '')
    if not text.strip():
        return jsonify({})
    
    try:
        character_sentences = get_characters_from_llm(text)
        
        character_journeys = {}
        for character, sentences in character_sentences.items():
            journey = []
            for sentence in sentences:
                if sentence.strip():
                    emotions = predict_sentence_emotions(sentence)
                    journey.append({"sentence": sentence, "emotions": emotions})
            if journey:
                character_journeys[character] = journey
        
        return jsonify(character_journeys)
    except Exception as e:
        print(traceback.format_exc())
        return jsonify({"error": f"An internal error occurred: {str(e)}"}), 500

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5000)