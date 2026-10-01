#!/bin/bash

echo "🔍 Verifying DeepEval Dashboard Setup..."
echo ""

# Check Python
echo "1️⃣  Checking Python 3..."
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version 2>&1 | awk '{print $2}')
    echo "   ✅ Python 3 found: $PYTHON_VERSION"
else
    echo "   ❌ Python 3 not found. Install it first."
    exit 1
fi

# Check DeepEval
echo "2️⃣  Checking DeepEval..."
if python3 -c "from deepeval.metrics import AnswerRelevancyMetric" 2>/dev/null; then
    DEEPEVAL_VERSION=$(python3 -c "import deepeval; print(deepeval.__version__)" 2>/dev/null)
    echo "   ✅ DeepEval found: $DEEPEVAL_VERSION"
else
    echo "   ⚠️  DeepEval not installed"
    echo "   Run: pip install -r requirements.txt"
fi

# Check Node.js
echo "3️⃣  Checking Node.js..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo "   ✅ Node.js found: $NODE_VERSION"
else
    echo "   ❌ Node.js not found"
    exit 1
fi

# Check npm dependencies
echo "4️⃣  Checking npm dependencies..."
if [ -d "node_modules" ]; then
    echo "   ✅ node_modules found"
else
    echo "   ⚠️  node_modules not found"
    echo "   Run: npm install"
fi

# Check files
echo "5️⃣  Checking required files..."
files=("server.js" "public/index.html" "public/deepeval.html" "evaluate_responses.py")
all_exist=true
for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "   ✅ $file"
    else
        echo "   ❌ $file missing"
        all_exist=false
    fi
done

echo ""
echo "📝 Environment variables (.env):"
if [ -f ".env" ]; then
    echo "   ✅ .env file exists"
    if grep -q "TEXT_MODEL_API_KEY" .env; then
        echo "   ✅ TEXT_MODEL_API_KEY configured"
    else
        echo "   ⚠️  TEXT_MODEL_API_KEY missing"
    fi
else
    echo "   ⚠️  .env file not found"
    echo "   Create .env with: TEXT_MODEL_API_KEY, TEXT_MODEL_BASE_URL, TEXT_MODEL"
fi

echo ""
echo "🚀 Ready to start server:"
echo "   npm start"
