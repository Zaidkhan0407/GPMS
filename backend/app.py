from flask import Flask, request, jsonify
from flask_pymongo import PyMongo
from flask_jwt_extended import JWTManager, jwt_required
from flask_cors import CORS
from dotenv import load_dotenv
from huggingface_hub import InferenceClient
import os
import logging

# Load environment variables
load_dotenv()

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

@app.route("/api/analyze-code", methods=["POST"])
def analyze_code():
    try:
        data = request.json
        code = data.get("code")
        
        if not code:
            return jsonify({"error": "No code provided"}), 400

        # Create prompt for code analysis
        prompt = f"""Analyze this code for security vulnerabilities and performance issues:

{code}

Provide analysis in the following format:
1. Security Issues (including potential vulnerabilities and risks)
2. Performance Optimizations (including bottlenecks and improvements)
3. Code Quality Suggestions (including best practices and maintainability)
4. Severity Level (Critical/High/Medium/Low for each issue)"""

        # Get analysis from model
        response = client.text_generation(
            prompt,
            model="meta-llama/Llama-2-7b-chat-hf",
            max_new_tokens=1000,
            temperature=0.7
        )

        # Parse and structure the response
        analysis = {
            "security_issues": [],
            "performance_optimizations": [],
            "code_quality": [],
            "overall_severity": "Low"
        }

        # Process the response and categorize issues
        response_text = response.strip()
        sections = response_text.split("\n")
        current_section = None
        for line in sections:
            line = line.strip()
            if not line:
                continue
            
            if "1. Security Issues" in line:
                current_section = "security_issues"
            elif "2. Performance Optimizations" in line:
                current_section = "performance_optimizations"
            elif "3. Code Quality" in line:
                current_section = "code_quality"
            elif line.startswith("4. Severity Level"):
                continue
            elif current_section and not line[0].isdigit():
                analysis[current_section].append(line)

        # Determine overall severity
        if any("Critical" in str(issues) for issues in analysis.values()):
            analysis["overall_severity"] = "Critical"
        elif any("High" in str(issues) for issues in analysis.values()):
            analysis["overall_severity"] = "High"
        elif any("Medium" in str(issues) for issues in analysis.values()):
            analysis["overall_severity"] = "Medium"

        return jsonify({
            "analysis": analysis,
            "status": "success"
        })

    except Exception as e:
        logger.error(f"Error in code analysis: {str(e)}")
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True)