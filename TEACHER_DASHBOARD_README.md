# Teacher Dashboard with AI Question Generation

## 🎯 What We've Built

### ✅ Complete Teacher Dashboard
- **Overview Section**: Statistics, quick actions, teaching assignments
- **Question Bank**: View, create, edit, and delete questions
- **AI Integration**: Automatic question generation using Ollama
- **Role-based Access**: Teachers can only access their assigned grades/subjects

### ✅ Backend Features
- **Question Model**: Complete database schema for educational questions
- **Question Generator Service**: AI-powered question creation with fallbacks
- **REST API**: Full CRUD operations for question management
- **Security**: Role-based permissions and validation

### ✅ Frontend Features
- **Modern UI**: Clean, responsive design with animations
- **Real-time Stats**: Question counts, AI status indicators
- **Modal System**: Generate questions or create manually
- **Question Preview**: Visual answer display with correct answers highlighted

## 🚀 How to Install Ollama

### Option 1: Direct Download (Recommended for macOS)
1. Go to https://ollama.com/download
2. Download the macOS installer
3. Install and run Ollama

### Option 2: Using Homebrew
```bash
# If you have Homebrew installed
brew install ollama
```

### Option 3: Manual Installation
```bash
# Download and install
curl -fsSL https://ollama.com/install.sh | sh
```

## 🤖 Setting Up AI Models

### 1. Start Ollama Service
```bash
# Start Ollama (runs in background)
ollama serve
```

### 2. Download Education-Friendly Models
```bash
# Recommended for education (good balance of quality/speed)
ollama pull llama3.1:8b

# Alternative lightweight model
ollama pull phi3:mini

# For better quality (requires more RAM)
ollama pull llama3.1:70b
```

### 3. Test AI Question Generation
```bash
# Test if everything works
curl -X POST http://localhost:11434/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "model": "llama3.1:8b",
    "prompt": "Generate a simple math question for Grade 3",
    "stream": false
  }'
```

## 📚 Usage Instructions

### For Teachers:
1. **Login** with teacher credentials
2. **Navigate** to Teacher Dashboard
3. **Generate Questions**:
   - Click "Generate Questions with AI"
   - Select your assigned grade and subject
   - Choose difficulty level
   - Set number of questions (1-20)
   - Click "Generate"
4. **Manual Creation**:
   - Click "Create Question Manually"
   - Fill in question details
   - Add multiple choice answers
   - Mark correct answer
5. **Manage Questions**:
   - View all your questions
   - Edit or delete as needed
   - See AI vs manually created stats

### For Admins:
- Create teacher accounts with assigned grades and subjects
- Teachers can only generate questions for their assignments
- Monitor question generation statistics

## 🎮 Features Overview

### ✅ AI Question Generation
- **Automatic Generation**: Create 1-20 questions instantly
- **Grade-Appropriate**: Content tailored to specific grade levels
- **Subject-Specific**: Math, Science, English, History, Art, Music, PE
- **Difficulty Levels**: Beginner, Advanced, Expert
- **Fallback System**: Works even when AI is offline

### ✅ Question Management
- **CRUD Operations**: Create, Read, Update, Delete questions
- **Visual Interface**: Clean question cards with answer preview
- **Filtering**: By grade, subject, difficulty
- **Statistics**: Track AI vs manual creation

### ✅ Educational Features
- **Standards-Aligned**: Age-appropriate content for K-8
- **Multiple Choice**: 4-option questions with single correct answer
- **Visual Design**: Color-coded difficulty and correct answers
- **Teacher Assignment**: Questions linked to teacher's subjects/grades

## 🛠️ Technical Stack

### Backend:
- **Node.js + Express**: REST API server
- **MongoDB**: Question and user data storage
- **Joi**: Input validation and sanitization
- **Axios**: HTTP client for Ollama communication
- **JWT**: Secure authentication

### Frontend:
- **React**: Component-based UI
- **Framer Motion**: Smooth animations
- **CSS Grid/Flexbox**: Responsive layouts
- **Modal System**: Interactive question creation

### AI Integration:
- **Ollama**: Local LLM hosting
- **Llama 3.1**: High-quality language model
- **Custom Prompts**: Education-specific question generation
- **Fallback System**: Sample questions when AI unavailable

## 🚀 Next Steps

1. **Install Ollama** following the instructions above
2. **Start the backend** server: `cd backend && npm start`
3. **Start the frontend**: `cd frontend && npm start`
4. **Login as teacher** and test question generation
5. **Create assignments** and distribute to students

## 📝 API Endpoints

```
POST /api/questions/generate     - Generate questions with AI
GET  /api/questions/my-questions - Get teacher's questions
POST /api/questions/create       - Create question manually
PUT  /api/questions/:id          - Update question
DELETE /api/questions/:id        - Delete question
GET  /api/questions/stats        - Get teacher statistics
GET  /api/questions/ai-status    - Check Ollama status
```

The system is now ready for teachers to create engaging, age-appropriate questions for their students using AI assistance!
