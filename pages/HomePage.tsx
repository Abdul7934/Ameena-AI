import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUploadedContent } from '../contexts/UploadedContentContext';
import { UploadedContent } from '../types';
import Button from '../components/common/Button';
import { UploadIcon, LinkIcon, SparklesIcon } from '../components/icons/Icons';
import * as geminiService from '../services/geminiService';
import Alert from '../components/common/Alert';
import { YOUTUBE_TRANSCRIPT_SIMULATION_DELAY, FILE_PROCESSING_SIMULATION_DELAY } from '../constants';

const HomePage: React.FC = () => {
  const [contentType, setContentType] = useState<'text' | 'youtube' | 'file'>('text');
  const [textContent, setTextContent] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>('Medium');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuggestingMeta, setIsSuggestingMeta] = useState(false);

  const navigate = useNavigate();
  const { addContent } = useUploadedContent();

  const handleContentTypeChange = (newType: 'text' | 'youtube' | 'file') => {
    setContentType(newType);
    setError(null);
  };

  const handleSuggestMetadata = useCallback(async () => {
    let contentToAnalyze = '';
    if (contentType === 'text' && textContent.trim()) {
      contentToAnalyze = textContent;
    } else if (contentType === 'youtube' && youtubeUrl.trim()) {
      contentToAnalyze = youtubeUrl;
    } else if (contentType === 'file' && selectedFile) {
      contentToAnalyze = selectedFile.name;
    } else {
      setError(`Please provide content before suggesting metadata.`);
      return;
    }
    
    setIsSuggestingMeta(true);
    setError(null);
    try {
      const metadata = await geminiService.suggestMetadata(contentToAnalyze);
      setTitle(metadata.title);
      setSubject(metadata.subject);
      setTopic(metadata.topic);
      setDifficulty(metadata.difficulty);
    } catch (e) {
      console.error("Metadata suggestion failed", e);
      setError("Failed to suggest metadata. Please try again or fill manually.");
    } finally {
      setIsSuggestingMeta(false);
    }
  }, [textContent, contentType, youtubeUrl, selectedFile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if ((contentType === 'text' && !textContent.trim()) ||
        (contentType === 'youtube' && !youtubeUrl.trim()) ||
        (contentType === 'file' && !selectedFile)) {
      setError(`Please provide the required content.`);
      setIsLoading(false);
      return;
    }

    const newContentId = `content_${Date.now()}`;
    let extractedText = textContent;
    let originalContentValue = textContent;
    let fileNameValue: string | undefined = undefined;
    let fileMimeTypeValue: string | undefined = undefined;

    try {
      if (contentType === 'youtube') {
        originalContentValue = youtubeUrl;
        await new Promise(resolve => setTimeout(resolve, YOUTUBE_TRANSCRIPT_SIMULATION_DELAY));
        extractedText = await geminiService.fetchYouTubeTranscript(youtubeUrl);
      } else if (contentType === 'file' && selectedFile) {
        originalContentValue = selectedFile.name;
        fileNameValue = selectedFile.name;
        fileMimeTypeValue = selectedFile.type;
        await new Promise(resolve => setTimeout(resolve, FILE_PROCESSING_SIMULATION_DELAY));
        extractedText = await geminiService.processFileUploadSimulation(selectedFile);
      }

      const finalTitle = title || (extractedText ? (await geminiService.suggestMetadata(extractedText)).title : 'Untitled');

      const uploadedContent: UploadedContent = {
        id: newContentId,
        type: contentType,
        originalContent: originalContentValue,
        fileName: fileNameValue,
        fileMimeType: fileMimeTypeValue,
        extractedText: extractedText,
        title: finalTitle,
        subject,
        topic,
        difficulty,
        uploadDate: new Date().toISOString(),
      };

      addContent(uploadedContent);
      navigate(`/study/${newContentId}`);

    } catch (err) {
      console.error("Error processing content:", err);
      setError("Failed to process content. Please ensure your API key is configured and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const getButtonText = () => {
    if (isLoading) return 'Processing...';
    if (contentType === 'text') return 'Process Text';
    if (contentType === 'youtube') return 'Process YouTube Link';
    if (contentType === 'file') return 'Process File';
    return 'Process';
  }

  const isSubmitDisabled = () => {
    if (isLoading || isSuggestingMeta) return true;
    if (contentType === 'text' && !textContent.trim()) return true;
    if (contentType === 'youtube' && !youtubeUrl.trim()) return true;
    if (contentType === 'file' && !selectedFile) return true;
    return false;
  }

  const typeOptionBase = "relative flex-1 py-2 px-4 text-sm font-medium transition-colors duration-200 z-10 rounded-md";
  const typeOptionActive = "text-primary-foreground";
  const typeOptionInactive = "text-muted-foreground hover:text-foreground";

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">Start a New Study Session</h1>
        <p className="mt-3 text-lg text-muted-foreground">Provide your study material and let Ameena AI create a personalized learning experience for you.</p>
      </div>
      
      {error && <Alert type="error" message={error} className="mb-6" />}

      <div className="bg-card border border-border p-4 sm:p-8 rounded-lg shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="p-1 bg-secondary rounded-lg flex relative">
            <div
              className={`absolute top-1 bottom-1 w-[calc(33.33%-0.25rem)] bg-card shadow-sm rounded-md transition-all duration-300 ease-in-out
                ${contentType === 'text' ? 'left-1' : ''}
                ${contentType === 'youtube' ? 'left-1/3' : ''}
                ${contentType === 'file' ? 'left-2/3' : ''}
              `}
            />
            <button type="button" onClick={() => handleContentTypeChange('text')} className={`${typeOptionBase} ${contentType === 'text' ? typeOptionActive : typeOptionInactive}`} aria-pressed={contentType === 'text'}>Text</button>
            <button type="button" onClick={() => handleContentTypeChange('youtube')} className={`${typeOptionBase} ${contentType === 'youtube' ? typeOptionActive : typeOptionInactive}`} aria-pressed={contentType === 'youtube'}>YouTube</button>
            <button type="button" onClick={() => handleContentTypeChange('file')} className={`${typeOptionBase} ${contentType === 'file' ? typeOptionActive : typeOptionInactive}`} aria-pressed={contentType === 'file'}>File</button>
          </div>

          <div>
            {contentType === 'text' && (
              <textarea id="textContent" value={textContent} onChange={(e) => { setTextContent(e.target.value); if(error) setError(null);}} rows={8} placeholder="Paste your study content here..." required={contentType === 'text'} />
            )}
            {contentType === 'youtube' && (
              <input type="url" id="youtubeUrl" value={youtubeUrl} onChange={(e) => { setYoutubeUrl(e.target.value); if(error) setError(null);}} placeholder="https://www.youtube.com/watch?v=your_video_id" required={contentType === 'youtube'} />
            )}
            {contentType === 'file' && (
              <div>
                <label htmlFor="fileUpload" className="sr-only">Upload File</label>
                <input type="file" id="fileUpload" onChange={(e) => { setSelectedFile(e.target.files ? e.target.files[0] : null); if(error) setError(null);}} className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer" accept=".pdf,.ppt,.pptx,.doc,.docx,.txt,.jpg,.jpeg,.png" required={contentType === 'file'} />
                {selectedFile && <p className="text-xs text-muted-foreground mt-2">Selected: {selectedFile.name} ({Math.round(selectedFile.size / 1024)} KB)</p>}
              </div>
            )}
          </div>
          
          <div className="border-t border-border pt-6 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-foreground">Content Details <span className="text-sm font-normal text-muted-foreground">(Optional)</span></h2>
              <Button type="button" onClick={handleSuggestMetadata} variant="ghost" size="sm" leftIcon={<SparklesIcon className="w-4 h-4 text-primary" />} isLoading={isSuggestingMeta} disabled={isLoading || (contentType === 'text' && !textContent.trim()) || (contentType === 'youtube' && !youtubeUrl.trim()) || (contentType === 'file' && !selectedFile)}>
                Suggest with AI
              </Button>
            </div>
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-muted-foreground mb-1">Title</label>
              <input type="text" id="title" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g., Introduction to Photosynthesis" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-muted-foreground mb-1">Subject</label>
                <input type="text" id="subject" value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g., Biology" />
              </div>
              <div>
                <label htmlFor="topic" className="block text-sm font-medium text-muted-foreground mb-1">Topic</label>
                <input type="text" id="topic" value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g., Plant Science" />
              </div>
            </div>
            <div>
              <label htmlFor="difficulty" className="block text-sm font-medium text-muted-foreground mb-1">Difficulty</label>
              <select id="difficulty" value={difficulty} onChange={e => setDifficulty(e.target.value as 'Easy' | 'Medium' | 'Hard')}>
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </div>
          </div>
          
          <Button type="submit" isLoading={isLoading} disabled={isSubmitDisabled()} className="w-full" size="lg" leftIcon={contentType === 'youtube' ? <LinkIcon className="w-5 h-5"/> : <UploadIcon className="w-5 h-5"/>}>
            {getButtonText()}
          </Button>
        </form>
        {!process.env.API_KEY && (
           <Alert type="warning" title="API Key Missing" message="The Gemini API key is not configured. AI features will not work." className="mt-6" />
        )}
      </div>
    </div>
  );
};

export default HomePage;