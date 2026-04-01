from flask import Flask, request, jsonify
from flask_cors import CORS
import tempfile, os
from resume_parser import parse_resume

app = Flask(__name__)
CORS(app)

@app.route('/')
def index():
    return jsonify({'status': 'resume parser API is running'})
    
@app.route('/parse-resume', methods=['POST'])
def parse():
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400
    file = request.files['file']
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ['.pdf', '.docx', '.txt']:
        return jsonify({'error': 'Unsupported file type. Please upload PDF, DOCX, or TXT.'}), 400
    with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
        file.save(tmp.name)
        tmp_path = tmp.name
    try:
        result = parse_resume(tmp_path)
        return jsonify(result)
    finally:
        os.unlink(tmp_path)

if __name__ == '__main__':
    app.run(debug=False, host='0.0.0.0', port=int(os.environ.get('PORT', 5000)))
