import os
import json
import time
from google import genai
from google.genai import types
import re
from collections import Counter
from difflib import SequenceMatcher

# Configure Gemini API
API_KEY = os.environ.get("GEMINI_API_KEY")
client = None
if API_KEY:
    client = genai.Client(api_key=API_KEY)

QUESTIONS_FILE = 'questions.json'
IMAGE_DIR = 'images'

if not os.path.exists(IMAGE_DIR):
    os.makedirs(IMAGE_DIR)

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

def generate_image_asset(prompt, filename):
    """
    Calls Imagen 3 to generate a clinical diagnostic image.
    Saves the image to the local images directory.
    """
    if not client:
        return False
        
    try:
        print(f"  [IMAGE] Generating: {filename}...")
        # Add medical styling to ensure professional look
        enhanced_prompt = f"Professional clinical dental diagnostic image. {prompt}. Medical radiology style, monochrome, high contrast, clean background, sharp detail."
        
        response = client.models.generate_images(
            model='gemini-3.1-flash-image-preview',
            prompt=enhanced_prompt,
            config=types.GenerateImagesConfig(
                number_of_images=1,
                include_rai_reason=True
            )
        )
        
        if response.generated_images:
            image_data = response.generated_images[0]
            file_path = os.path.join(IMAGE_DIR, os.path.basename(filename))
            image_data.image.save(file_path)
            print(f"  [IMAGE] Saved to {file_path}")
            return True
        return False
    except Exception as e:
        print(f"  [IMAGE ERROR] Failed to generate {filename}: {e}")
        return False

def validate_question(q):
    """
    Validates a single question object against the schema and quality rules.
    Returns a list of error strings. If empty, the question is valid.
    """
    errors = []
    required_fields = [
        'question', 'options', 'correctAnswer', 'category', 
        'tier', 'explanation', 'clinicalPearl', 'reference'
    ]
    
    # Check for missing fields
    for field in required_fields:
        if field not in q:
            errors.append(f"Missing field: {field}")
            
    # Check options integrity
    options = q.get('options', [])
    if not isinstance(options, list):
        errors.append("Field 'options' must be a list.")
    elif len(options) != 4:
        errors.append(f"Field 'options' must have exactly 4 strings (found {len(options)}).")
    else:
        # Check for forbidden phrases in options
        forbidden = ['all of the above', 'none of the above', 'both a and c']
        for opt in options:
            if any(phrase in str(opt).lower() for phrase in forbidden):
                errors.append(f"Forbidden phrase found in options: '{opt}'")

    # Check correctAnswer range
    ca = q.get('correctAnswer')
    if not isinstance(ca, int):
        errors.append(f"Field 'correctAnswer' must be an integer (found {type(ca).__name__}).")
    elif not (0 <= ca <= 3):
        errors.append(f"Field 'correctAnswer' must be between 0 and 3 (found {ca}).")

    # Check tier range
    tier = q.get('tier')
    if tier is not None: # Tier is expected for new questions
        if not isinstance(tier, int):
            errors.append(f"Field 'tier' must be an integer (found {type(tier).__name__}).")
        elif not (1 <= tier <= 4):
            errors.append(f"Field 'tier' must be between 1 and 4 (found {tier}).")

    # Basic string length check for core fields
    for field in ['question', 'explanation', 'clinicalPearl']:
        val = q.get(field, "")
        if isinstance(val, str) and len(val.strip()) < 10:
            errors.append(f"Field '{field}' is too short or empty.")

    return errors

def is_duplicate(new_q, existing_questions, threshold=0.75):
    """
    Checks if a question is a near-duplicate of any existing question
    using fuzzy string matching.
    """
    new_text = new_q['question'].lower()
    for existing in existing_questions:
        ratio = SequenceMatcher(None, new_text, existing['question'].lower()).ratio()
        if ratio > threshold:
            return True, ratio
    return False, 0

def audit_tiers(questions, target_dist=None):
    """
    Audits the tier distribution of a batch of questions.
    Returns a Counter of the actual distribution.
    """
    dist = Counter(q.get('tier') for q in questions)
    print("\nTier Distribution Audit:")
    
    # Standard target if none provided
    if not target_dist:
        target_dist = {1: 3, 2: 10, 3: 9, 4: 3}
        
    for tier in sorted([1, 2, 3, 4]):
        actual = dist.get(tier, 0)
        expected = target_dist.get(tier, 0)
        flag = "[OK]"
        if expected > 0:
            # Flag if deviation is significant (> 2)
            if abs(actual - expected) > 2:
                flag = "[!!]"
        print(f"  {flag} Tier {tier}: {actual} (target {expected})")
        
    return dist

def generate_new_questions(existing_questions, target_dist=None):
    if not client:
        print("Error: GEMINI_API_KEY environment variable not set.")
        return []
        
    if not target_dist:
        target_dist = {1: 3, 2: 10, 3: 9, 4: 3}
        
    # Extract existing question texts to try and avoid duplicates
    existing_texts = [q['question'] for q in existing_questions[-50:]] 
    
    # Format target distribution for prompt
    dist_str = f"{target_dist.get(1,0)} × Tier 1, {target_dist.get(2,0)} × Tier 2, {target_dist.get(3,0)} × Tier 3, {target_dist.get(4,0)} × Tier 4"

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
Assign EXACTLY: {dist_str}

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
- IMAGE SUPPORT: For CBCT, Trauma, and Resorption questions, you can now include an optional "image" field.
  - If using "image", provide a descriptive placeholder path: "images/case_[TIMESTAMP]_[RANDOM].jpg"
  - The question stem must explicitly refer to the image (e.g., "Based on the provided CBCT slice...").
  - Always provide an "imageAlt" description for accessibility and clarity.

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
  "image": "images/placeholder.jpg",
  "imageAlt": "A concise description of the finding in the image.",
  "CRITICAL": "In the explanation, you MUST strictly separate distractors using 'A - ', 'B - ', 'C - ', 'D - ' markers. NEVER use phrases like 'Why others are wrong' or bullet points. Each distractor reason MUST start with its letter marker."
}}

Field notes:
  - "correctAnswer" is an integer index 0-3 matching the position in "options"
  - "tier" is an integer 1-4
  - "clinicalPearl" and "reference" are new fields — always include them
  - "image" and "imageAlt" are OPTIONAL — only use for relevant clinical/radiographic cases.
  - Do not add any fields not listed above
"""
    
    print("Calling Gemini API...")
    response = client.models.generate_content(
        model='gemini-3-flash-preview',
        contents=prompt
    )
    
    response_text = response.text.strip()
    
    # Strip markdown formatting
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
        return []

def main():
    existing_questions = load_existing_questions()
    print(f"Loaded {len(existing_questions)} existing questions.")
    
    total_new_added = 0
    daily_target = {1: 6, 2: 20, 3: 18, 4: 6} # 50 questions per day
    accumulated_dist = Counter()
    
    for i in range(2):
        print(f"\n--- Generation Batch {i+1} of 2 ---")
        
        current_target = {1: 3, 2: 10, 3: 9, 4: 3}
        if i == 1:
            for tier in [1, 2, 3, 4]:
                current_target[tier] = max(0, daily_target[tier] - accumulated_dist.get(tier, 0))

        batch_questions = generate_new_questions(existing_questions, current_target)
        # Inter-batch cooldown for text generation
        time.sleep(5)
        
        if batch_questions and len(batch_questions) > 0:
            print(f"API returned {len(batch_questions)} questions. Validating...")
            
            valid_questions = []
            for q in batch_questions:
                errors = validate_question(q)
                
                # Check for near-duplicates before proceeding
                is_dup, ratio = is_duplicate(q, existing_questions)
                
                if not errors and not is_dup:
                    # ATOMIC IMAGE GENERATION
                    image_path = q.get('image')
                    image_alt = q.get('imageAlt')
                    
                    if image_path and image_alt:
                        # Clean up path to ensure uniqueness if the AI gave a generic one
                        if 'placeholder' in image_path or 'case_' not in image_path:
                            ts = int(time.time() * 1000)
                            image_path = f"images/case_{ts}_{len(valid_questions)}.jpg"
                            q['image'] = image_path
                            
                        # Attempt image generation
                        success = generate_image_asset(image_alt, image_path)
                        if success:
                            valid_questions.append(q)
                            existing_questions.append(q)
                            accumulated_dist[q.get('tier')] += 1
                            # Conservative cooldown for image generation safety
                            time.sleep(20) 
                        else:
                            print(f"  [SKIPPED] Question rejected because image generation failed.")
                    else:
                        # Text-only question
                        valid_questions.append(q)
                        existing_questions.append(q)
                        accumulated_dist[q.get('tier')] += 1
                elif is_dup:
                    print(f"  [SKIPPED] Duplicate detected (Ratio: {ratio:.2f})")
            
            total_new_added += len(valid_questions)
            print(f"Batch Summary: {len(valid_questions)} unique questions added.")
            audit_tiers(valid_questions, current_target)
        else:
            print("No valid questions generated in this batch.")
            
    print("\n" + "="*30)
    print("FINAL DAILY DISTRIBUTION REPORT")
    audit_tiers([q for q in existing_questions[-total_new_added:]] if total_new_added > 0 else [], daily_target)
    print("="*30)
            
    if total_new_added > 0:
        save_questions(existing_questions)
        print(f"\nSUCCESS: Saved {total_new_added} unique new questions.")
    else:
        print("\nNo new questions were saved.")

if __name__ == "__main__":
    main()
