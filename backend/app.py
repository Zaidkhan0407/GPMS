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

# Load environment variables
load_dotenv()
#zaid Khan
# Initialize Flask app
app = Flask(__name__)
app.config["MONGO_URI"] = os.getenv("MONGO_URI")
app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY")
mongo = PyMongo(app)
jwt = JWTManager(app)
CORS(app)

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
    # Retrieve all job documents from the database
    jobs = list(mongo.db.companies.find(
        {},
        {'name': 1, 'position': 1, 'description': 1, 'requirements': 1, '_id': 1}
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
    """Optimized job recommender with semantic search capabilities"""
    try:
        # Get cached resources
        vectorizer, tokenized_corpus, weighted_jobs = _get_vectorizer_and_corpus() 
        jobs = [job for job, _ in weighted_jobs]

        # If no jobs are available, return an empty list
        if not jobs:
            logger.warning("No jobs found in the database.")
            return []

        # Transform resume text into a TF-IDF vector
        resume_vector = vectorizer.transform([resume_text])

        # Transform all job texts into TF-IDF vectors
        job_vectors = vectorizer.transform([text for _, text in weighted_jobs])
        
        # Calculate cosine similarity between resume and jobs
        cosine_similarities = cosine_similarity(resume_vector, job_vectors).flatten()

        # Calculate BM25-based similarity
        bm25 = BM25Okapi(tokenized_corpus)
        bm25_similarity_scores = bm25.get_scores(resume_text.split())

        # Combine similarities
        combined_similarities = 0.5 * (cosine_similarities + bm25_similarity_scores)
        
        # Determine the number of top jobs to recommend (min of 5 or total jobs)
        top_n = min(5, len(jobs))

        # Get indices of top N jobs based on combined similarity scores
        top_indices = np.argpartition(combined_similarities, -top_n)[-top_n:]

        # Sort the top indices by similarity score in descending order
        top_indices = top_indices[np.argsort(combined_similarities[top_indices])][::-1]
        
        # Prepare the recommended jobs with similarity scores
        recommended_jobs = []
        for i in top_indices:
            if combined_similarities[i] > 0.1:  # Only include jobs with a combined similarity score > 0.1
                job_data = {
                    'id': str(jobs[i]['_id']),
                    'name': jobs[i]['name'],
                    'position': jobs[i]['position'],
                    'description': jobs[i]['description'],
                    'requirements': jobs[i]['requirements'],
                    'similarity_score': float(f"{(combined_similarities[i]/100):.4f}"),
                    '_response_time_ms': int(time.time() * 1000)
                }
                recommended_jobs.append(job_data)
        
        # Return up to 5 recommended jobs 
        return recommended_jobs[:5]
    
    except Exception as e:
        logger.error(f"Recommendation error: {str(e)}")
        return []

# Function to extract text from the uploaded PDF resume
from docx import Document

def extract_text_from_file(file, file_type):
    """Extracts text from PDF or DOCX files."""
    text = ""

    if file_type == "pdf":
        reader = PdfReader(file)
        for page in reader.pages:
            text += page.extract_text() or ""  # Handle None values
    elif file_type == "docx":
        doc = Document(file) 
        text = "\n".join([para.text for para in doc.paragraphs])

    return text.strip() 

# Function to generate interview questions based on resume content
def generate_interview_questions(resume_text):
    """Generates 5 relevant interview questions based on the content of the provided resume."""
    prompt = f"""Based on the following resume, generate 5 relevant interview questions:

{resume_text}

Generate 5 interview questions that are specific to the candidate's experience, skills, and background. Each question should be on a new line and start with 'Q: '."""

    try:
        response = client.text_generation(
            prompt,
            model="meta-llama/Llama-3.2-3B-Instruct",
            max_new_tokens=500,
            temperature=0.7,
            top_k=50,
            top_p=0.95,
        )
        questions = re.findall(r'Q: (.+)', response)
        return questions
    except Exception as e:
        logger.error(f"Error generating interview questions: {str(e)}")
        return []

# Routes (unchanged, but now using the optimized recommend_jobs function)
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
                    "hr_code": data["hr_code"]
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
        except Exception as e:
            logger.error(f"Error calling Hugging Face API: {str(e)}")
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
    except Exception as e:
        logger.error(f"Error calling Hugging Face API: {str(e)}")
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
    """Calculate multiple matching scores between resume and job"""
    try:
        # TF-IDF similarity
        vectorizer = TfidfVectorizer(stop_words='english')
        tfidf_matrix = vectorizer.fit_transform([job_text, resume_text])
        cosine_sim = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0]
        
        # Calculate BM25 similarity
        bm25 = BM25Okapi([job_text.split()])
        bm25_score = bm25.get_scores(resume_text.split())[0]
        
        # Normalize BM25 score to [0,1] range
        max_bm25_score = 10.0  # Typical maximum BM25 score
        normalized_bm25 = min(bm25_score / max_bm25_score, 1.0)
        
        # Combine scores with equal weights
        combined_score = (cosine_sim + normalized_bm25) / 2
        
        # Ensure the final score is between 0 and 1
        normalized_match = max(0, min(combined_score, 1.0))
        
        return {
            'cosine_similarity': max(0, min(cosine_sim, 1.0)),
            'bm25_score': normalized_bm25,
            'overall_match': normalized_match
        }
    except Exception as e:
        logger.error(f"Score calculation error: {str(e)}")
        return {
            'cosine_similarity': 0,
            'bm25_score': 0,
            'overall_match': 0
        }

# Add new routes
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

        resume_id = mongo.db.resumes.insert_one({
            "studentEmail": student_email,
            "file": file_content,
            "jobDescription": job_description,
            "rankingScore": None  # Initialize ranking score as None
        }).inserted_id
        return jsonify({"id": str(resume_id)}), 201

@app.route("/api/hr/resumes/<resume_id>", methods=["PUT"])
@jwt_required()
def update_resume_ranking(resume_id):
    data = request.json
    mongo.db.resumes.update_one({"_id": ObjectId(resume_id)}, {"$set": {"rankingScore": data.get("rankingScore")}})
    return jsonify({"message": "Ranking score updated successfully"}), 200

if __name__ == "__main__":
        app.run(debug=True)