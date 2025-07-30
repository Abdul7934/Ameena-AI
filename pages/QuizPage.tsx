import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useUploadedContent } from '../contexts/UploadedContentContext';
import { QuizQuestion, AiGeneratedFeedback, Quiz } from '../types';
import * as geminiService from '../services/geminiService';
import Button from '../components/common/Button';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Alert from '../components/common/Alert';
import { DEFAULT_QUIZ_DURATION_SECONDS, DEFAULT_QUIZ_QUESTIONS_count } from '../constants';
import { CheckCircleIcon, XCircleIcon, SparklesIcon, ChevronLeftIcon, ChevronRightIcon } from '../components/icons/Icons';

const CircularProgress: React.FC<{ percentage: number; size?: number; strokeWidth?: number }> = ({ percentage, size = 120, strokeWidth = 10 }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  let colorClass = 'text-destructive';
  if (percentage >= 70) colorClass = 'text-green-500';
  else if (percentage >= 40) colorClass = 'text-yellow-500';
  
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          className="text-secondary"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <circle
          className={`${colorClass} transition-all duration-1000 ease-in-out`}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
          transform={`rotate(-90 ${size/2} ${size/2})`}
        />
      </svg>
      <span className="absolute text-3xl font-bold text-foreground">{`${Math.round(percentage)}%`}</span>
    </div>
  );
};


const QuizPage: React.FC = () => {
  const { contentId } = useParams<{ contentId: string }>();
  const navigate = useNavigate();
  const { getStudyMaterialById, addQuizResult } = useUploadedContent();

  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(DEFAULT_QUIZ_DURATION_SECONDS);
  const [quizState, setQuizState] = useState<'loading' | 'taking' | 'submitting' | 'results'>('loading');
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState<AiGeneratedFeedback | null>(null);
  const [error, setError] = useState<string | null>(null);

  const timerRef = useRef<number | null>(null);
  const material = contentId ? getStudyMaterialById(contentId) : null;

  const loadQuestions = useCallback(async () => {
    if (!material?.extractedText) {
      setError("Content not found or empty. Cannot generate quiz.");
      setQuizState('results');
      return;
    }
    setQuizState('loading'); setError(null);
    try {
      const generatedQuestions = await geminiService.generateQuizQuestions(material.extractedText, DEFAULT_QUIZ_QUESTIONS_count);
      if (generatedQuestions.length === 0) {
        setError("Could not generate quiz. Content might be too short or AI service unavailable.");
        setQuizState('results');
        return;
      }
      setQuestions(generatedQuestions.map(q => ({...q, id: q.id || `q-${Math.random().toString(36).substr(2, 9)}` })));
      setQuizState('taking');
      setTimeLeft(DEFAULT_QUIZ_DURATION_SECONDS);
    } catch (e) {
      console.error("Error loading quiz questions:", e);
      setError("Failed to load quiz. Check connection or API key.");
      setQuizState('results');
    }
  }, [material?.extractedText]); 

  const handleSubmitQuiz = useCallback(async () => {
    if (quizState === 'submitting' || quizState === 'results') return;

    setQuizState('submitting');
    if (timerRef.current) clearTimeout(timerRef.current);

    let calculatedScore = 0;
    const answeredQuestions = questions.map(q => {
      const userAnswer = userAnswers[q.id];
      const userAnswerProcessed = userAnswer?.trim().toLowerCase();
      let isCorrect = false;

      if (typeof q.correctAnswer === 'string') {
        isCorrect = userAnswerProcessed === q.correctAnswer.trim().toLowerCase();
      }
      if (isCorrect) calculatedScore++;
      return { ...q, userAnswer, isCorrect };
    });
    setQuestions(answeredQuestions);
    setScore(calculatedScore);

    if (contentId) {
      const quizResult: Quiz = {
        id: `quiz_${Date.now()}`, contentId, questions: answeredQuestions,
        score: calculatedScore, timestamp: new Date().toISOString(),
        durationSeconds: DEFAULT_QUIZ_DURATION_SECONDS - timeLeft,
      };
      addQuizResult(contentId, quizResult);
    }
    
    try {
      const generatedFeedback = await geminiService.generateFeedbackOnQuiz(calculatedScore, questions.length, material?.extractedText);
      setFeedback(generatedFeedback);
    } catch (e) {
      console.error("Error generating feedback:", e);
      setFeedback({ text: "Could not generate AI feedback." });
    }
    
    setQuizState('results');
  }, [questions, userAnswers, timeLeft, contentId, addQuizResult, material?.extractedText, quizState]);
  
  useEffect(() => {
    if(!process.env.API_KEY) {
      setError("API Key not configured. Quiz unavailable.");
      setQuizState('results');
      return;
    }
    loadQuestions();
  }, [loadQuestions]);

  useEffect(() => {
    if (quizState === 'taking' && timeLeft > 0) {
      timerRef.current = window.setTimeout(() => setTimeLeft(prevTime => prevTime - 1), 1000);
    } else if (timeLeft === 0 && quizState === 'taking') {
      handleSubmitQuiz();
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [timeLeft, quizState, handleSubmitQuiz]);

  const handleAnswerChange = (questionId: string, answer: string) => {
    setUserAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const currentQ = questions[currentQuestionIndex];

  if (quizState === 'loading') return <div className="flex justify-center items-center min-h-[calc(100vh-200px)]"><LoadingSpinner text="Generating Your Quiz..." size="lg" /></div>;
  
  if (quizState === 'results') {
    const percentage = questions.length > 0 ? (score / questions.length) * 100 : 0;
    return (
      <div className="max-w-2xl mx-auto p-4 sm:p-8 bg-card border border-border rounded-lg shadow-sm text-center">
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground mb-4">Quiz Complete!</h2>
        {error && <Alert type="error" message={error} className="mb-6 text-left" />}
        
        <div className="my-8">
            <CircularProgress percentage={percentage} />
        </div>

        <p className="text-xl text-muted-foreground mb-6">You scored <strong className="text-foreground">{score}</strong> out of <strong className="text-foreground">{questions.length}</strong>.</p>
        
        {feedback && (
          <div className="mt-4 p-4 bg-secondary/50 border border-border rounded-md text-left">
            <h3 className="text-md font-semibold text-foreground flex items-center mb-2"><SparklesIcon className="w-5 h-5 mr-2 text-primary"/>AI Feedback</h3>
            <p className="text-muted-foreground whitespace-pre-wrap text-sm">{feedback.text}</p>
          </div>
        )}

        <div className="mt-8 text-left space-y-3">
            <h3 className="text-lg font-semibold text-foreground mb-2">Review Your Answers:</h3>
            {questions.map((q, idx) => (
                <div key={q.id} className={`p-4 rounded-md border ${q.isCorrect ? 'border-green-500/50 bg-green-500/10' : 'border-destructive/50 bg-destructive/10'}`}>
                    <p className="font-medium text-foreground text-sm">Q{idx+1}: {q.questionText}</p>
                    <p className={`text-sm mt-1.5 ${q.isCorrect ? 'text-green-700 dark:text-green-300' : 'text-destructive'}`}>Your answer: <span className="font-semibold">{q.userAnswer || "Not answered"}</span> 
                      {q.isCorrect ? <CheckCircleIcon className="inline w-4 h-4 ml-1.5"/> : <XCircleIcon className="inline w-4 h-4 ml-1.5"/>}
                    </p>
                    {!q.isCorrect && typeof q.correctAnswer === 'string' && <p className="text-sm text-muted-foreground mt-1">Correct answer: <span className="font-semibold text-foreground">{q.correctAnswer}</span></p>}
                </div>
            ))}
        </div>
        <Button onClick={() => navigate(`/study/${contentId}`)} className="mt-8" variant="primary" size="lg">Back to Study</Button>
      </div>
    );
  }
  
  if (!currentQ && quizState === 'taking') {
      return <Alert type="error" message="No questions available for this quiz." />;
  }

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-8 bg-card border border-border rounded-lg shadow-sm">
      <div className="flex justify-between items-center mb-2 pb-4 border-b border-border">
         <h1 className="text-2xl font-bold text-foreground truncate pr-4">{material?.title || 'Knowledge Check'}</h1>
         <div className="text-lg font-semibold text-destructive px-3 py-1 bg-destructive/10 rounded-md">
            {Math.floor(timeLeft / 60)}:{('0' + (timeLeft % 60)).slice(-2)}
         </div>
      </div>
       <p className="text-muted-foreground text-sm mb-6">Question {currentQuestionIndex + 1} of {questions.length}</p>

      {currentQ && (
        <div className="mb-8 min-h-[200px]">
          <p className="text-xl font-medium text-foreground mb-6">{currentQ.questionText}</p>
          {currentQ.type === 'mcq' && currentQ.options && (
            <div className="space-y-3">
              {currentQ.options.map((option, idx) => (
                <label key={idx} 
                  className={`flex items-center p-4 border rounded-md cursor-pointer transition-all duration-150 ease-in-out has-[:checked]:border-primary has-[:checked]:bg-primary/10 has-[:checked]:shadow-sm
                              ${userAnswers[currentQ.id] === option ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'}`}>
                  <input
                    type="radio"
                    name={`question-${currentQ.id}`}
                    value={option}
                    checked={userAnswers[currentQ.id] === option}
                    onChange={() => handleAnswerChange(currentQ.id, option)}
                    className="h-4 w-4 text-primary focus:ring-primary focus:ring-offset-background bg-background border-muted-foreground mr-4"
                  />
                  <span className={`text-sm font-medium ${userAnswers[currentQ.id] === option ? 'text-primary' : 'text-foreground'}`}>{option}</span>
                </label>
              ))}
            </div>
          )}
          {currentQ.type === 'short_answer' && (
            <textarea
              value={userAnswers[currentQ.id] || ''}
              onChange={(e) => handleAnswerChange(currentQ.id, e.target.value)}
              rows={4}
              placeholder="Type your answer here..."
            />
          )}
        </div>
      )}

      <div className="flex justify-between items-center pt-6 border-t border-border">
        <Button 
          onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
          disabled={currentQuestionIndex === 0}
          variant="outline"
          leftIcon={<ChevronLeftIcon className="w-4 h-4"/>}
        >
          Previous
        </Button>
        {currentQuestionIndex < questions.length - 1 ? (
          <Button onClick={() => setCurrentQuestionIndex(prev => Math.min(questions.length - 1, prev + 1))} variant="secondary" rightIcon={<ChevronRightIcon className="w-4 h-4"/>}>
            Next
          </Button>
        ) : (
          <Button onClick={handleSubmitQuiz} variant="primary" isLoading={quizState === 'submitting'}>
            {quizState === 'submitting' ? 'Submitting...' : 'Submit Quiz'}
          </Button>
        )}
      </div>
       {!process.env.API_KEY && (
         <Alert type="warning" title="API Key Missing" message="The Gemini API key is not configured. Quiz features may not work correctly." className="mt-6" />
      )}
    </div>
  );
};

export default QuizPage;