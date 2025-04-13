from flask import Flask, request, jsonify
from flask_pymongo import PyMongo
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from dotenv import load_dotenv
from bson import ObjectId
import os
from PyPDF2 import PdfReader
from huggingface_hub import InferenceClient
import re
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
from rank_bm25 import BM25Okapi
import base64
from functools import lru_cache
import logging
import time
from datetime import datetime
from collections import defaultdict
import spacy
import textract
from sklearn.preprocessing import MinMaxScaler
import tempfile
from io import BytesIO
from docx import Document
import uuid

# Load environment variables
load_dotenv()
#zaid Khan
# Initialize Flask app
app = Flask(__name__)
app.config["MONGO_URI"] = os.getenv("MONGO_URI")
app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY")
mongo = PyMongo(app)
jwt = JWTManager(app)

# Configure CORS with specific settings
CORS(app, resources={
    r"/api/*": {
        "origins": ["http://localhost:3000", "http://localhost:5173"],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
        "allow_headers": ["Content-Type", "Authorization"],
        "expose_headers": ["Content-Range", "X-Total-Count"],
        "supports_credentials": True
    }
})

# Initialize Hugging Face client
huggingface_token = os.getenv("HUGGINGFACE_TOKEN")
client = InferenceClient(token=huggingface_token)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Cache vectorizer and job corpus to avoid recomputation
@lru_cache(maxsize=1)
def _get_vectorizer_and_corpus():
    """Cache vectorizer and preprocessed job corpus 

    This function is optimized for performance by using a cache and
    minimizing database queries. It also uses a single vectorizer
    instance to reduce memory usage.

    The function does the following:
    1. Retrieves all job documents from the database
    2. Extracts relevant fields from each job document
    3. Boosts important fields using term repetition and maintains
       the original text for response
    4. Creates a corpus of all the job descriptions
    5. Creates a vectorizer instance and fits it to the corpus 
    6. Tokenizes the corpus for BM25 implementation
    7. Returns the vectorizer instance, tokenized corpus, and preprocessed job corpus
    """
    # Retrieve all job documents from the database with additional fields
    jobs = list(mongo.db.companies.find(
        {},
        {
            'name': 1, 
            'position': 1, 
            'description': 1, 
            'requirements': 1, 
            '_id': 1,
            'location': 1,  # Add location
            'salary_min': 1,  # Add salary fields
            'salary_max': 1,
            'hr_email': 1,
            'hr_code': 1
        }
    ))

    # Extract relevant fields from each job document
    weighted_jobs = []
    for job in jobs:
        # Boost the name field by repeating it three times
        # Boost the position field by repeating it two times
        # Keep the description and requirements fields as is
        boosted_text = f"{job['name']} " * 3 + \
                      f"{job['position']} " * 2 + \
                      job['description'] + " " + job['requirements']
        # Store the boosted text with the original job document
        weighted_jobs.append((job, boosted_text)) 

    # Create a corpus of all the job descriptions
    corpus = [text for _, text in weighted_jobs]

    # Create a vectorizer instance and fit it to the corpus
    # This will create a mapping of words to vectors
    vectorizer = TfidfVectorizer(stop_words='english', ngram_range=(1, 2))
    vectorizer.fit(corpus)

    # Tokenize the corpus for BM25 implementation
    tokenized_corpus = [doc.split() for doc in corpus]
    
    # Return the vectorizer instance, tokenized corpus, and preprocessed job corpus
    return vectorizer, tokenized_corpus, weighted_jobs

def recommend_jobs(resume_text):
    try:
        vectorizer, tokenized_corpus, weighted_jobs = _get_vectorizer_and_corpus() 
        jobs = [job for job, _ in weighted_jobs]

        if not jobs:
            logger.warning("No jobs found in the database.")
            return []

        job_scores = []
        for job in jobs:
            job_text = f"{job.get('name', '')} {job.get('position', '')} {job.get('description', '')} {job.get('requirements', '')}"
            
            # Calculate matching scores
            matching_scores = calculate_matching_scores(resume_text, job_text)
            
            job_scores.append({
                'job': job,
                'scores': matching_scores
            })

        sorted_jobs = sorted(job_scores, key=lambda x: x['scores']['overall_match'], reverse=True)
        
        recommended_jobs = []
        for job_score in sorted_jobs[:10]:
            if job_score['scores']['overall_match'] > 0:
                job = job_score['job']
                scores = job_score['scores']
                
                job_data = {
                    'id': str(job['_id']),
                    'name': job.get('name', ''),
                    'position': job.get('position', ''),
                    'description': job.get('description', ''),
                    'requirements': job.get('requirements', ''),
                    'location': job.get('location', 'Location not specified'),
                    'salary_min': float(job.get('salary_min', 0)),
                    'salary_max': float(job.get('salary_max', 0)),
                    'hr_code': job.get('hr_code', ''),  # Add HR code
                    'hr_email': job.get('hr_email', ''),  # Add HR email
                    'match_details': {
                        'overall_match': scores['overall_match'] / 100,
                        'technical_match': scores['technical_match'] / 100,
                        'semantic_match': scores['semantic_match'] / 100,
                        'tfidf_similarity': scores['tfidf_similarity'] / 100,
                        'bm25_score': scores['bm25_score'] / 100
                    }
                }
                recommended_jobs.append(job_data)
        
        return recommended_jobs
    
    except Exception as e:
        logger.error(f"Recommendation error: {str(e)}")
        return []

# Function to extract text from the uploaded PDF resume
def generate_interview_questions(resume_text):
    """Generate interview questions based on resume content.
    
    Args:
        resume_text (str): The extracted text from the resume
        
    Returns:
        list: A list of generated interview questions
    """
    try:
        # Create a prompt for generating interview questions
        prompt = f"""Based on the following resume content, generate 5 relevant interview questions. 
        The questions should be a mix of technical and behavioral questions that are specifically tailored 
        to the candidate's experience and skills. Make the questions challenging but fair.

        Resume Content:
        {resume_text}

        Generate 5 interview questions that:
        1. Test technical skills mentioned in the resume
        2. Explore past projects and experiences
        3. Assess problem-solving abilities
        4. Evaluate teamwork and collaboration
        5. Examine leadership and initiative

        Format: Return only the questions as a numbered list.
        """

        # Generate questions using the Hugging Face model
        response = client.text_generation(
            prompt,
            model="meta-llama/Llama-3.2-3B-Instruct",
            max_new_tokens=500,
            temperature=0.7,
            top_k=50,
            top_p=0.95,
        )

        # Process the response to extract questions
        questions = [q.strip() for q in response.split('\n') if q.strip() and any(char.isdigit() for char in q)]
        
        # Ensure we have exactly 5 questions
        questions = questions[:5] if len(questions) > 5 else questions
        
        return questions

    except Exception as e:
        logger.error(f"Error generating interview questions: {str(e)}")
        return []

def extract_text_from_file(file, file_type):
    """Extract text from PDF or DOCX files with enhanced error handling and multiple fallback methods."""
    text = ""
    temp_file_path = None
    start_time = time.time()
    
    try:
        # Validate file size (max 50MB)
        file.seek(0, 2)
        file_size = file.tell()
        if file_size > 50 * 1024 * 1024:
            raise ValueError(f"File size ({file_size / 1024 / 1024:.1f}MB) exceeds maximum limit of 50MB")
        file.seek(0)
        
        # Create secure temporary file with sanitized name
        safe_filename = re.sub(r'[^a-zA-Z0-9.-]', '_', file.filename)
        temp_filename = f'temp_{uuid.uuid4().hex}_{safe_filename}'
        temp_file_path = os.path.join(tempfile.gettempdir(), temp_filename)
        logger.info(f"Processing {file_type.upper()} file: {file.filename} ({file_size/1024:.1f}KB)")
        logger.debug(f"Temporary file path: {temp_file_path}")

        # Save file with chunk processing for large files
        with open(temp_file_path, 'wb') as temp_file:
            while chunk := file.read(8192):
                temp_file.write(chunk)
        
        if file_type == "pdf":
            text = ""
            pdf_extraction_methods = [
                ("PyPDF2", lambda: extract_with_pypdf2(temp_file_path)),
                ("PDFMiner", lambda: extract_with_pdfminer(temp_file_path)),
                ("Textract", lambda: extract_with_textract(temp_file_path))
            ]
            
            extraction_results = []
            for method_name, extract_method in pdf_extraction_methods:
                try:
                    method_start = time.time()
                    method_text = extract_method()
                    method_time = time.time() - method_start
                    char_count = len(method_text.strip())
                    extraction_results.append((method_name, char_count, method_text))
                    logger.info(f"{method_name} extracted {char_count} chars in {method_time:.2f}s")
                except Exception as method_error:
                    logger.warning(f"{method_name} failed: {str(method_error)}")
                    continue
            
            if extraction_results:
                # Use the result with the most extracted text
                best_result = max(extraction_results, key=lambda x: x[1])
                text = best_result[2]
                logger.info(f"Selected {best_result[0]} result with {best_result[1]} chars")
            else:
                raise ValueError("All PDF extraction methods failed")
                
        elif file_type == "docx":
            extraction_methods = [
                ("python-docx", lambda: extract_with_python_docx(temp_file_path)),
                ("textract", lambda: textract.process(temp_file_path, extension='docx').decode('utf-8'))
            ]
            
            for method_name, extract_method in extraction_methods:
                try:
                    method_start = time.time()
                    text = extract_method()
                    method_time = time.time() - method_start
                    char_count = len(text.strip())
                    logger.info(f"{method_name} extracted {char_count} chars in {method_time:.2f}s")
                    if char_count > 0:
                        break
                except Exception as method_error:
                    logger.warning(f"{method_name} failed: {str(method_error)}")
                    continue
        
        # Post-process and validate extracted text
        text = text.strip()
        if not text:
            raise ValueError(f"No text could be extracted from {file_type.upper()} file")
        
        # Remove excessive whitespace and normalize line endings
        text = re.sub(r'\s+', ' ', text)
        text = re.sub(r'\n\s*\n+', '\n\n', text)
        
        total_time = time.time() - start_time
        logger.info(f"Extraction completed: {len(text)} chars in {total_time:.2f}s")
        return text
        
    except Exception as e:
        logger.error(f"Extraction error for {file_type.upper()}: {str(e)}")
        raise ValueError(f"Failed to extract text from {file_type.upper()} file: {str(e)}")
    
    finally:
        if temp_file_path and os.path.exists(temp_file_path):
            try:
                os.unlink(temp_file_path)
                logger.debug(f"Cleaned up temporary file: {temp_file_path}")
            except Exception as cleanup_error:
                logger.warning(f"Failed to clean up temporary file: {str(cleanup_error)}")

def extract_with_python_docx(file_path):
    """Extract text from DOCX using python-docx with enhanced paragraph handling."""
    doc = Document(file_path)
    text_parts = []
    
    for para in doc.paragraphs:
        if para.text.strip():
            # Preserve paragraph spacing
            text_parts.append(para.text)
    
    # Add table content
    for table in doc.tables:
        for row in table.rows:
            row_text = ' | '.join(cell.text.strip() for cell in row.cells if cell.text.strip())
            if row_text:
                text_parts.append(row_text)
    
    return '\n'.join(text_parts)

def extract_with_pypdf2(file_path):
    """Extract text from PDF using PyPDF2."""
    text = ""
    with open(file_path, 'rb') as pdf_file:
        reader = PdfReader(pdf_file)
        for page in reader.pages:
            try:
                extracted = page.extract_text()
                if extracted:
                    text += extracted + "\n"
            except Exception as page_error:
                logger.warning(f"Error extracting text from page with PyPDF2: {str(page_error)}")
                continue
    return text

def extract_with_pdfminer(file_path):
    """Extract text from PDF using pdfminer."""
    from pdfminer.high_level import extract_text as pdfminer_extract
    return pdfminer_extract(file_path)

def extract_with_textract(file_path):
    """Extract text from PDF using textract."""
    return textract.process(file_path, method='pdfminer').decode('utf-8')

def allowed_file(filename):
    """Check if the file has an allowed extension (PDF or DOCX)."""
    # Use regex to extract the file extension, handling underscores, spaces, and numbers
    match = re.search(r'\.([a-zA-Z0-9]+)$', filename)
    if not match:
        return False
    
    # Get the file extension in lowercase
    file_ext = match.group(1).lower()
    
    # Check if the extension is allowed
    return file_ext in {'pdf', 'docx'}

def extract_file_extension(filename):
    """Extract the file extension from a filename, handling edge cases."""
    # Use regex to extract the file extension, handling underscores, spaces, and numbers
    match = re.search(r'\.([a-zA-Z0-9]+)$', filename)
    if not match:
        raise ValueError("No file extension found")
    
    # Return the file extension in lowercase
    return match.group(1).lower()

@app.route("/api/jobs/recommendations", methods=["POST", "OPTIONS"])
@jwt_required()
def get_job_recommendations():
    if request.method == "OPTIONS":
        response = jsonify({})
        return response, 200

    try:
        # Validate request content type
        if not request.content_type or 'multipart/form-data' not in request.content_type:
            return jsonify({'error': 'Invalid content type. Must be multipart/form-data'}), 415

        if 'resume' not in request.files:
            return jsonify({'error': 'No resume file provided'}), 400

        resume_file = request.files['resume']
        if resume_file.filename == '':
            return jsonify({'error': 'No selected file'}), 400

        # Validate file size (e.g., 10MB limit)
        max_size = 10 * 1024 * 1024  # 10MB in bytes
        resume_file.seek(0, 2)  # Seek to end of file
        file_size = resume_file.tell()
        resume_file.seek(0)  # Reset file pointer

        if file_size > max_size:
            return jsonify({'error': 'File size exceeds maximum limit of 10MB'}), 413

        # Extract and validate file extension
        try:
            file_extension = extract_file_extension(resume_file.filename)
        except ValueError as ve:
            return jsonify({'error': str(ve)}), 400

        if not allowed_file(resume_file.filename):
            return jsonify({'error': 'Invalid file format. Only PDF and DOCX files are allowed'}), 400

        # Extract text from resume with enhanced error handling
        try:
            resume_text = extract_text_from_file(resume_file, file_extension)
            if not resume_text:
                return jsonify({'error': 'Could not extract text from resume'}), 400
        except ValueError as ve:
            return jsonify({'error': str(ve)}), 400
        except Exception as e:
            logger.error(f"Error extracting text from resume: {str(e)}")
            return jsonify({'error': 'Failed to process resume file'}), 500

        # Get job recommendations
        recommended_jobs = recommend_jobs(resume_text)
        if not recommended_jobs:
            return jsonify({'message': 'No matching jobs found', 'jobs': []}), 200

        return jsonify({'jobs': recommended_jobs}), 200

    except Exception as e:
        logger.error(f"Error in job recommendations: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

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

    # Verify HR code against TPO-listed jobs if role is HR
    if role == "hr":
        if not hr_code:
            return jsonify({"error": "HR code required for HR signup"}), 400
        company = mongo.db.companies.find_one({"hr_code": hr_code})
        if not company:
            return jsonify({"error": "Invalid HR code"}), 400

    hashed_password = generate_password_hash(password)
    user_id = mongo.db.users.insert_one({
        "email": email,
        "password": hashed_password,
        "role": role,
        "hr_code": hr_code if role == "hr" else None
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
        return jsonify({"error": "Invalid email or password"}), 401

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
    current_user = get_jwt_identity()
    user = mongo.db.users.find_one({"_id": ObjectId(current_user)})
    
    if not user:
        return jsonify({"error": "User not found"}), 404

    if request.method == "GET":
        if user["role"] == "hr":
            # HR users can only see their assigned company
            companies = list(mongo.db.companies.find({"hr_code": user["hr_code"]}))
        else:
            companies = list(mongo.db.companies.find())
        return jsonify([{**company, "_id": str(company["_id"])} for company in companies])
    
    elif request.method == "POST":
        if user["role"] != "tpo":
            return jsonify({"error": "Unauthorized"}), 403
        data = request.json
        
        # Generate a unique HR code for the company
        hr_code = str(ObjectId())
        data["hr_code"] = hr_code
        
        company_id = mongo.db.companies.insert_one(data).inserted_id
        return jsonify({"id": str(company_id), "hr_code": hr_code}), 201

@app.route("/api/companies/<company_id>", methods=["PUT", "DELETE"])
@jwt_required()
def manage_company(company_id):
    current_user = get_jwt_identity()
    user = mongo.db.users.find_one({"_id": ObjectId(current_user)})
    
    if not user or user["role"] != "tpo":
        return jsonify({"error": "Unauthorized"}), 403

    if request.method == "PUT":
        try:
            data = request.json
            result = mongo.db.companies.update_one(
                {"_id": ObjectId(company_id)},
                {"$set": {
                    "name": data["name"],
                    "position": data["position"],
                    "description": data["description"],
                    "requirements": data["requirements"],
                    "hr_email": data["hr_email"],
                    "hr_code": data["hr_code"],
                    "location": data["location"],
                    "salary_min": data["salary_min"],
                    "salary_max": data["salary_max"]
                }}
            )
            
            if result.matched_count == 0:
                return jsonify({"error": "Company not found"}), 404
                
            return jsonify({"message": "Company updated successfully"}), 200
            
        except Exception as e:
            logger.error(f"Error updating company: {str(e)}")
            return jsonify({"error": "Failed to update company"}), 500

    elif request.method == "DELETE":
        try:
            result = mongo.db.companies.delete_one({"_id": ObjectId(company_id)})
            if result.deleted_count == 0:
                return jsonify({"error": "Company not found"}), 404
            return jsonify({"message": "Company deleted successfully"}), 200
        except Exception as e:
            logger.error(f"Error deleting company: {str(e)}")
            return jsonify({"error": "Failed to delete company"}), 500


@app.route("/api/analyze-resume", methods=["POST"])
@jwt_required()
def analyze_resume():
    if 'resume' not in request.files:
        return jsonify({'error': 'No resume file provided'}), 400

    resume_file = request.files['resume']
    action = request.form.get('action')

    if resume_file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    file_ext = resume_file.filename.rsplit('.', 1)[1].lower()

    if resume_file and allowed_file(resume_file.filename):
        resume_text = extract_text_from_file(resume_file, file_ext)

        if action == 'improve':
            prompt = f"I have the following resume, please suggest me some ideas to improve my skills:\n{resume_text}\nBased on this resume, recommend me 5 improvements.\nJust Output me the improvements Nothing Else"
        elif action == 'questions':
            questions = generate_interview_questions(resume_text)
            return jsonify({'questions': questions, 'resume_text': resume_text})
        elif action == 'recommend_jobs':
            recommended_jobs = recommend_jobs(resume_text)
            return jsonify({'recommended_jobs': recommended_jobs})
        else:
            return jsonify({'error': 'Invalid action'}), 400

        if not huggingface_token:
            logger.error("Hugging Face API token not found in environment variables")
            return jsonify({'error': 'API configuration error. Please contact administrator.'}), 500

        try:
            response = client.text_generation(
                prompt,
                model="meta-llama/Llama-3.2-3B-Instruct",
                max_new_tokens=500,
                temperature=0.7,
                top_k=50,
                top_p=0.95,
            )
            return jsonify({'result': response})
        except Exception as api_error:
            if '401' in str(api_error):
                logger.error(f"Hugging Face API authentication failed: {str(api_error)}")
                return jsonify({'error': 'API authentication failed. Please verify API token.'}), 500
            else:
                logger.error(f"Error calling Hugging Face API: {str(api_error)}")
                return jsonify({'error': 'An error occurred during resume analysis'}), 500
    else:
        return jsonify({'error': 'Invalid file type'}), 400


@app.route("/api/interview-prep", methods=["POST"])
@jwt_required()
def interview_prep():
    resume_text = request.json.get('resume_text')
    question = request.json.get('question')
    answer = request.json.get('answer')

    if not resume_text or not question or not answer:
        return jsonify({'error': 'Missing required fields'}), 400

    prompt = f"""Based on the following resume:

{resume_text}

For the interview question: "{question}"

The candidate's answer was: "{answer}"

Please provide constructive feedback and suggestions for improvement. Focus on:
1. The relevance of the answer to the question
2. The clarity and structure of the response
3. Any missing key points or experiences from the resume that could have been mentioned
4. Suggestions for better articulation or presentation of ideas

Provide your feedback in a clear, concise manner with specific points for improvement."""

    if not huggingface_token:
        logger.error("Hugging Face API token not found in environment variables")
        return jsonify({'error': 'API configuration error. Please contact administrator.'}), 500

    try:
        response = client.text_generation(
            prompt,
            model="meta-llama/Llama-3.2-3B-Instruct",
            max_new_tokens=500,
            temperature=0.7,
            top_k=50,
            top_p=0.95,
        )
        return jsonify({'result': response})
    except Exception as api_error:
        if '401' in str(api_error):
            logger.error(f"Hugging Face API authentication failed: {str(api_error)}")
            return jsonify({'error': 'API authentication failed. Please verify API token.'}), 500
        else:
            logger.error(f"Error calling Hugging Face API: {str(api_error)}")
            return jsonify({'error': 'An error occurred during interview preparation'}), 500

def allowed_file(filename):
    """Check if the file has an allowed extension (PDF or DOCX)."""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in {'pdf', 'docx'}

# Add after existing imports
from datetime import datetime
from collections import defaultdict
import spacy
import textract
from sklearn.preprocessing import MinMaxScaler

# Add new functions after existing ones
def process_application(resume_file, job_id, user_id):
    """Process and analyze a job application"""
    try:
        file_ext = resume_file.filename.rsplit('.', 1)[1].lower()
        resume_text = extract_text_from_file(resume_file, file_ext)
        
        # Get job details
        job = mongo.db.companies.find_one({"_id": ObjectId(job_id)})
        job_text = f"{job['position']} {job['description']} {job['requirements']}"
        
        # Calculate various matching scores
        scores = calculate_matching_scores(resume_text, job_text)
        
        # Store application
        application = {
            'user_id': ObjectId(user_id),
            'job_id': ObjectId(job_id),
            'resume_text': resume_text,
            'scores': scores,
            'status': 'pending',
            'applied_at': datetime.now(),
            'last_updated': datetime.now()
        }
        
        mongo.db.applications.insert_one(application)
        return True
        
    except Exception as e:
        logger.error(f"Application processing error: {str(e)}")
        return False

def calculate_matching_scores(resume_text, job_text):
    """Calculate comprehensive matching scores between resume and job using advanced NLP"""
    try:
        # Extract key components from job text
        job_components = {
            'technical_skills': extract_technical_skills(job_text),
            'soft_skills': extract_soft_skills(job_text),
            'experience_requirements': extract_experience_requirements(job_text)
        }
        
        # Extract key components from resume
        resume_components = {
            'technical_skills': extract_technical_skills(resume_text),
            'soft_skills': extract_soft_skills(resume_text),
            'experience': extract_experience_requirements(resume_text)
        }
        
        # Calculate semantic similarity using enhanced TF-IDF
        vectorizer = TfidfVectorizer(stop_words='english', ngram_range=(1, 2))
        tfidf_matrix = vectorizer.fit_transform([job_text, resume_text])
        cosine_sim = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0]
        
        # Calculate contextual similarity using BM25
        bm25 = BM25Okapi([job_text.split()])
        bm25_score = bm25.get_scores(resume_text.split())[0]
        normalized_bm25 = min(bm25_score / 10.0, 1.0)
        
        # Calculate skill match scores
        technical_score = calculate_skill_match(job_components['technical_skills'], resume_components['technical_skills'])
        soft_skills_score = calculate_skill_match(job_components['soft_skills'], resume_components['soft_skills'])
        experience_score = calculate_experience_match(job_components['experience_requirements'], resume_components['experience'])
        
        # Calculate weighted final score
        weights = {
            'semantic_similarity': 0.3,
            'contextual_similarity': 0.2,
            'technical_skills': 0.2,
            'soft_skills': 0.15,
            'experience': 0.15
        }
        
        # Calculate raw final score
        raw_score = (
            weights['semantic_similarity'] * cosine_sim +
            weights['contextual_similarity'] * normalized_bm25 +
            weights['technical_skills'] * technical_score +
            weights['soft_skills'] * soft_skills_score +
            weights['experience'] * experience_score
        )

        # Apply sigmoid normalization to ensure consistent scoring
        normalized_score = 1 / (1 + np.exp(-5 * (raw_score - 0.5)))
        
        return {
            'overall_match': normalized_score,
            'cosine_similarity': cosine_sim,
            'bm25_score': normalized_bm25,
            'technical_match': technical_score,
            'soft_skills_match': soft_skills_score,
            'experience_match': experience_score
        }
        
    except Exception as e:
        logger.error(f"Score calculation error: {str(e)}")
        return {
            'cosine_similarity': 0,
            'bm25_score': 0,
            'technical_match': 0,
            'soft_skills_match': 0,
            'experience_match': 0,
            'overall_match': 0
        }

def extract_technical_skills(text):
    """Extract technical skills from text using keyword matching and NLP"""
    # Common technical skills keywords
    technical_keywords = set([
        'python', 'java', 'javascript', 'c++', 'sql', 'react', 'node.js', 'aws',
        'docker', 'kubernetes', 'machine learning', 'data analysis', 'algorithms',
        'database', 'api', 'cloud', 'git', 'linux', 'agile', 'devops'
    ])
    
    # Extract skills using regex and lowercase matching
    words = set(re.findall(r'\b\w+(?:\s+\w+)*\b', text.lower()))
    return words.intersection(technical_keywords)

def extract_soft_skills(text):
    """Extract soft skills from text using keyword matching and NLP"""
    # Common soft skills keywords
    soft_skills_keywords = set([
        'communication', 'leadership', 'teamwork', 'problem solving',
        'creativity', 'adaptability', 'time management', 'critical thinking',
        'collaboration', 'organization', 'project management', 'interpersonal',
        'analytical', 'decision making', 'flexibility'
    ])
    
    # Extract skills using regex and lowercase matching
    words = set(re.findall(r'\b\w+(?:\s+\w+)*\b', text.lower()))
    return words.intersection(soft_skills_keywords)

def extract_experience_requirements(text):
    """Extract experience requirements from text"""
    # Extract years of experience using regex
    years_pattern = r'\b(\d+)\+?\s*(?:year|yr)s?\b'
    years_matches = re.findall(years_pattern, text.lower())
    
    # Extract experience-related keywords
    experience_keywords = [
        'experience', 'background', 'worked', 'professional', 'industry',
        'expertise', 'knowledge', 'familiar', 'understanding'
    ]
    
    experience_info = {
        'years': [int(y) for y in years_matches] if years_matches else [0],
        'keywords': [word for word in experience_keywords if word.lower() in text.lower()]
    }
    
    return experience_info

def calculate_skill_match(job_skills, resume_skills):
    """Calculate the matching score between job skills and resume skills"""
    if not job_skills:
        return 1.0
    
    matched_skills = job_skills.intersection(resume_skills)
    return len(matched_skills) / len(job_skills)

def calculate_experience_match(job_exp, resume_exp):
    """Calculate the experience matching score"""
    # Compare years of experience
    required_years = max(job_exp['years']) if job_exp['years'] else 0
    actual_years = max(resume_exp['years']) if resume_exp['years'] else 0
    
    if required_years == 0:
        years_score = 1.0
    else:
        years_score = min(actual_years / required_years, 1.0)
    
    # Compare experience keywords
    keyword_match = len(set(job_exp['keywords']).intersection(set(resume_exp['keywords'])))
    keyword_score = keyword_match / len(job_exp['keywords']) if job_exp['keywords'] else 1.0
    
    # Combine scores with weights
    return 0.6 * years_score + 0.4 * keyword_score

# Add new routes
@app.route("/api/applications/rejected", methods=["DELETE"])
@jwt_required()
def remove_rejected_applications():
    current_user = get_jwt_identity()
    user = mongo.db.users.find_one({"_id": ObjectId(current_user)})
    
    if not user or user["role"] != "hr":
        return jsonify({"error": "Unauthorized"}), 403
        
    try:
        # Find the company associated with the HR user
        company = mongo.db.companies.find_one({"hr_code": user["hr_code"]})
        if not company:
            return jsonify({"error": "Company not found"}), 404
            
        # Delete all rejected applications for this company
        result = mongo.db.applications.delete_many({
            "job_id": company["_id"],
            "status": "rejected"
        })
        
        return jsonify({
            "message": f"Successfully removed {result.deleted_count} rejected applications",
            "deleted_count": result.deleted_count
        }), 200
    except Exception as e:
        logger.error(f"Error removing rejected applications: {str(e)}")
        return jsonify({"error": "Failed to remove rejected applications"}), 500

@app.route("/api/jobs/<job_id>/apply", methods=["POST"])
@jwt_required()
def apply_for_job(job_id):
    current_user = get_jwt_identity()
    
    if 'resume' not in request.files:
        return jsonify({'error': 'Resume file required'}), 400
        
    resume_file = request.files['resume']
    if not allowed_file(resume_file.filename):
        return jsonify({'error': 'Invalid file type'}), 400
        
    if process_application(resume_file, job_id, current_user):
        return jsonify({'message': 'Application submitted successfully'}), 201
    return jsonify({'error': 'Failed to process application'}), 500

@app.route("/api/jobs/<job_id>/applications", methods=["GET"])
@jwt_required()
def get_job_applications(job_id):
    current_user = get_jwt_identity()
    user = mongo.db.users.find_one({"_id": ObjectId(current_user)})
    
    if not user or user["role"] not in ["tpo", "hr"]:
        return jsonify({"error": "Unauthorized"}), 403
        
    try:
        # Get all applications for the job
        applications = list(mongo.db.applications.find({"job_id": ObjectId(job_id)}))
        
        # Get user details for each application
        enriched_applications = []
        for app in applications:
            user_data = mongo.db.users.find_one({"_id": app["user_id"]})
            enriched_applications.append({
                "id": str(app["_id"]),
                "user": {
                    "id": str(user_data["_id"]),
                    "email": user_data["email"]
                },
                "scores": app["scores"],
                "status": app["status"],
                "applied_at": app["applied_at"].isoformat(),
                "last_updated": app["last_updated"].isoformat()
            })
            
        # Sort by overall match score
        enriched_applications.sort(key=lambda x: x["scores"]["overall_match"], reverse=True)
        
        return jsonify({
            "applications": enriched_applications,
            "total": len(enriched_applications)
        })
        
    except Exception as e:
        logger.error(f"Error fetching applications: {str(e)}")
        return jsonify({"error": "Failed to fetch applications"}), 500

@app.route("/api/applications/<application_id>/status", methods=["PATCH"])
@jwt_required()
def update_application_status(application_id):
    current_user = get_jwt_identity()
    user = mongo.db.users.find_one({"_id": ObjectId(current_user)})
    
    if not user or user["role"] not in ["tpo", "hr"]:
        return jsonify({"error": "Unauthorized"}), 403
        
    new_status = request.json.get("status")
    if not new_status:
        return jsonify({"error": "Status required"}), 400
        
    try:
        mongo.db.applications.update_one(
            {"_id": ObjectId(application_id)},
            {
                "$set": {
                    "status": new_status,
                    "last_updated": datetime.now()
                }
            }
        )
        return jsonify({"message": "Status updated successfully"})
    except Exception as e:
        logger.error(f"Error updating status: {str(e)}")
        return jsonify({"error": "Failed to update status"}), 500

@app.route("/api/hr/resumes", methods=["GET", "POST"])
@jwt_required()
def hr_resumes():
    current_user = get_jwt_identity()
    user = mongo.db.users.find_one({"_id": ObjectId(current_user)})

    if not user:
        return jsonify({"error": "User not found"}), 404

    if user["role"] != "hr":
        return jsonify({"error": "Unauthorized"}), 403

    try:
        if request.method == "GET":
            resumes = list(mongo.db.resumes.find())
            return jsonify([{**resume, "id": str(resume["_id"])} for resume in resumes])

        elif request.method == "POST":
            data = request.json
            file_content = data.get("file")
            student_email = data.get("studentEmail")
            job_description = data.get("jobDescription")

            if not file_content or not student_email or not job_description:
                return jsonify({"error": "Missing required fields"}), 400

            # Calculate matching scores using the existing scoring system
            scores = calculate_matching_scores(file_content, job_description)
            ranking_score = scores['overall_match']

            resume_id = mongo.db.resumes.insert_one({
                "studentEmail": student_email,
                "file": file_content,
                "jobDescription": job_description,
                "rankingScore": ranking_score,
                "detailedScores": scores,
                "createdAt": datetime.now(),
                "updatedAt": datetime.now()
            }).inserted_id

            return jsonify({
                "id": str(resume_id),
                "rankingScore": ranking_score,
                "detailedScores": scores
            }), 201
            
    except Exception as e:
        logger.error(f"Error in hr_resumes: {str(e)}")
        return jsonify({"error": "Failed to process request"}), 500

def extract_technical_skills(text):
    """Extract technical skills from text using keyword matching."""
    # Common technical skills keywords
    technical_keywords = {
        'programming': ['python', 'java', 'javascript', 'c++', 'c#', 'ruby', 'php', 'swift', 'kotlin', 'go', 'rust'],
        'web': ['html', 'css', 'react', 'angular', 'vue', 'node.js', 'django', 'flask', 'spring', 'asp.net'],
        'database': ['sql', 'mysql', 'postgresql', 'mongodb', 'oracle', 'redis', 'elasticsearch'],
        'cloud': ['aws', 'azure', 'gcp', 'docker', 'kubernetes', 'terraform'],
        'tools': ['git', 'jenkins', 'jira', 'confluence', 'maven', 'gradle']
    }
    
    # Convert text to lowercase for case-insensitive matching
    text_lower = text.lower()
    
    # Find all matches
    found_skills = set()
    for category, skills in technical_keywords.items():
        for skill in skills:
            if skill in text_lower:
                found_skills.add(skill)
    
    return found_skills

def calculate_skill_match(required_skills, candidate_skills):
    """Calculate the match score between required and candidate skills."""
    if not required_skills:
        return 0.5  # Return moderate score if no specific skills required
    
    # Convert to sets if they aren't already
    required_set = set(required_skills)
    candidate_set = set(candidate_skills)
    
    # Calculate matches
    matches = len(required_set.intersection(candidate_set))
    total_required = len(required_set)
    
    # Calculate base score
    base_score = matches / max(1, total_required)
    
    # Add bonus for extra relevant skills
    extra_skills = len(candidate_set - required_set)
    bonus = min(0.2, 0.05 * extra_skills)  # Cap bonus at 20%
    
    # Combine scores with minimum threshold
    return max(0.1, min(1.0, base_score + bonus))

def calculate_matching_scores(resume_text, job_description):
    try:
        # Extract technical skills from both texts
        resume_skills = extract_technical_skills(resume_text)
        job_skills = extract_technical_skills(job_description)
        
        # Calculate technical skills match
        technical_match = calculate_skill_match(job_skills, resume_skills)
        
        # Initialize vectorizer for TF-IDF with better parameters
        vectorizer = TfidfVectorizer(
            stop_words='english',
            ngram_range=(1, 2),
            min_df=0.01,  # Ignore terms that appear in less than 1% of docs
            max_df=0.95   # Ignore terms that appear in more than 95% of docs
        )
        tfidf_matrix = vectorizer.fit_transform([resume_text, job_description])
        
        # Calculate TF-IDF based similarity with smoothing
        tfidf_similarity = max(0.1, cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0])
        
        # Calculate BM25 similarity with improved tokenization
        tokenized_texts = [doc.lower().split() for doc in [resume_text, job_description]]
        bm25 = BM25Okapi([tokenized_texts[1]])
        bm25_score = bm25.get_scores(tokenized_texts[0])[0]
        
        # Normalize BM25 score to 0.1-1 range to avoid zero scores
        normalized_bm25 = max(0.1, min(1.0, bm25_score / max(1, max(bm25.get_scores(tokenized_texts[1])))))
        
        # Combine scores with adjusted weights
        semantic_match = (0.5 * tfidf_similarity + 0.5 * normalized_bm25)
        
        # Calculate overall match with multiple factors
        overall_match = (
            0.4 * technical_match +  # Technical skills importance
            0.6 * semantic_match     # Semantic matching importance
        )
        
        # Ensure minimum score and scale to percentage
        overall_match = max(0.1, min(1.0, overall_match)) * 100
        
        # Prepare detailed scores
        scores = {
            'overall_match': float(f"{overall_match:.2f}"),
            'technical_match': float(f"{(technical_match * 100):.2f}"),
            'semantic_match': float(f"{(semantic_match * 100):.2f}"),
            'tfidf_similarity': float(f"{(tfidf_similarity * 100):.2f}"),
            'bm25_score': float(f"{(normalized_bm25 * 100):.2f}")
        }
        
        return scores
        
    except Exception as e:
        logger.error(f"Error in calculate_matching_scores: {str(e)}")
        raise e

@app.route("/api/jobs/recommendations", methods=["POST", "OPTIONS"])
@jwt_required()
def job_recommendations():
    if request.method == "OPTIONS":
        return jsonify({}), 200

    if 'resume' not in request.files:
        return jsonify({'error': 'No resume file provided'}), 400

    resume_file = request.files['resume']
    if resume_file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    if not allowed_file(resume_file.filename):
        return jsonify({'error': 'Invalid file type'}), 400

    file_ext = resume_file.filename.rsplit('.', 1)[1].lower()
    resume_text = extract_text_from_file(resume_file, file_ext)
    recommended_jobs = recommend_jobs(resume_text)

    return jsonify({'recommended_jobs': recommended_jobs})

if __name__ == "__main__":
    app.run(debug=True)