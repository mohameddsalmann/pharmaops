import json
import os

def load_shared_test_vectors():
    """Load the language-neutral hmac-test-vectors.json file from the repository root."""
    current_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Try resolving path relative to this SDK directory
    possible_paths = [
        # Up to project root -> tests/fixtures
        os.path.join(current_dir, "..", "..", "..", "tests", "fixtures", "hmac-test-vectors.json"),
        # Relative to execution context root
        os.path.join(os.getcwd(), "tests", "fixtures", "hmac-test-vectors.json"),
        # Relative to SDK integrations folder
        os.path.join(current_dir, "..", "tests", "fixtures", "hmac-test-vectors.json"),
    ]
    
    for path in possible_paths:
        abs_path = os.path.abspath(path)
        if os.path.exists(abs_path):
            with open(abs_path, "r", encoding="utf-8") as f:
                return json.load(f)
                
    raise FileNotFoundError(f"Shared test vectors JSON file not found in possible paths: {possible_paths}")
