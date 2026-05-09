import os
import json
from google import genai
import re

# Configure Gemini API
API_KEY = os.environ.get("GEMINI_API_KEY")
if not API_KEY:
    print("Error: GEMINI_API_KEY environment variable not set.")
    exit(1)

client = genai.Client(api_key=API_KEY)

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
You are an expert Endodontist examiner writing questions for the Middle East Prometric Specialist Exams.
Target exams: Dubai Health Authority (DHA), Department of Health Abu Dhabi (HAAD/DoH), SCFHS (Saudi), and QCHP (Qatar) Endodontics Specialist Exams.

Generate exactly 25 specialist-level, clinically-anchored single-best-answer (SBA) multiple-choice questions.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DOMAIN DISTRIBUTION (across the 25 questions, sample from all domains proportionally):
HIGH PRIORITY — generate ~2 questions per domain:
  - CBCT Interpretation
  - Complex Diagnosis & AAE Classification
  - Trauma Management (IADT 2020 guidelines)
  - Irrigation & Obturation Protocols
  - Endodontic Mishaps (separated instruments, perforations, ledges)
  - Endo-Perio Lesions
  - Bioceramics & Materials Science

MEDIUM PRIORITY — generate ~1 question per domain:
  - Root Canal Morphology & Complex Anatomy
  - Vital Pulp Therapy
  - Regenerative Endodontics
  - Resorption (internal, external, cervical — Heithersay classification)
  - Nonsurgical Retreatment
  - Cracked Tooth Syndrome
  - Surgical Endodontics
  - Pulp Biology & Pulp Testing

LOWER PRIORITY — generate ~1 question across these domains:
  - Local Anesthesia in Endodontics
  - Pharmacology & Intracanal Medicaments
  - Microbiology & Biofilms
  - Systemic Considerations (MRONJ, anticoagulants, diabetes)
  - Prognosis & Evidence-Based Outcomes
  - Ethics & Jurisprudence

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DIFFICULTY TIER DISTRIBUTION (across the 25 questions):
Assign approximately: 3 × Tier 1, 10 × Tier 2, 9 × Tier 3, 3 × Tier 4

Tier 1 — Recall:
  Stem: 1-2 sentences. Minimal clinical hook. Tests direct knowledge.
  Example: "Which irrigant at 5.25% concentration is most effective against E. faecalis biofilm?"

Tier 2 — Application:
  Stem: 3-5 sentences. Include patient age/sex, clinical findings, and one radiographic finding.
  Requires applying knowledge to a defined scenario.

Tier 3 — Clinical Reasoning:
  Stem: 5-8 sentences. Multiple conflicting or compounding data points (e.g., conflicting vitality tests, systemic overlay, complex anatomy).
  Requires prioritizing among multiple plausible management options.

Tier 4 — Expert Synthesis:
  Stem: 8-12 sentences. Multi-visit case, systemic complexity, or cross-domain reasoning (e.g., endo-perio + CBCT + resorption).
  All four options must be defensible — correct answer requires integration of multiple evidence-based principles.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CLINICAL VIGNETTE RULES (Tier 2-4):
- Use FDI tooth notation (e.g., tooth 26, not "upper left first molar")
- Specify root/canal when relevant: MB1, MB2, DB, P, ML, DL
- Vitality test results MUST be internally consistent with the stated diagnosis
- Radiographic descriptions must use standard clinical language:
  "widened PDL space", "periapical rarefaction", "J-shaped radiolucency",
  "furcal perforation", "strip perforation", "separated instrument at the apical third",
  "cervical root resorption", "internal inflammatory resorption", "hypercementosis"
- For CBCT findings, specify the view: axial / sagittal / coronal
- Trauma questions MUST anchor to IADT 2020 guidelines
- Irrigation/obturation questions MUST anchor to current AAE/ESE position statements
- Systemic conditions must directly affect the management decision — do not include irrelevant medical history

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DISTRACTOR QUALITY RULES — apply all of the following:
1. CORRECT-FACT-WRONG-CONTEXT: At least one distractor must be factually true but not the best answer for this specific scenario.
2. OUTDATED GUIDELINE: For trauma and regeneration questions, include one option reflecting older practice (e.g., dry socket storage, Ca(OH)2 apexification instead of MTA/Biodentine).
3. ADJACENT DOMAIN: Include one option that would be correct if the tooth were in a different clinical state (e.g., extraction for a restorable tooth).
4. LENGTH PARITY: All four options must be approximately the same length (±3 words). A notably longer option telegraphs the correct answer.
5. NO ABSOLUTES ASYMMETRY: Do not use "always" or "never" in a distractor unless the correct answer also uses similar language.
6. NO IMPLAUSIBLE OPTIONS: Every option must be something a partially-prepared candidate could initially select.
7. RANDOMIZE CORRECT ANSWER POSITION: Distribute correct answers across A/B/C/D — do not cluster at index 0 or 1.
8. FORBIDDEN: "All of the above", "None of the above", "Both A and C", True/False framing.

INTERNAL VALIDATION — before finalising each question, confirm:
  □ Exactly one unambiguously correct answer
  □ Clinical details are internally consistent
  □ Correct answer position is not predictably clustered
  □ No two options begin with the same word

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EXPLANATION STRUCTURE — for each question provide:
- Why the correct answer is right (cite the relevant guideline or classification)
- Why each distractor is wrong (one sentence per option)
- One clinical pearl: a memorable, high-yield exam takeaway

GUIDELINE ANCHORS TO USE:
  IADT 2020 | AAE 2009 Diagnostic Terminology | AAE/ESE Position Statements |
  Vertucci 1984 | Heithersay 1999 | ESE regenerative guidelines |
  Cracked Tooth Consensus Conference 2019

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Avoid creating duplicates or questions similar to these recent ones:
{json.dumps(existing_texts, indent=2)}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OUTPUT RULES:
- Return ONLY a raw JSON array. No markdown fences, no preamble, no commentary.
- Each object must match this exact schema:

{{
  "question": "Full clinical scenario and question stem...",
  "options": ["Option A text", "Option B text", "Option C text", "Option D text"],
  "correctAnswer": 0,
  "category": "One of the domain names listed above",
  "tier": 2,
  "explanation": "CORRECT: [Detailed reasoning for the right answer] INCORRECT: A - [Reason why A is wrong]; B - [Reason why B is wrong]; C - [Reason why C is wrong]; D - [Reason why D is wrong] CLINICAL PEARL: [High-yield takeaway] REFERENCE: [Source]",
  "clinicalPearl": "A high-yield exam takeaway that MUST specifically relate to the clinical scenario described above. Do not provide a generic endodontic fact.",
  "reference": "Primary guideline or source (e.g., IADT 2020, AAE 2009, Heithersay 1999)",
  "CRITICAL": "In the explanation, you MUST strictly separate distractors using 'A - ', 'B - ', 'C - ', 'D - ' markers. NEVER use phrases like 'Why others are wrong' or bullet points. Each distractor reason MUST start with its letter marker."
}}

Field notes:
  - "correctAnswer" is an integer index 0-3 matching the position in "options"
  - "tier" is an integer 1-4
  - "clinicalPearl" and "reference" are new fields — always include them
  - Do not add any fields not listed above
"""
    
    print("Calling Gemini API...")
    response = client.models.generate_content(
        model='gemini-3-flash-preview',
        contents=prompt
    )
    
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
    
    total_new_added = 0
    
    # We loop twice to generate 25 questions each time (50 total). 
    # This prevents hitting the API's 8192 max output token limit.
    for i in range(2):
        print(f"\n--- Generation Batch {i+1} of 2 ---")
        new_questions = generate_new_questions(existing_questions)
        
        if new_questions and len(new_questions) > 0:
            print(f"Successfully generated {len(new_questions)} questions in this batch.")
            
            # Deduplicate exactly
            existing_texts = {q['question'].lower() for q in existing_questions}
            unique_new = [q for q in new_questions if q['question'].lower() not in existing_texts]
            
            existing_questions.extend(unique_new)
            total_new_added += len(unique_new)
        else:
            print("No valid questions generated in this batch.")
            
    if total_new_added > 0:
        save_questions(existing_questions)
        print(f"\nSUCCESS: Saved a total of {total_new_added} unique new questions to {QUESTIONS_FILE}.")
    else:
        print("\nNo new questions were saved.")

if __name__ == "__main__":
    main()
