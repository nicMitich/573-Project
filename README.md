# LinkedIn Assistant

A full-stack application for parsing and analyzing resumes using React, Vite, Flask, and spaCy.

## Prerequisites

Before running the project, ensure you have the following installed:

- **Node.js** (v18 or higher) - [Download here](https://nodejs.org/)
- **Python** (v3.9 or higher) - [Download here](https://www.python.org/downloads/)
- **pip** (Python package installer)

## Installation

### 1. Clone and Navigate

```bash
cd linkedin-assistant
```

### 2. Install Frontend Dependencies

```bash
npm install
```

### 3. Install Backend Dependencies

```bash
cd resume-backend
pip install -r requirements.txt
```

**Note**: After installing spaCy, you also need to download the language model:

```bash
python -m spacy download en_core_web_sm
```

### 4. Return to Project Root

```bash
cd ..
```

## Running the Application

From the `linkedin-assistant` directory, run:

```bash
npm run dev
```

This command starts both the frontend (Vite dev server) and backend (Flask server) concurrently.

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000

## Project Structure

```
linkedin-assistant/
├── resume-backend/
│   ├── app.py              # Flask application
│   ├── resume_parser.py    # Resume parsing logic with spaCy
│   └── requirements.txt    # Python dependencies
├── src/
│   ├── pages/              # React page components
│   ├── App.jsx             # Main App component
│   └── main.jsx            # Entry point
├── index.html
├── package.json
├── vite.config.js
└── README.md
```

## Technologies Used

### Frontend
- React 19
- Vite
- JavaScript (ES6+)

### Backend
- Flask
- Flask-CORS
- spaCy (NLP)
- pdfminer.six (PDF text extraction)
- python-docx (DOCX text extraction)

## License

MIT

# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
