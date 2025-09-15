const axios = require('axios');

class QuestionGeneratorService {
  constructor() {
    this.ollamaUrl = 'http://localhost:11434';
    this.defaultModel = 'llama3.1:8b';
  }

  // Check if Ollama is running
  async isOllamaRunning() {
    try {
      const response = await axios.get(`${this.ollamaUrl}/api/version`);
      return response.status === 200;
    } catch (error) {
      console.log('Ollama not running or not installed');
      return false;
    }
  }

  // Generate questions using Ollama
  async generateQuestions(grade, subject, difficulty = 'beginner', count = 5) {
    try {
      const isRunning = await this.isOllamaRunning();
      if (!isRunning) {
        throw new Error('Ollama is not running. Please start Ollama service.');
      }

      const prompt = this.buildPrompt(grade, subject, difficulty, count);
      
      const response = await axios.post(`${this.ollamaUrl}/api/generate`, {
        model: this.defaultModel,
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.7,
          top_p: 0.9,
          max_tokens: 2000
        }
      });

      const generatedText = response.data.response;
      return this.parseQuestions(generatedText);
    } catch (error) {
      console.error('Question generation error:', error.message);
      // Fallback to sample questions if Ollama fails
      return this.getFallbackQuestions(grade, subject, difficulty, count);
    }
  }

  // Build optimized prompt for educational questions
  buildPrompt(grade, subject, difficulty, count) {
    const difficultyMap = {
      beginner: 'easy, basic concepts',
      advanced: 'intermediate, application-based',
      expert: 'challenging, critical thinking'
    };

    const gradeContext = this.getGradeContext(grade);
    const subjectContext = this.getSubjectContext(subject, grade);

    return `Generate ${count} educational multiple-choice questions for Grade ${grade} ${subject}.

REQUIREMENTS:
- Difficulty level: ${difficultyMap[difficulty]}
- Age-appropriate for ${gradeContext}
- ${subjectContext}
- Each question must have exactly 4 options (A, B, C, D)
- Only one correct answer per question
- Questions should be engaging and clear

FORMAT (JSON):
{
  "questions": [
    {
      "questionText": "What is 2 + 2?",
      "answers": [
        {"text": "3", "isCorrect": false},
        {"text": "4", "isCorrect": true},
        {"text": "5", "isCorrect": false},
        {"text": "6", "isCorrect": false}
      ],
      "difficulty": "${difficulty}",
      "explanation": "Brief explanation of the correct answer"
    }
  ]
}

Generate exactly ${count} questions in valid JSON format:`;
  }

  // Get grade-appropriate context
  getGradeContext(grade) {
    const contexts = {
      'K': 'kindergarten students (5-6 years old)',
      '1': 'first grade students (6-7 years old)',
      '2': 'second grade students (7-8 years old)',
      '3': 'third grade students (8-9 years old)',
      '4': 'fourth grade students (9-10 years old)',
      '5': 'fifth grade students (10-11 years old)',
      '6': 'sixth grade students (11-12 years old)',
      '7': 'seventh grade students (12-13 years old)',
      '8': 'eighth grade students (13-14 years old)'
    };
    return contexts[grade] || 'elementary students';
  }

  // Get subject-specific context
  getSubjectContext(subject, grade) {
    const contexts = {
      'Math': `Focus on ${grade === 'K' ? 'counting and basic numbers' : 
               ['1', '2'].includes(grade) ? 'addition, subtraction, and place value' :
               ['3', '4'].includes(grade) ? 'multiplication, division, and fractions' :
               ['5', '6'].includes(grade) ? 'decimals, percentages, and geometry' :
               'algebra, advanced geometry, and problem solving'}`,
      'Science': `Focus on ${['K', '1', '2'].includes(grade) ? 'basic nature observations and simple experiments' :
                  ['3', '4', '5'].includes(grade) ? 'plants, animals, weather, and simple physics' :
                  'earth science, biology basics, and scientific method'}`,
      'English': `Focus on ${['K', '1'].includes(grade) ? 'phonics, sight words, and simple sentences' :
                  ['2', '3'].includes(grade) ? 'reading comprehension and basic grammar' :
                  ['4', '5'].includes(grade) ? 'vocabulary, writing skills, and literature' :
                  'advanced grammar, essay writing, and literary analysis'}`,
      'History': `Focus on ${['K', '1', '2'].includes(grade) ? 'family history and community helpers' :
                  ['3', '4'].includes(grade) ? 'local history and basic American history' :
                  'world history, government, and historical thinking skills'}`,
      'Art': 'colors, shapes, famous artists, and creative expression',
      'Music': 'rhythm, instruments, famous composers, and basic music theory',
      'PE': 'body movement, sports rules, healthy habits, and teamwork'
    };
    return contexts[subject] || 'grade-appropriate content';
  }

  // Parse AI-generated questions
  parseQuestions(text) {
    try {
      // Try to extract JSON from the response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.questions && Array.isArray(parsed.questions)) {
          return parsed.questions.map(q => ({
            questionText: q.questionText,
            answers: q.answers.map(a => ({
              text: a.text,
              isCorrect: a.isCorrect
            })),
            difficulty: q.difficulty,
            explanation: q.explanation || '',
            generatedByAI: true
          }));
        }
      }
      
      // If JSON parsing fails, try to extract questions manually
      return this.parseQuestionsManually(text);
    } catch (error) {
      console.error('Question parsing error:', error);
      throw new Error('Failed to parse generated questions');
    }
  }

  // Manual parsing fallback
  parseQuestionsManually(text) {
    const questions = [];
    const lines = text.split('\n').filter(line => line.trim());
    
    let currentQuestion = null;
    let currentAnswers = [];
    
    for (const line of lines) {
      if (line.match(/^\d+\./)) {
        // Save previous question
        if (currentQuestion && currentAnswers.length >= 2) {
          questions.push({
            questionText: currentQuestion,
            answers: currentAnswers,
            difficulty: 'beginner',
            generatedByAI: true
          });
        }
        
        // Start new question
        currentQuestion = line.replace(/^\d+\.\s*/, '').trim();
        currentAnswers = [];
      } else if (line.match(/^[A-D]\)/)) {
        const text = line.replace(/^[A-D]\)\s*/, '').trim();
        const isCorrect = line.includes('*') || line.includes('✓');
        currentAnswers.push({ text: text.replace(/[*✓]/g, '').trim(), isCorrect });
      }
    }
    
    // Save last question
    if (currentQuestion && currentAnswers.length >= 2) {
      questions.push({
        questionText: currentQuestion,
        answers: currentAnswers,
        difficulty: 'beginner',
        generatedByAI: true
      });
    }
    
    return questions;
  }

  // Fallback questions when Ollama is not available
  getFallbackQuestions(grade, subject, difficulty, count) {
    const fallbackQuestions = {
      'Math': {
        'K': [
          {
            questionText: "How many fingers do you have on one hand?",
            answers: [
              { text: "4", isCorrect: false },
              { text: "5", isCorrect: true },
              { text: "6", isCorrect: false },
              { text: "10", isCorrect: false }
            ]
          }
        ],
        '1': [
          {
            questionText: "What is 3 + 2?",
            answers: [
              { text: "4", isCorrect: false },
              { text: "5", isCorrect: true },
              { text: "6", isCorrect: false },
              { text: "7", isCorrect: false }
            ]
          }
        ]
      },
      'Science': {
        'K': [
          {
            questionText: "What do plants need to grow?",
            answers: [
              { text: "Only water", isCorrect: false },
              { text: "Water and sunlight", isCorrect: true },
              { text: "Only soil", isCorrect: false },
              { text: "Only air", isCorrect: false }
            ]
          }
        ]
      }
    };

    const subjectQuestions = fallbackQuestions[subject]?.[grade] || [];
    const selectedQuestions = subjectQuestions.slice(0, count);
    
    // Fill remaining with generic questions if needed
    while (selectedQuestions.length < count) {
      selectedQuestions.push({
        questionText: `Sample ${subject} question for Grade ${grade}`,
        answers: [
          { text: "Option A", isCorrect: false },
          { text: "Option B", isCorrect: true },
          { text: "Option C", isCorrect: false },
          { text: "Option D", isCorrect: false }
        ],
        difficulty: difficulty,
        generatedByAI: false
      });
    }

    return selectedQuestions;
  }

  // Check model availability
  async getAvailableModels() {
    try {
      const response = await axios.get(`${this.ollamaUrl}/api/tags`);
      return response.data.models || [];
    } catch (error) {
      return [];
    }
  }
}

module.exports = new QuestionGeneratorService();
