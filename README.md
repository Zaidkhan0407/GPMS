GENPMS - Placement Management System
Overview
GENPMS is a comprehensive Placement Management System designed to streamline the recruitment process by connecting students, HR professionals, and Training & Placement Officers (TPO). The system leverages AI-powered resume analysis and job matching to enhance the placement experience for all stakeholders.

Key Features
For Students
Resume Analysis: Get detailed feedback and suggestions to improve your resume
Job Recommendations: Receive personalized job recommendations based on your resume and skills
Interview Preparation: Access AI-generated interview questions tailored to your profile
Application Tracking: Monitor the status of your job applications
For HR Professionals
Candidate Management: View and manage job applications with detailed match scores
Technical & Non-Technical Segregation: Separate view for technical and non-technical candidates
Application Status Management: Accept, reject, or review applications with ease
Resume Access: Direct access to candidate resumes
For TPO
Company Management: Add and manage company job listings
HR Code Generation: Create unique HR codes for company authentication
Placement Analytics: Track placement statistics and success rates
Technical Stack
Frontend
React with TypeScript
Tailwind CSS for styling
Vite as build tool
Axios for API communication
Backend
Python Flask
AI/ML models for resume analysis and job matching
RESTful API architecture
Setup Instructions
Frontend Setup
Navigate to the frontend directory:
cd frontend
Install dependencies:
npm install
Start the development server:
npm run dev
Backend Setup
Navigate to the backend directory:
cd backend
Create and activate a virtual environment (recommended):
python -m venv venv
source venv/bin/activate  # For Unix/macOS
.\venv\Scripts\activate  # For Windows
Install dependencies:
pip install -r requirements.txt
Start the server:
python app.py
Environment Configuration
Create a .env file in the backend directory
Add necessary environment variables:
SECRET_KEY=your_secret_key
DATABASE_URL=your_database_url
Usage Guidelines
Student Role
Sign up with your email and password
Upload your resume for analysis
View job recommendations and apply to matching positions
Use the interview preparation module for practice
HR Role
Sign up with the HR code provided by TPO
View and manage applications for your company's positions
Update application statuses and access candidate resumes
TPO Role
Sign up as TPO
Add new companies and generate HR codes
Monitor placement activities and manage job listings
Contributing
Fork the repository
Create a new branch for your feature
Submit a pull request with a clear description of changes
License
This project is licensed under the MIT License - see the LICENSE file for details.

Support
For support and queries, please create an issue in the repository or contact the development team.
