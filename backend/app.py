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
from functools import lru_cache
import logging
import time

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

    if not email or not password or not role:
        return jsonify({"error": "Missing required fields"}), 400

    if mongo.db.users.find_one({"email": email}):
        return jsonify({"error": "Email already exists"}), 400

    hashed_password = generate_password_hash(password)
    user_id = mongo.db.users.insert_one({
        "email": email,
        "password": hashed_password,
        "role": role
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
        companies = list(mongo.db.companies.find())
        return jsonify([{**company, "_id": str(company["_id"])} for company in companies])
    
    elif request.method == "POST":
        if user["role"] != "tpo":
            return jsonify({"error": "Unauthorized"}), 403
        data = request.json
        company_id = mongo.db.companies.insert_one(data).inserted_id
        return jsonify({"id": str(company_id)}), 201


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

if __name__ == "__main__":
    app.run(debug=True)
