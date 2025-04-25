# GENPMS Project Directory Structure

## Root Directory
```
PMS/
├── .gitattributes
├── CHANGELOG.md
├── README.md
├── Report.txt
├── bash.exe.stackdump
│
├── backend/
│   ├── .env
│   ├── app.py
│   └── knowledge_base/
│       ├── campany_info.json
│       └── faq.txt
│
├── frontend/
│   ├── .gitignore
│   ├── README.md
│   ├── eslint.config.js
│   ├── index.html
│   ├── package-lock.json
│   ├── package.json
│   ├── postcss.config.js
│   ├── tailwind.config.js
│   ├── tsconfig.app.json
│   ├── tsconfig.json
│   ├── tsconfig.node.json
│   ├── vite.config.ts
│   ├── public/
│   │   └── vite.svg
│   └── src/
│       ├── App.css
│       ├── App.tsx
│       ├── assets/
│       ├── components/
│       ├── context/
│       ├── index.css
│       ├── main.tsx
│       ├── pages/
│       └── vite-env.d.ts
│
└── root/
    └── config/
```

## Directory Overview

### Backend
Contains the Flask backend application with:
- Main application file (app.py)
- Environment configuration (.env)
- Knowledge base for company information and FAQs

### Frontend
React-based frontend application with:
- TypeScript configuration files
- Vite build setup
- Source code organization (components, pages, context)
- Styling with Tailwind CSS

### Configuration
- Root level configuration in root/config/
- Environment-specific settings
- Version control configuration (.gitattributes)