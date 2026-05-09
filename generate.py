import os
import json
import google.generativeai as genai
import re

# Configure Gemini API
API_KEY = os.environ.get("GEMINI_API_KEY")
if not API_KEY:
    print("Error: GEMINI_API_KEY environment variable not set.")
    exit(1)

genai.configure(api_key=API_KEY)

# Initialize the model. We use gemini-1.5-pro for high complexity reasoning.
model = genai.GenerativeModel('gemini-1.5-pro')

QUESTIONS_FILE = 'questions.json'

def load_existing_questions():
    if os.path.exists(QUESTIONS_FILE):
        with open(QUESTIONS_FILE, 'r', encoding='utf-8') as f:
            try:
                return json.load(f)
            except json.JSONDecodeError:
                return []
    return []

def save_questions(questions):
    with open(QUESTIONS_FILE, 'w', encoding='utf-8') as f:
        json.dump(questions, f, indent=2, ensure_ascii=False)

def generate_new_questions(existing_questions):
    # Extract existing question texts to try and avoid duplicates
    existing_texts = [q['question'] for q in existing_questions[-50:]] # Only pass last 50 to save context window
    
    prompt = f"""
You are an expert Endodontist examiner tasked with writing questions for the Middle East Prometric Specialist Exams. 
Your specific target exams are the Dubai Health Authority (DHA) and Department of Health Abu Dhabi (HAAD/DoH) Endodontics Specialist Exams, followed by the SCFHS (Saudi) and QCHP (Qatar) exams.

Generate exactly 25 highly complex, scenario-based multiple-choice questions.

CRITICAL REQUIREMENTS:
1. DO NOT GENERATE GENERIC QUESTIONS. These must be specialist-level (post-graduate) scenarios.
2. Focus heavily on: CBCT interpretation, complex diagnosis, management of trauma (IADT guidelines), complex endodontic mishaps (separated instruments, perforations), bioceramics, endo-perio lesions, and contemporary irrigation/obturation protocols.
3. Every question must have exactly 4 options.
4. Provide a detailed explanation for why the correct answer is right AND why the other options are wrong.
5. Return the output STRICTLY as a raw JSON array of objects. Do not wrap it in markdown code blocks like ```json. Just output the raw array.

Avoid creating duplicates or questions similar to these recent ones:
{json.dumps(existing_texts, indent=2)}

JSON Format required for each question:
{{
  "question": "The complex scenario text...",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correctAnswer": 0, // Integer index (0-3) of the correct option
  "category": "Category Name (e.g., Trauma, Diagnosis, CBCT & Anatomy)",
  "explanation": "Detailed explanation here..."
}}
"""
    
    print("Calling Gemini API...")
    response = model.generate_content(prompt)
    
    response_text = response.text.strip()
    
    # Strip markdown formatting if the model still outputs it
    if response_text.startswith("```json"):
        response_text = response_text[7:]
    if response_text.startswith("```"):
        response_text = response_text[3:]
    if response_text.endswith("```"):
        response_text = response_text[:-3]
        
    try:
        new_questions = json.loads(response_text.strip())
        if not isinstance(new_questions, list):
            raise ValueError("API did not return a JSON array.")
        return new_questions
    except Exception as e:
        print(f"Failed to parse API response: {e}")
        print("Raw Response:")
        print(response_text)
        return []

def main():
    existing_questions = load_existing_questions()
    print(f"Loaded {len(existing_questions)} existing questions.")
    
    new_questions = generate_new_questions(existing_questions)
    
    if new_questions and len(new_questions) > 0:
        print(f"Successfully generated {len(new_questions)} new questions.")
        
        # Deduplicate exactly (just in case)
        existing_texts = {q['question'].lower() for q in existing_questions}
        unique_new = [q for q in new_questions if q['question'].lower() not in existing_texts]
        
        existing_questions.extend(unique_new)
        save_questions(existing_questions)
        print(f"Saved {len(unique_new)} unique questions to {QUESTIONS_FILE}.")
    else:
        print("No new questions generated.")

if __name__ == "__main__":
    main()
