import React from 'react';
import { Link } from 'react-router-dom';
import { useUploadedContent } from '../contexts/UploadedContentContext';
import { StudyMaterial, Quiz } from '../types';
import { BookOpenIcon, ClipboardListIcon, PlayIcon, UploadIcon, SparklesIcon, ChevronRightIcon } from '../components/icons/Icons'; 
import Button from '../components/common/Button';

const DashboardPage: React.FC = () => {
  const { studyMaterials, getQuizzesForContent } = useUploadedContent();

  const getTotalQuizzesTaken = () => {
    return studyMaterials.reduce((acc, material) => acc + (getQuizzesForContent(material.id)?.length || 0), 0);
  };

  const getAverageQuizScore = () => {
    let totalScore = 0;
    let totalQuestionsInScoredQuizzes = 0;
    studyMaterials.forEach(material => {
      const quizzes = getQuizzesForContent(material.id);
      quizzes?.forEach(quiz => {
        if (typeof quiz.score === 'number' && quiz.questions.length > 0) {
          totalScore += quiz.score;
          totalQuestionsInScoredQuizzes += quiz.questions.length;
        }
      });
    });
    if (totalQuestionsInScoredQuizzes === 0) return 0;
    return parseFloat((totalScore / totalQuestionsInScoredQuizzes * 100).toFixed(1));
  };
  
  const recentActivities = [...studyMaterials]
    .sort((a,b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime())
    .slice(0, 3);

  if (studyMaterials.length === 0) {
    return (
      <div className="text-center py-20 flex flex-col items-center">
        <div className="flex items-center justify-center h-16 w-16 rounded-full bg-secondary mb-6">
            <BookOpenIcon className="w-8 h-8 text-muted-foreground" />
        </div>
        <h2 className="text-2xl font-semibold text-foreground mb-2">Your Dashboard is Ready</h2>
        <p className="text-muted-foreground mb-6 max-w-sm mx-auto">Upload your first piece of study material to begin your AI-powered learning journey.</p>
        <Link to="/">
            <Button variant="primary" size="lg" leftIcon={<UploadIcon className="w-5 h-5"/>}>
                Upload Content
            </Button>
        </Link>
      </div>
    );
  }
  
  const averageScore = getAverageQuizScore();

  return (
    <div className="container mx-auto py-2 space-y-10">
      <div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground mb-2">Dashboard</h1>
        <p className="text-lg text-muted-foreground">Welcome back! Here's a summary of your learning progress.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Materials Logged" value={studyMaterials.length.toString()} icon={<BookOpenIcon className="w-6 h-6 text-primary"/>} />
        <StatCard title="Quizzes Taken" value={getTotalQuizzesTaken().toString()} icon={<ClipboardListIcon className="w-6 h-6 text-green-500"/>} />
        <StatCard 
          title="Average Quiz Score" 
          value={`${averageScore}%`} 
          icon={<SparklesIcon className="w-6 h-6 text-amber-500"/>}
          subText={averageScore > 0 ? (averageScore >= 75 ? "Excellent work!" : averageScore >= 50 ? "Good progress!" : "Needs review") : "No quizzes yet"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <h2 className="text-2xl font-semibold text-foreground mb-4">All Study Materials</h2>
          {studyMaterials.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {studyMaterials.map(material => (
                <MaterialCard key={material.id} material={material} quizzes={getQuizzesForContent(material.id)} />
              ))}
            </div>
          ) : (
             <p className="text-muted-foreground italic">No study materials uploaded yet.</p>
          )}
        </div>
        <div>
          <h2 className="text-2xl font-semibold text-foreground mb-4">Recent Activity</h2>
          {recentActivities.length > 0 ? (
            <div className="space-y-4">
              {recentActivities.map(material => (
                <ActivityItem key={material.id} material={material} />
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No recent activity.</p>
          )}
        </div>
      </div>
    </div>
  );
};

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  subText?: string;
}
const StatCard: React.FC<StatCardProps> = ({ title, value, icon, subText }) => {
  return (
    <div className="bg-card p-6 rounded-lg shadow-sm border border-border">
        <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            {icon}
        </div>
        <p className="text-3xl font-bold text-foreground mt-2">{value}</p>
        {subText && <p className="text-xs text-muted-foreground mt-1">{subText}</p>}
    </div>
  );
};

interface ActivityItemProps {
  material: StudyMaterial;
}
const ActivityItem: React.FC<ActivityItemProps> = ({ material }) => {
  return (
    <Link to={`/study/${material.id}`} className="block bg-card p-4 rounded-lg shadow-sm border border-border hover:border-primary/50 hover:bg-accent/50 transition-all duration-200 group">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-semibold text-md text-foreground">{material.title}</h3>
          <p className="text-xs text-muted-foreground">
            Uploaded on {new Date(material.uploadDate).toLocaleDateString()}
          </p>
        </div>
        <ChevronRightIcon className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
      </div>
    </Link>
  );
};

interface MaterialCardProps {
  material: StudyMaterial;
  quizzes: Quiz[] | undefined;
}
const MaterialCard: React.FC<MaterialCardProps> = ({ material, quizzes }) => {
  const quizzesTaken = quizzes?.length || 0;
  
  let lastQuizScore: string | null = null;
  if (quizzes && quizzesTaken > 0) {
      const lastQuiz = quizzes[quizzes.length - 1];
      if (lastQuiz && typeof lastQuiz.score === 'number' && lastQuiz.questions.length > 0) {
        lastQuizScore = ((lastQuiz.score / lastQuiz.questions.length) * 100).toFixed(0);
      }
  }

  return (
  <div className="bg-card p-5 rounded-lg shadow-sm border border-border flex flex-col justify-between group hover:shadow-md hover:-translate-y-1 transition-all duration-200">
    <div>
      <h3 className="text-lg font-bold text-foreground mb-2 truncate" title={material.title}>{material.title}</h3>
      <div className="text-xs text-muted-foreground space-y-1.5 border-t border-border pt-3 mt-3">
         <p>Subject: <span className="font-medium text-foreground">{material.subject || 'N/A'}</span></p>
         <p>Topic: <span className="font-medium text-foreground">{material.topic || 'N/A'}</span></p>
         <p>Difficulty: <span className="font-medium text-foreground">{material.difficulty}</span></p>
         <p className="flex items-center">
            <ClipboardListIcon className="inline w-3.5 h-3.5 mr-1.5"/>Quizzes Taken: <span className="font-medium ml-1 text-foreground">{quizzesTaken}</span>
            {lastQuizScore !== null && <span className="ml-2 text-muted-foreground">(Last Score: {lastQuizScore}%)</span>}
        </p>
      </div>
    </div>
    <Link to={`/study/${material.id}`} className="mt-4 block">
      <Button variant="outline" size="sm" className="w-full">
        Go to Study Session
      </Button>
    </Link>
  </div>
  );
};

export default DashboardPage;