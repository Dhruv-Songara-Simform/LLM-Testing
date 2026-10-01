# 🎉 Complete Feature Overview

## 🚀 What You've Got

You now have a complete **AI Chatbot & Evaluation Platform** with:

### ✨ Chatbot Application
- **Interactive Chat UI**: Beautiful, modern interface for real-time conversations
- **System Prompts**: Customize AI behavior with context-aware instructions
- **Conversation Memory**: Maintains chat history within a session
- **Real-time Responses**: Instant feedback from DeepSeek API
- **Error Handling**: User-friendly error messages and status indicators
- **Responsive Design**: Works perfectly on desktop, tablet, and mobile

### 📊 DeepEval Dashboard
- **API Evaluation**: Test any chat API endpoint
- **Batch Testing**: Run multiple prompts in a single evaluation
- **Performance Metrics**: Track response times and performance
- **Detailed Analytics**: View min/max/average response times
- **Conversation Artifacts**: Store all evaluation results as JSON
- **Artifact Management**: Download, view, and organize past evaluations
- **Visual Dashboard**: Interactive tabs for conversation, analysis, and artifacts

---

## 📁 File Structure

```
Chatbot testing/
│
├── server.js                 # Express.js backend server
│   ├── /api/chat            # Main chatbot API endpoint
│   ├── /api/deepeval        # DeepEval evaluation endpoint
│   ├── /api/artifacts       # List all artifacts
│   ├── /api/artifacts/:id   # Get specific artifact
│   └── /api/health          # Health check
│
├── public/
│   ├── index.html           # Chatbot UI (SimChat)
│   │   ├── Chat interface
│   │   ├── System prompt input
│   │   ├── Message history
│   │   └── Navigation to DeepEval
│   │
│   └── deepeval.html        # DeepEval Dashboard
│       ├── Configuration panel
│       ├── Test prompts manager
│       ├── Metrics display
│       ├── Conversation viewer
│       ├── Analytics tab
│       └── Artifacts tab
│
├── artifacts/               # Stored evaluation results
│   ├── eval_[uuid].json
│   ├── eval_[uuid].json
│   └── ...
│
├── .env                     # Environment variables (API credentials)
├── package.json             # Node dependencies
├── package-lock.json        # Dependency lock
├── README.md                # Full documentation
├── QUICKSTART.md            # Quick start guide
└── FEATURES.md              # This file
```

---

## 🎯 Features in Detail

### Chatbot Features

#### 1. **Real-time Conversation**
- Type messages and get instant AI responses
- Maintains conversation context across multiple messages
- Smooth animations and transitions

#### 2. **System Prompt Customization**
- Add context instructions before starting chat
- Example: "You are a Python expert" or "Answer in French"
- Changes AI behavior for the entire session

#### 3. **Connection Status**
- Real-time connection indicator
- Shows "Connected" or "Connection Error" with visual feedback
- Health check on page load

#### 4. **Clear Chat**
- Start a fresh conversation anytime
- Confirmation dialog to prevent accidental clearing
- Resets system prompt if desired

---

### DeepEval Dashboard Features

#### 1. **Configuration**
- **API Endpoint Input**: Paste any chat API endpoint
- **System Prompt**: Optional context for evaluation
- **Number of Tests**: Control how many prompts to run (1-20)
- **Run Button**: Start evaluation with one click

#### 2. **Test Prompt Management**
- **Default Prompts**: 5 pre-built test prompts
  - What is the capital of France?
  - Explain machine learning in simple terms
  - How do you make a cup of tea?
  - What are the benefits of exercise?
  - Tell me a short story

- **Custom Prompts**: Add your own test questions
- **Remove Prompts**: Delete individual prompts
- **Visual Display**: See all active prompts at a glance

#### 3. **Metrics Display**
Real-time metrics shown after evaluation:
- **Total Messages**: Number of Q&A exchanges
- **Avg Response Time**: Average response time in milliseconds
- **Number of Prompts**: Total test prompts used
- **Evaluation Date**: When the test ran

#### 4. **Conversation Tab**
- **Table View**: All prompts and responses in a clear table
- **Prompt Column**: Highlighted test questions
- **Response Column**: Full AI responses with formatting
- **Scrollable**: View long conversations easily

#### 5. **Analysis Tab**
- **Detailed Metrics**:
  - Total Messages
  - Average Response Time
  - Min Response Time (fastest)
  - Max Response Time (slowest)
  - Number of Prompts
  - Evaluation Timestamp
  - API Endpoint tested

#### 6. **Artifacts Tab**
- **Historical Artifacts**: View all past evaluations
- **Artifact Details**:
  - Unique ID
  - Creation date/time
  - Message count
  - Average response time
  - Number of prompts
- **Download**: Download evaluation as JSON
- **Quick View**: Click to view full details

---

## 🔌 API Endpoints

### Chat API
```
POST /api/chat
- Messages (array of message objects)
- System Prompt (optional)
Response: { message: string }
```

### Health Check
```
GET /api/health
Response: { status: "OK", model: "deepseek-chat" }
```

### DeepEval API
```
POST /api/deepeval
- apiEndpoint (required)
- testPrompts (array)
- evaluationCriteria (object)
Response: { success, conversationId, metrics, artifactPath }
```

### Artifacts API
```
GET /api/artifacts
Response: Array of artifact metadata

GET /api/artifacts/:id
Response: Full artifact with conversations and metrics
```

---

## 💾 Data Storage

### Artifact Structure
```json
{
  "conversationId": "unique-uuid",
  "conversations": [
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." }
  ],
  "metrics": {
    "totalMessages": 10,
    "averageResponseTime": 1250,
    "responseTimes": [1000, 1250, 1500],
    "prompts": ["prompt1", "prompt2"],
    "responses": ["response1", "response2"],
    "timestamp": "2026-09-25T12:00:00Z",
    "apiEndpoint": "http://localhost:3000/api/chat"
  },
  "createdAt": "2026-09-25T12:00:00.000Z"
}
```

---

## 🎨 UI/UX Features

### Design Elements
- **Gradient Color Scheme**: Purple/blue gradients throughout
- **Smooth Animations**: Slide-in effects for messages
- **Responsive Grids**: Auto-adjusting layouts
- **Tab Interface**: Easy navigation between sections
- **Status Indicators**: Visual feedback for all operations
- **Loading States**: Spinner animation during processing

### Accessibility
- Clear labels on all inputs
- High contrast colors
- Keyboard navigation support
- Mobile-friendly responsive design
- Error messages with clear explanations

---

## 🚀 Getting Started

### Installation (One-time)
```bash
cd "/home/dhruv.songara@simform.dom/Chatbot testing"
npm install
```

### Running the Server
```bash
# Development mode (with auto-restart)
npm run dev

# Production mode
npm start
```

### Accessing the Apps
- **Chatbot**: http://localhost:3000
- **DeepEval**: http://localhost:3000/deepeval.html

---

## 📊 Example Workflow

### Using the Chatbot
1. Open http://localhost:3000
2. Optionally set a system prompt
3. Type your message
4. Receive instant AI response
5. Continue conversation with context memory

### Using DeepEval
1. Open http://localhost:3000/deepeval.html
2. Enter API endpoint (default: http://localhost:3000/api/chat)
3. (Optional) Add system prompt
4. Add custom test prompts
5. Click "Run DeepEval"
6. Watch metrics populate
7. View conversation in table
8. Check analysis for detailed metrics
9. Download evaluation artifact

---

## 🔐 Security

- **Server-side API Keys**: Never exposed to frontend
- **CORS Enabled**: Allows cross-origin requests
- **Input Validation**: Checks all user inputs
- **Error Handling**: Graceful error messages
- **No Sensitive Data**: Conversation content stored securely

---

## 🛠️ Tech Stack

- **Backend**: Node.js + Express.js
- **Frontend**: HTML5 + CSS3 + Vanilla JavaScript
- **API Client**: Axios
- **Environment**: dotenv
- **UUID Generation**: uuid library
- **File Storage**: Node.js fs module

---

## 📝 Configuration

Edit `.env` to customize:
```
TEXT_MODEL_API_KEY=your-key
TEXT_MODEL_BASE_URL=https://api.deepseek.com/v1
TEXT_MODEL=deepseek-chat
PORT=3000
```

---

## 🎓 Use Cases

### For Developers
- Test chat API performance
- Evaluate response quality
- Monitor response times
- Track conversation metrics
- Store evaluation history

### For QA Teams
- Batch test multiple scenarios
- Compare API endpoints
- Track performance over time
- Document evaluation results
- Generate performance reports

### For Researchers
- Collect conversation data
- Analyze AI behavior
- Evaluate system prompts
- Study response patterns
- Export data for analysis

---

## 📚 Documentation

- **README.md**: Full API documentation
- **QUICKSTART.md**: Get started in 2 minutes
- **FEATURES.md**: This file - complete feature overview

---

## ✅ Ready to Use!

Everything is configured and ready to run. Your API credentials are already in `.env`.

**Start now:**
```bash
cd "/home/dhruv.songara@simform.dom/Chatbot testing"
npm start
```

Then visit:
- 💬 **Chatbot**: http://localhost:3000
- 📊 **DeepEval**: http://localhost:3000/deepeval.html

Happy chatting! 🚀
