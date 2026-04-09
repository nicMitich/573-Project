from flask import Flask, request, jsonify
from flask_cors import CORS
import tempfile, os
from dotenv import load_dotenv
from resume_parser import parse_resume
from neo4j import GraphDatabase
from langgraph_agent import run_agent

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)
# Configure CORS from environment variable `CORS_ORIGINS` (comma-separated)
CORS_ORIGINS = os.environ.get('CORS_ORIGINS', '')
if CORS_ORIGINS:
    origins = [o.strip() for o in CORS_ORIGINS.split(',') if o.strip()]
else:
    origins = "*"

# Apply CORS with configured origins; allow credentials for cookies if needed
CORS(app, resources={r"/*": {"origins": origins}}, supports_credentials=True)

# Neo4j connection configuration - uses environment variables for security
NEO4J_URI = os.environ.get('NEO4J_URI')
NEO4J_USER = os.environ.get('NEO4J_USER')
NEO4J_PASSWORD = os.environ.get('NEO4J_PASSWORD')


def get_neo4j_driver():
    """Create and return a Neo4j driver instance"""
    return GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))

@app.route('/')
def index():
    return jsonify({'status': 'resume parser API is running'})


@app.route('/_debug_routes', methods=['GET'])
def debug_routes():
    """Return a JSON list of registered URL rules for debugging."""
    rules = []
    for rule in app.url_map.iter_rules():
        rules.append({'rule': str(rule), 'methods': sorted(list(rule.methods))})
    return jsonify({'routes': rules})

@app.route('/neo4j/connect', methods=['GET'])
def test_neo4j_connection():
    """Test Neo4j connection and return basic info"""
    try:
        driver = get_neo4j_driver()
        with driver.session() as session:
            result = session.run("RETURN 1 AS connected")
            connected = result.single()["connected"] == 1
        driver.close()
        return jsonify({'status': 'connected', 'connected': connected})
    except Exception as e:
        return jsonify({'status': 'error', 'error': str(e)}), 500

@app.route('/neo4j/schema', methods=['GET'])
def get_schema():
    """Get the database schema: node labels, relationship types, and properties"""
    try:
        driver = get_neo4j_driver()
        schema_info = {
            'node_labels': [],
            'relationship_types': [],
            'node_properties': {},
            'relationship_properties': {}
        }

        with driver.session() as session:
            # Get all node labels
            labels_result = session.run("CALL db.labels()")
            schema_info['node_labels'] = [record["label"] for record in labels_result]

            # Get all relationship types
            rels_result = session.run("CALL db.relationshipTypes()")
            schema_info['relationship_types'] = [record["relationshipType"] for record in rels_result]

            # Get properties for each node label
            for label in schema_info['node_labels']:
                props_query = f"""
                CALL db.schema.nodeTypeProperties()
                YIELD nodeType, propertyName
                WHERE nodeType = '{label}'
                RETURN DISTINCT propertyName
                """
                props_result = session.run(props_query)
                schema_info['node_properties'][label] = [record["propertyName"] for record in props_result]

            # Get properties for each relationship type
            for rel_type in schema_info['relationship_types']:
                props_query = f"""
                CALL db.schema.relTypeProperties()
                YIELD relType, propertyName
                WHERE relType = '{rel_type}'
                RETURN DISTINCT propertyName
                """
                props_result = session.run(props_query)
                schema_info['relationship_properties'][rel_type] = [record["propertyName"] for record in props_result]

        driver.close()
        return jsonify(schema_info)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/neo4j/sample-data', methods=['GET'])
def get_sample_data():
    """Get sample nodes and relationships from each label"""
    try:
        driver = get_neo4j_driver()
        sample_data = {}

        with driver.session() as session:
            # Get sample nodes for each label (limit 5)
            labels_result = session.run("CALL db.labels()")
            labels = [record["label"] for record in labels_result]

            for label in labels:
                sample_query = f"MATCH (n:{label}) RETURN n LIMIT 5"
                result = session.run(sample_query)
                samples = []
                for record in result:
                    node = record["n"]
                    samples.append(dict(node))
                sample_data[label] = samples

            # Get sample relationships (limit 10)
            rel_query = "MATCH (a)-[r]->(b) RETURN a, type(r) as rel_type, b LIMIT 10"
            rel_result = session.run(rel_query)
            relationships = []
            for record in rel_result:
                relationships.append({
                    'from': dict(record["a"]),
                    'relationship': record["rel_type"],
                    'to': dict(record["b"])
                })
            sample_data['relationships'] = relationships

        driver.close()
        return jsonify(sample_data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

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


@app.route('/chat', methods=['POST', 'OPTIONS'])
def chat():
    if request.method == 'OPTIONS':
        return '', 200
    try:
        data = request.get_json()
        if not data or 'message' not in data:
            return jsonify({'error': 'Missing message'}), 400
        response = run_agent(
            user_message=data['message'],
            conversation_history=data.get('history', []),
            openrouter_key=data.get('openrouter_key'),
            resume_context=data.get('resume_context'),
        )
        return jsonify({'response': response, 'status': 'success'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route("/health", methods=["GET"])
def health():
    return {"status": "ok"}


if __name__ == '__main__':
    app.run(debug=False, host='0.0.0.0', port=int(os.environ.get('PORT', 5000)))
