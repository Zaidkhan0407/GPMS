# GENPMS - Placement Management System

## Overview
GENPMS is a comprehensive Placement Management System designed to streamline the recruitment process by connecting students, HR professionals, and Training & Placement Officers (TPO). The system leverages AI-powered resume analysis and job matching to enhance the placement experience for all stakeholders.

## Key Features

### For Students
- **Resume Analysis**: Get detailed feedback and suggestions to improve your resume
- **Job Recommendations**: Receive personalized job recommendations based on your resume and skills
- **Interview Preparation**: Access AI-generated interview questions tailored to your profile
- **Application Tracking**: Monitor the status of your job applications

### For HR Professionals
- **Candidate Management**: View and manage job applications with detailed match scores
- **Technical & Non-Technical Segregation**: Separate view for technical and non-technical candidates
- **Application Status Management**: Accept, reject, or review applications with ease
- **Resume Access**: Direct access to candidate resumes

### For TPO
- **Company Management**: Add and manage company job listings
- **HR Code Generation**: Create unique HR codes for company authentication
- **Placement Analytics**: Track placement statistics and success rates

## Technical Stack

### Frontend
- React with TypeScript
- Tailwind CSS for styling
- Vite as build tool
- Axios for API communication

### Backend
- Python Flask
- AI/ML models for resume analysis and job matching
- RESTful API architecture

## Setup Instructions

### Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

### Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment (recommended):
   ```bash
   python -m venv venv
   source venv/bin/activate  # For Unix/macOS
   .\venv\Scripts\activate  # For Windows
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Start the server:
   ```bash
   python app.py
   ```

## Environment Configuration
1. Create a `.env` file in the backend directory
2. Add necessary environment variables:
   ```env
   SECRET_KEY=your_secret_key
   DATABASE_URL=your_database_url
   ```

## Usage Guidelines

### Student Role
1. Sign up with your email and password
2. Upload your resume for analysis
3. View job recommendations and apply to matching positions
4. Use the interview preparation module for practice

### HR Role
1. Sign up with the HR code provided by TPO
2. View and manage applications for your company's positions
3. Update application statuses and access candidate resumes

### TPO Role
1. Sign up as TPO
2. Add new companies and generate HR codes
3. Monitor placement activities and manage job listings

## Contributing
1. Fork the repository
2. Create a new branch for your feature
3. Submit a pull request with a clear description of changes

## License
This project is licensed under the MIT License - see the LICENSE file for details.

## Support
For support and queries, please create an issue in the repository or contact the development team.