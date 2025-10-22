#!/usr/bin/env python3
"""
Quick Test - ODRL Demo Setup
Tests: Connection → LLMFactory → TextParser
Works with all deployment modes: FITS, Local, Cloud
"""
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__)))

from dotenv import load_dotenv
load_dotenv()

print("🧪 ODRL Demo - Quick Test\n")
print("=" * 60)

# Test 1: Environment Variables
print("\n1️⃣ Environment Variables:")
deployment_mode = os.getenv('DEPLOYMENT_MODE', 'local')
print(f"   DEPLOYMENT_MODE: {deployment_mode}")
print(f"   DEFAULT_MODEL: {os.getenv('DEFAULT_MODEL', 'llama3.1:8b')}")
print(f"   MAX_TOKENS: {os.getenv('MAX_TOKENS', '4096')}")

# Show mode-specific settings
if deployment_mode == 'fits_server':
    print(f"   FITS_SERVER_URL: {os.getenv('FITS_SERVER_URL', '❌ NOT SET')}")
    print(f"   FITS_API_KEY: {'✅ SET' if os.getenv('FITS_API_KEY') else '❌ NOT SET'}")
elif deployment_mode == 'local':
    print(f"   LOCAL_OLLAMA_URL: {os.getenv('LOCAL_OLLAMA_URL', 'http://localhost:11434/v1')}")
elif deployment_mode == 'cloud':
    if os.getenv('GROQ_API_KEY'):
        print(f"   GROQ_API_KEY: ✅ SET")
    if os.getenv('OPENAI_API_KEY'):
        print(f"   OPENAI_API_KEY: ✅ SET")
    if os.getenv('ANTHROPIC_API_KEY'):
        print(f"   ANTHROPIC_API_KEY: ✅ SET")

# Test 2: Connection Test
print("\n2️⃣ Connection Test:")
try:
    import requests
    
    if deployment_mode == 'fits_server':
        fits_url = os.getenv('FITS_SERVER_URL', '')
        if not fits_url:
            print("   ❌ FITS_SERVER_URL not set")
            sys.exit(1)
        
        base_url = fits_url.replace('/v1', '')
        print(f"   Testing FITS Server: {base_url}")
        
        try:
            response = requests.get(f"{base_url}/api/tags", timeout=5)
            
            if response.status_code == 200:
                models = response.json().get('models', [])
                print(f"   ✅ FITS Server connected ({len(models)} models)")
                for m in models[:3]:
                    model_name = m.get('name', m) if isinstance(m, dict) else m
                    print(f"      - {model_name}")
            else:
                print(f"   ⚠️  FITS Server responded with: {response.status_code}")
        except Exception as e:
            print(f"   ⚠️  Could not get model list: {e}")
            print(f"   ℹ️  Continuing anyway (FITS might not have /api/tags endpoint)")
    
    elif deployment_mode == 'local':
        local_url = os.getenv('LOCAL_OLLAMA_URL', 'http://localhost:11434')
        base_url = local_url.replace('/v1', '')
        print(f"   Testing Local Ollama: {base_url}")
        
        response = requests.get(f"{base_url}/api/tags", timeout=3)
        
        if response.status_code == 200:
            models = response.json().get('models', [])
            print(f"   ✅ Ollama running ({len(models)} models)")
            for m in models[:3]:
                print(f"      - {m['name']}")
        else:
            print(f"   ❌ Ollama error: {response.status_code}")
            print("   💡 Start Ollama: ollama serve")
            sys.exit(1)
    
    elif deployment_mode == 'cloud':
        print(f"   ℹ️  Cloud mode - skipping connection test")
        print(f"   ✅ Will connect to cloud API when making requests")
    
    else:
        print(f"   ⚠️  Unknown deployment mode: {deployment_mode}")
        
except Exception as e:
    if deployment_mode != 'cloud':
        print(f"   ❌ Connection test failed: {e}")
        if deployment_mode == 'fits_server':
            print("   💡 Check your FITS_SERVER_URL in .env")
        elif deployment_mode == 'local':
            print("   💡 Make sure Ollama is running: ollama serve")
        print("   ℹ️  Continuing anyway - will test LLM connection next")

# Test 3: LLMFactory
print("\n3️⃣ LLMFactory:")
try:
    from utils.llm_factory import LLMFactory
    
    # Get deployment info
    info = LLMFactory.get_deployment_info()
    print(f"   Mode: {info['deployment_mode']}")
    print(f"   Default Model: {info['default_model']}")
    print(f"   Max Tokens: {info['max_tokens']}")
    print(f"   Available Providers: {LLMFactory.get_available_providers()}")
    
    # Try creating an LLM (use deployment mode defaults)
    print(f"\n   Testing LLM connection...")
    llm = LLMFactory.create_llm(
        model=None,  # Use default from .env
        temperature=0.3,
        max_tokens=50
    )
    
    result = llm.invoke("Say 'Test OK' in 3 words.")
    
    print(f"   ✅ LLMFactory working!")
    print(f"   💬 Response: {result.content[:50]}")
    
except Exception as e:
    print(f"   ❌ Error: {e}")
    print("\n   💡 Troubleshooting:")
    if deployment_mode == 'fits_server':
        print("   - Check FITS_SERVER_URL is correct")
        print("   - Verify FITS server is accessible")
    elif deployment_mode == 'local':
        print("   - Make sure Ollama is running: ollama serve")
        print("   - Check if model exists: ollama list")
        print("   - Download model: ollama pull llama3.1:8b")
    elif deployment_mode == 'cloud':
        print("   - Verify your API key is set correctly")
        print("   - Check your internet connection")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# Test 4: TextParser Agent
print("\n4️⃣ TextParser Agent:")
try:
    from agents.text_parser.parser import TextParser
    
    # CRITICAL: Don't force a provider, let it use deployment mode
    print(f"   Creating TextParser (using {deployment_mode} mode)...")
    parser = TextParser(
        model=None,  # Use deployment mode default
        temperature=0.3
    )
    
    print(f"   Parsing test policy...")
    result = parser.parse("Users can read but cannot modify the document.")
    
    if result:
        print(f"   ✅ TextParser working!")
        print(f"   📊 Permissions: {len(result.get('permissions', []))}")
        print(f"   📊 Prohibitions: {len(result.get('prohibitions', []))}")
        
        if result.get('permissions'):
            perm = result['permissions'][0]
            action = perm.get('action', 'N/A') if isinstance(perm, dict) else 'N/A'
            print(f"   📝 First permission: {action}")
        
        if result.get('prohibitions'):
            prob = result['prohibitions'][0]
            action = prob.get('action', 'N/A') if isinstance(prob, dict) else 'N/A'
            print(f"   📝 First prohibition: {action}")
    else:
        print("   ⚠️  Parser returned empty result")
        
except Exception as e:
    print(f"   ❌ Error: {e}")
    print("\n   💡 This might be a model/prompt issue. Try:")
    print("   - Using a different model")
    print("   - Adjusting the temperature")
    print("   - Checking if the model supports structured output")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# Success!
print("\n" + "=" * 60)
print("✅ ALL TESTS PASSED!")
print("\n💡 Next steps:")
print("   1. Start backend: uvicorn api.main:app --reload")
print("   2. Open GUI in browser")
print("   3. Test the full pipeline")
print("\n📋 Your Configuration:")
print(f"   Deployment Mode: {deployment_mode}")
print(f"   Default Model: {os.getenv('DEFAULT_MODEL', 'llama3.1:8b')}")

if deployment_mode == 'fits_server':
    print(f"   FITS Server: {os.getenv('FITS_SERVER_URL')}")
elif deployment_mode == 'local':
    print(f"   Local Ollama: {os.getenv('LOCAL_OLLAMA_URL', 'http://localhost:11434/v1')}")
elif deployment_mode == 'cloud':
    providers = []
    if os.getenv('GROQ_API_KEY'):
        providers.append('Groq')
    if os.getenv('OPENAI_API_KEY'):
        providers.append('OpenAI')
    if os.getenv('ANTHROPIC_API_KEY'):
        providers.append('Anthropic')
    print(f"   Cloud Providers: {', '.join(providers)}")

print("\n" + "=" * 60)