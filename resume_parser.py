import os
import re
import spacy
from pdfminer.high_level import extract_text
import docx
from pdfminer.high_level import extract_text as extract_pdf_text

nlp = spacy.load('en_core_web_sm')

SKILL_SET = {
    'python', 'java', 'c', 'c++', 'c#', 'go', 'rust', 'scala',
    'javascript', 'typescript', 'matlab', 'bash', 'shell',
    'html', 'css', 'react', 'angular', 'vue', 'next.js', 'node.js',
    'express', 'rest', 'graphql', 'django', 'flask', 'fastapi',
    'spring', 'spring boot', '.net', 'asp.net',
    'sql', 'mysql', 'postgresql', 'sqlite', 'mongodb', 'redis', 'nosql',
    'machine learning', 'deep learning', 'artificial intelligence',
    'data analysis', 'data science', 'nlp', 'computer vision',
    'pandas', 'numpy', 'scikit-learn', 'tensorflow', 'pytorch',
    'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'ci/cd',
    'git', 'github', 'gitlab', 'linux', 'unix',
    'agile', 'scrum', 'oop', 'microservices', 'figma'
}

def clean_text(text):
    text = re.sub(r'\n+', '\n', text)
    text = re.sub(r' +', ' ', text)
    return text.strip()

def extract_email(text):
    match = re.search(r'\S+@\S+', text)
    return match.group(0) if match else None

def extract_phone_number(text):
    pattern = r'(\+?\d{1,3}[\s().\-]*)?(\(?\d{3}\)?[\s().\-]*\d{3}[\s().\-]*\d{4})'
    match = re.search(pattern, text)
    if not match:
        return None
    digits_only = re.sub(r'\D', '', match.group(0))
    if len(digits_only) < 10:
        return None
    digits_only = digits_only[-10:]
    return f"{digits_only[:3]}-{digits_only[3:6]}-{digits_only[6:]}"

def extract_name(text):
    lines = [ln.strip() for ln in text.split('\n') if ln.strip()]
    top_lines = lines[:15]
    bad_words = {'resume','curriculum vitae','cv','email','phone','address',
                 'linkedin','github','portfolio','objective','summary',
                 'education','experience','skills','projects'}
    first_line = top_lines[0]
    if re.fullmatch(r"[A-Za-z][A-Za-z.\-'\s]{1,80}", first_line):
        if not any(w in first_line.lower() for w in bad_words):
            return first_line
    candidates = []
    for ln in top_lines:
        ln_clean = re.sub(r'\s+', ' ', ln.strip())
        if any(w in ln_clean.lower() for w in bad_words):
            continue
        if not re.fullmatch(r"[A-Za-z][A-Za-z.\-'\s]{1,80}", ln_clean):
            continue
        words = ln_clean.replace('.', '').split()
        if 2 <= len(words) <= 4:
            candidates.append(ln_clean)
    if candidates:
        return candidates[0]
    doc = nlp("\n".join(top_lines))
    people = [ent.text for ent in doc.ents if ent.label_ == "PERSON"]
    return people[0] if people else None

def extract_skills(text):
    found = [skill for skill in SKILL_SET if skill.lower() in text.lower()]
    return sorted(set(found))

def extract_education(text):
    keywords = ['Associate','Associates','Bachelor','Master','Bachelors',
                'Masters','B.Sc','M.Sc','PhD','B.E','M.E.','B.S.','M.S.']
    lines = text.split('\n')
    return [line.strip() for line in lines if any(k in line for k in keywords)]

def extract_experience(text):
    experience_headers = ['work experience','experience','professional experience',
                          'research experience','technical experience','employment',
                          'internship experience','internships']
    stop_keywords = ['project','projects','education','skills','leadership',
                     'certifications','awards','summary','objective','references']
    lines = text.split('\n')
    result = []
    capturing = False
    for line in lines:
        stripped = line.strip()
        lower = stripped.lower()
        if not capturing and stripped and any(k == lower for k in experience_headers):
            capturing = True
            continue
        if capturing and stripped and any(k == lower for k in stop_keywords):
            break
        if capturing and stripped:
            result.append(stripped)
    return result

def extract_projects(text):
    project_headers = ['projects','academic projects','project experience','selected projects']
    stop_keywords = ['experience','work experience','education','skills','leadership',
                     'certifications','awards','summary','objective','references']
    lines = [ln.strip() for ln in text.split('\n') if ln.strip()]
    result = []
    capturing = False
    for line in lines:
        lower = line.lower().strip()
        if not capturing and any(k == lower for k in project_headers):
            capturing = True
            continue
        if capturing:
            if result and any(k == lower for k in stop_keywords):
                break
            result.append(line)
    return result

def extract_text_from_file(file_path):
    ext = os.path.splitext(file_path)[1].lower()
    
    if ext == '.pdf':
        return extract_pdf_text(file_path)
    
    elif ext == '.docx':
        doc = docx.Document(file_path)
        return '\n'.join([para.text for para in doc.paragraphs])
    
    elif ext == '.txt':
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            return f.read()
    
    else:
        raise ValueError(f"Unsupported file type: {ext}")

def parse_resume(file_path):
    raw = extract_text_from_file(file_path)
    text = clean_text(raw)
    return {
        'name': extract_name(text),
        'email': extract_email(text),
        'phone': extract_phone_number(text),
        'skills': extract_skills(text),
        'education': extract_education(text),
        'experience': extract_experience(text),
        'projects': extract_projects(text),
        'raw_text': raw  # Include raw text for enhanced context in AI features
    }