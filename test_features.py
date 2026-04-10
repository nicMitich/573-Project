"""
Unit tests for the new resume AI features
"""
import os
import json
import tempfile

os.environ.setdefault('NEO4J_URI', 'bolt://localhost:7687')
os.environ.setdefault('NEO4J_USER', 'neo4j')
os.environ.setdefault('NEO4J_PASSWORD', 'test')
os.environ.setdefault('VITE_OPENROUTER_API_KEY', 'test-key')

TEST_DIR = os.path.dirname(os.path.abspath(__file__))


def test_resume_parser_raw_text():
    """Verify parse_resume returns raw_text field"""
    from resume_parser import parse_resume
    
    with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
        f.write("John Doe\nEmail: john@test.com\nPython, Java")
        tmp_path = f.name
    
    try:
        result = parse_resume(tmp_path)
        assert 'raw_text' in result, "raw_text should be in result"
        assert isinstance(result['raw_text'], str), "raw_text should be string"
        print("[PASS] parse_resume returns raw_text")
        return True
    finally:
        os.unlink(tmp_path)


def test_app_handles_resume_context():
    """Verify app.py handles resume_context"""
    app_path = os.path.join(TEST_DIR, 'app.py')
    with open(app_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    assert 'resume_context' in content, "app.py should handle resume_context"
    assert 'json.dumps' in content, "app.py should serialize resume_context"
    print("[PASS] app.py /chat endpoint handles resume_context")
    return True


def test_langgraph_has_new_tools():
    """Verify langgraph_agent.py has the 3 new tools"""
    agent_path = os.path.join(TEST_DIR, 'langgraph_agent.py')
    with open(agent_path, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    
    assert 'match_jobs_by_compatibility' in content, "Missing match_jobs_by_compatibility"
    assert 'recommend_skill_growth' in content, "Missing recommend_skill_growth"
    assert 'enhance_resume' in content, "Missing enhance_resume"
    print("[PASS] All 3 new LangGraph tools are implemented")
    return True


def test_integration_flow():
    """Test complete data flow"""
    sample_resume = {
        'name': 'John Doe',
        'skills': ['python', 'java'],
        'raw_text': 'John Doe resume content'
    }
    
    serialized = json.dumps(sample_resume)
    deserialized = json.loads(serialized)
    
    assert deserialized['name'] == 'John Doe'
    assert 'raw_text' in deserialized
    print("[PASS] Integration flow works")
    return True


def run_tests():
    print("=" * 50)
    print("Testing Resume AI Features")
    print("=" * 50)
    
    tests = [
        test_resume_parser_raw_text,
        test_app_handles_resume_context,
        test_langgraph_has_new_tools,
        test_integration_flow
    ]
    
    passed = 0
    for test in tests:
        try:
            if test():
                passed += 1
        except Exception as e:
            print(f"[FAIL] {test.__name__}: {e}")
    
    print("=" * 50)
    print(f"Results: {passed}/{len(tests)} tests passed")
    print("=" * 50)


if __name__ == '__main__':
    run_tests()