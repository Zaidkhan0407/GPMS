from flask import Flask, request, jsonify
from flask_pymongo import PyMongo
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from dotenv import load_dotenv
from bson import ObjectId
import os
from PyPDF2 import PdfReader
from groq import Groq
import re
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from rank_bm25 import BM25Okapi
import logging
from datetime import datetime
import tempfile
from docx import Document

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)
app.config["MONGO_URI"] = os.getenv("MONGO_URI")
app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY")
groq_api_key = os.getenv("GROQ_API_KEY")

# Validate environment variables
if not app.config["MONGO_URI"]:
    raise ValueError("MONGO_URI must be set in environment variables")
if not app.config["JWT_SECRET_KEY"]:
    raise ValueError("JWT_SECRET_KEY must be set in environment variables")
if not groq_api_key:
    raise ValueError("GROQ_API_KEY must be set in environment variables")

mongo = PyMongo(app)
jwt = JWTManager(app)

# Configure CORS
CORS(app, resources={
    r"/api/*": {
        "origins": ["http://localhost:5173"],
        "methods": ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Groq client
client = Groq(api_key=groq_api_key)

# Validate Groq API key
def validate_groq_api_key():
    try:
        client.chat.completions.create(
            model="llama3-70b-8192",
            messages=[{"role": "user", "content": "Test prompt"}],
            max_tokens=10
        )
        logger.info("Groq API key validated successfully")
    except Exception as e:
        logger.error(f"Invalid Groq API key: {str(e)}")
        raise ValueError("Groq API key is invalid or lacks permissions")

validate_groq_api_key()

# Helper Functions
def extract_text_from_file(file, file_type):
    """Extract text from PDF or DOCX files."""
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=f'.{file_type}') as temp_file:
            file_content = file.read()
            temp_file.write(file_content)
            temp_file_path = temp_file.name
        
        text = ""
        if file_type == "pdf":
            reader = PdfReader(temp_file_path)
            for page in reader.pages:
                extracted = page.extract_text()
                if extracted:
                    text += extracted + "\n"
        elif file_type == "docx":
            doc = Document(temp_file_path)
            text = "\n".join([para.text for para in doc.paragraphs if para.text.strip()])
        
        os.unlink(temp_file_path)
        return text.strip() or None
    except Exception as e:
        logger.error(f"Error extracting text from {file_type}: {str(e)}")
        return None

def extract_technical_skills(text):
    """Extract technical skills from text."""
    technical_keywords = {
        'python', 'java', 'javascript', 'c++', 'sql', 'react', 'node.js', 'aws',
        'docker', 'kubernetes', 'machine learning', 'data analysis', 'git', 'linux'
    }
    words = set(re.findall(r'\b\w+\b', text.lower()))
    return words.intersection(technical_keywords)

def calculate_matching_scores(resume_text, job_text):
    """Calculate matching scores between resume and job."""
    try:
        vectorizer = TfidfVectorizer(stop_words='english')
        tfidf_matrix = vectorizer.fit_transform([job_text, resume_text])
        cosine_sim = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0] * 100

        bm25 = BM25Okapi([job_text.split()])
        bm25_score = min(bm25.get_scores(resume_text.split())[0] / 10.0, 1.0) * 100

        job_skills = extract_technical_skills(job_text)
        resume_skills = extract_technical_skills(resume_text)
        skill_match = len(job_skills.intersection(resume_skills)) / max(len(job_skills), 1) * 100

        overall_match = (0.4 * cosine_sim + 0.3 * bm25_score + 0.3 * skill_match)
        
        return {
            'overall_match': overall_match,
            'tfidf_similarity': cosine_sim,
            'bm25_score': bm25_score,
            'technical_match': skill_match
        }
    except Exception as e:
        logger.error(f"Score calculation error: {str(e)}")
        return {'overall_match': 0, 'tfidf_similarity': 0, 'bm25_score': 0, 'technical_match': 0}

def try_text_generation(prompt, max_tokens=500, temperature=0.7):
    """Attempt text generation with fallback Groq models."""
    models = [
        "llama3-70b-8192",
    ]
    for model in models:
        try:
            response = client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": "You are a helpful assistant providing professional, concise responses."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=max_tokens,
                temperature=temperature
            )
            content = response.choices[0].message.content
            logger.info(f"Groq API response content: {content}")
            return content
        except Exception as e:
            logger.warning(f"Failed with model {model}: {str(e)}")
    raise Exception("All model attempts failed")

def generate_interview_questions(resume_text):
    """Generate 5 interview questions based on resume."""
    prompt = f"""Based on this resume:
{resume_text}
Generate 5 specific interview questions relevant to the candidate's experience and skills. Output each question in a numbered list, starting with '1. ', '2. ', etc., one question per line."""
    
    try:
        response = try_text_generation(prompt)
        questions = re.findall(r'\d+\.\s*(.+)', response)
        return questions[:5]
    except Exception as e:
        logger.error(f"Error generating questions: {str(e)}")
        return []

def allowed_file(filename):
    """Check if file has allowed extension."""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in {'pdf', 'docx'}

# Routes
@app.route("/api/signup", methods=["POST"])
def signup():
    data = request.json
    email = data.get("email")
    password = data.get("password")
    role = data.get("role")
    hr_code = data.get("hr_code") if role == "hr" else None

    if not email or not password or not role:
        return jsonify({"error": "Missing required fields"}), 400

    if mongo.db.users.find_one({"email": email}):
        return jsonify({"error": "Email already exists"}), 400

    if role == "hr" and (not hr_code or not mongo.db.companies.find_one({"hr_code": hr_code})):
        return jsonify({"error": "Invalid HR code"}), 400

    hashed_password = generate_password_hash(password)
    user_id = mongo.db.users.insert_one({
        "email": email,
        "password": hashed_password,
        "role": role,
        "hr_code": hr_code
    }).inserted_id

    token = create_access_token(identity=str(user_id))
    return jsonify({"token": token, "user": {"id": str(user_id), "email": email, "role": role}}), 201

@app.route("/api/login", methods=["POST"])
def login():
    data = request.json
    email = data.get("email")
    password = data.get("password")

    user = mongo.db.users.find_one({"email": email})
    if not user or not check_password_hash(user["password"], password):
        return jsonify({"error": "Invalid credentials"}), 401

    token = create_access_token(identity=str(user["_id"]))
    return jsonify({"token": token, "user": {"id": str(user["_id"]), "email": user["email"], "role": user["role"]}}), 200

@app.route("/api/user", methods=["GET"])
@jwt_required()
def get_user():
    user_id = get_jwt_identity()
    user = mongo.db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        return jsonify({"error": "User not found"}), 404
    return jsonify({"id": str(user["_id"]), "email": user["email"], "role": user["role"]}), 200

@app.route("/api/companies", methods=["GET", "POST"])
@jwt_required()
def companies():
    user_id = get_jwt_identity()
    user = mongo.db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        return jsonify({"error": "User not found"}), 404

    if request.method == "GET":
        query = {"hr_code": user["hr_code"]} if user["role"] == "hr" else {}
        companies = list(mongo.db.companies.find(query))
        return jsonify([{**c, "_id": str(c["_id"])} for c in companies])

    if user["role"] != "tpo":
        return jsonify({"error": "Unauthorized"}), 403
    data = request.json
    data["hr_code"] = str(ObjectId())
    company_id = mongo.db.companies.insert_one(data).inserted_id
    return jsonify({"id": str(company_id), "hr_code": data["hr_code"]}), 201

@app.route("/api/companies/<company_id>", methods=["PUT", "DELETE"])
@jwt_required()
def manage_company(company_id):
    user_id = get_jwt_identity()
    user = mongo.db.users.find_one({"_id": ObjectId(user_id)})
    if not user or user["role"] != "tpo":
        return jsonify({"error": "Unauthorized"}), 403

    if request.method == "PUT":
        data = request.json
        result = mongo.db.companies.update_one(
            {"_id": ObjectId(company_id)},
            {"$set": data}
        )
        return jsonify({"message": "Company updated" if result.matched_count else "Company not found"}), 200 if result.matched_count else 404

    result = mongo.db.companies.delete_one({"_id": ObjectId(company_id)})
    return jsonify({"message": "Company deleted" if result.deleted_count else "Company not found"}), 200 if result.deleted_count else 404

@app.route("/api/jobs/recommendations", methods=["POST", "OPTIONS"])
@jwt_required()
def job_recommendations():
    if request.method == "OPTIONS":
        return jsonify({}), 200

    try:
        if 'resume' not in request.files:
            return jsonify({'error': 'No resume file provided'}), 400

        resume_file = request.files['resume']
        if resume_file.filename == '':
            return jsonify({'error': 'No selected file'}), 400

        file_ext = resume_file.filename.rsplit('.', 1)[1].lower()
        if file_ext not in ['pdf', 'docx']:
            return jsonify({'error': 'Invalid file type. Only PDF and DOCX allowed'}), 400

        resume_text = extract_text_from_file(resume_file, file_ext)
        if not resume_text:
            return jsonify({'error': 'Could not extract resume text'}), 400

        jobs = list(mongo.db.companies.find({}))
        if not jobs:
            return jsonify({'jobs': [], 'message': 'No jobs available'}), 200

        recommended_jobs = []
        for job in jobs:
            logger.info(f"Job data: {job}")
            job_text = ' '.join(filter(None, [job.get('position', ''), job.get('description', ''), job.get('requirements', '')]))
            if not job_text.strip():
                continue

            scores = calculate_matching_scores(resume_text, job_text)
            if scores['overall_match'] > 30:
                recommended_jobs.append({
                    'id': str(job['_id']),
                    'name': job.get('name', ''),
                    'position': job.get('position', ''),
                    'description': job.get('description', ''),
                    'requirements': job.get('requirements', ''),
                    'location': job.get('location', ''),
                    'salary_min': job.get('salary_min', ''),
                    'salary_max': job.get('salary_max', ''),
                    'match_details': {
                        'overall_match': scores['overall_match'] / 100,
                        'technical_match': scores['technical_match'] / 100,
                        'tfidf_similarity': scores['tfidf_similarity'] / 100,
                        'bm25_score': scores['bm25_score'] / 100
                    }
                })

        recommended_jobs.sort(key=lambda x: x['match_details']['overall_match'], reverse=True)
        return jsonify({'jobs': recommended_jobs[:5]}), 200

    except Exception as e:
        logger.error(f"Recommendation error: {str(e)}")
        return jsonify({'error': 'Failed to process recommendations'}), 500

@app.route("/api/analyze-resume", methods=["POST", "OPTIONS"])
@jwt_required()
def analyze_resume():
    if request.method == "OPTIONS":
        return jsonify({}), 200

    if 'resume' not in request.files:
        return jsonify({'error': 'No resume file provided'}), 400

    resume_file = request.files['resume']
    action = request.form.get('action')
    if not allowed_file(resume_file.filename):
        return jsonify({'error': 'Invalid file type'}), 400

    file_ext = resume_file.filename.rsplit('.', 1)[1].lower()
    resume_text = extract_text_from_file(resume_file, file_ext)
    if not resume_text:
        return jsonify({'error': 'Could not extract resume text'}), 400

    if action == 'improve':
        prompt = f"""Based on this resume:
{resume_text}
Provide exactly 5 specific, professional suggestions to improve the resume. Focus on clarity, relevance, and impact. Output the suggestions in a numbered list, starting with '1. ', '2. ', etc., one suggestion per line. Each suggestion should be concise and actionable."""
        try:
            response = try_text_generation(prompt)
            improvements = re.findall(r'\d+\.\s*(.+)', response)
            if not improvements:
                return jsonify({'error': 'Failed to generate valid improvements'}), 500
            return jsonify({'improvements': improvements[:5]})
        except Exception as e:
            logger.error(f"Resume improvement error: {str(e)}")
            return jsonify({'error': 'Failed to analyze resume'}), 500

    elif action == 'questions':
        questions = generate_interview_questions(resume_text)
        return jsonify({'questions': questions})

    return jsonify({'error': 'Invalid action'}), 400

@app.route("/api/interview-prep", methods=["POST", "OPTIONS"])
def interview_prep():
    if request.method == "OPTIONS":
        return jsonify({}), 200

    @jwt_required()
    def handle_post():
        resume_text = request.json.get('resume_text')[:500]
        question = request.json.get('question')
        answer = request.json.get('answer')[:500]

        if not resume_text or not question or not answer:
            return jsonify({'error': 'Missing required fields'}), 400

        prompt = f"""Based on the following resume:
{resume_text}
For the interview question: "{question}"
The candidate's answer was: "{answer}"
Provide constructive feedback and suggestions for improvement in a numbered list, starting with '1. ', '2. ', etc., one point per line. Focus on:
1. Relevance of the answer to the question
2. Clarity and structure of the response
3. Missing key points or experiences from the resume
4. Suggestions for better articulation or presentation
Ensure feedback is clear, concise, and specific."""

        try:
            response = try_text_generation(prompt)
            feedback = re.findall(r'\d+\.\s*(.+)', response)
            if not feedback:
                return jsonify({'error': 'Failed to generate valid feedback'}), 500
            return jsonify({'result': feedback[:5]})
        except Exception as e:
            logger.error(f"Error calling Groq API: {str(e)}")
            return jsonify({'error': 'An error occurred during interview preparation'}), 500

    return handle_post()

@app.route("/api/jobs/<job_id>/apply", methods=["POST"])
@jwt_required()
def apply_for_job(job_id):
    user_id = get_jwt_identity()
    if 'resume' not in request.files:
        return jsonify({'error': 'Resume required'}), 400

    resume_file = request.files['resume']
    if not allowed_file(resume_file.filename):
        return jsonify({'error': 'Invalid file type'}), 400

    file_ext = resume_file.filename.rsplit('.', 1)[1].lower()
    resume_text = extract_text_from_file(resume_file, file_ext)
    if not resume_text:
        return jsonify({'error': 'Could not extract resume text'}), 400

    job = mongo.db.companies.find_one({"_id": ObjectId(job_id)})
    if not job:
        return jsonify({'error': 'Job not found'}), 404

    job_text = ' '.join(filter(None, [job.get('position', ''), job.get('description', ''), job.get('requirements', '')]))
    scores = calculate_matching_scores(resume_text, job_text)

    mongo.db.applications.insert_one({
        'user_id': ObjectId(user_id),
        'job_id': ObjectId(job_id),
        'resume_text': resume_text,
        'scores': scores,
        'status': 'pending',
        'applied_at': datetime.now()
    })

    return jsonify({'message': 'Application submitted'}), 201

@app.route("/api/jobs/<job_id>/applications", methods=["GET"])
@jwt_required()
def get_job_applications(job_id):
    user_id = get_jwt_identity()
    user = mongo.db.users.find_one({"_id": ObjectId(user_id)})
    if not user or user["role"] not in ["tpo", "hr"]:
        return jsonify({"error": "Unauthorized"}), 403

    applications = list(mongo.db.applications.find({"job_id": ObjectId(job_id)}))
    enriched_applications = [
        {
            "id": str(app["_id"]),
            "user": {
                "id": str(app["user_id"]),
                "email": mongo.db.users.find_one({"_id": app["user_id"]})["email"]
            },
            "scores": app["scores"],
            "status": app["status"],
            "applied_at": app["applied_at"].isoformat()
        } for app in applications
    ]

    enriched_applications.sort(key=lambda x: x["scores"]["overall_match"], reverse=True)
    return jsonify({"applications": enriched_applications, "total": len(enriched_applications)})

@app.route("/api/applications/<application_id>/status", methods=["PATCH"])
@jwt_required()
def update_application_status(application_id):
    user_id = get_jwt_identity()
    user = mongo.db.users.find_one({"_id": ObjectId(user_id)})
    if not user or user["role"] not in ["tpo", "hr"]:
        return jsonify({"error": "Unauthorized"}), 403

    new_status = request.json.get("status")
    if not new_status:
        return jsonify({"error": "Status required"}), 400

    result = mongo.db.applications.update_one(
        {"_id": ObjectId(application_id)},
        {"$set": {"status": new_status, "last_updated": datetime.now()}}
    )
    return jsonify({"message": "Status updated" if result.matched_count else "Application not found"}), 200 if result.matched_count else 404

@app.route("/api/applications/rejected", methods=["DELETE"])
@jwt_required()
def delete_rejected_applications():
    try:
        # Get the HR user's identity
        current_user_id = get_jwt_identity()
        current_user = mongo.db.users.find_one({"_id": ObjectId(current_user_id)})
        
        if not current_user or current_user.get("role") != "hr":
            return jsonify({"error": "Unauthorized access"}), 403
            
        # Get the HR's company code
        hr_code = current_user.get("hr_code")
        if not hr_code:
            return jsonify({"error": "HR code not found"}), 400
            
        # Find and delete all rejected applications for jobs under this HR
        company = mongo.db.companies.find_one({"hr_code": hr_code})
        if not company:
            return jsonify({"error": "Company not found"}), 404
            
        result = mongo.db.applications.delete_many({
            "job_id": ObjectId(str(company["_id"])),
            "status": "rejected"
        })
        
        return jsonify({"message": f"Successfully deleted {result.deleted_count} rejected applications"}), 200
    except Exception as e:
        logger.error(f"Error deleting rejected applications: {str(e)}")
        return jsonify({"error": "An error occurred while deleting rejected applications"}), 500

if __name__ == "__main__":
    app.run(debug=True)