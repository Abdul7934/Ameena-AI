

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useUploadedContent } from '../contexts/UploadedContentContext';
import { StudyMaterial, NoteLength, ChatMessage, PresentationContent, VideoScene, SlideContent } from '../types';
import * as geminiService from '../services/geminiService';
import Button from '../components/common/Button';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Alert from '../components/common/Alert';
import { BookOpenIcon, ChatBubbleIcon, ClipboardListIcon, SparklesIcon, ArrowPathIcon, InformationCircleIcon, ChevronDownIcon, AmeenaLogoIcon, LightBulbIcon, PresentationChartIcon, ChevronLeftIcon, ChevronRightIcon, DownloadIcon, GlobeAltIcon, LinkIcon, Squares2X2Icon, PhotoIcon, PlayIcon, PauseIcon } from '../components/icons/Icons';
import PptxGenJS from 'pptxgenjs';
import ErrorBoundary from '../components/common/ErrorBoundary';
import MermaidDiagram from '../components/common/MermaidDiagram';

interface AccordionCardProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  defaultOpen?: boolean;
}

const AccordionCard: React.FC<AccordionCardProps> = ({ title, icon, children, className = '', defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <details className={`bg-card border border-border shadow-sm rounded-lg ${className} overflow-hidden`} open={isOpen} onToggle={(e) => setIsOpen((e.target as HTMLDetailsElement).open)}>
      <summary className="p-4 flex items-center justify-between font-semibold text-foreground cursor-pointer list-none hover:bg-accent/50 transition-colors">
        <div className="flex items-center gap-x-3">
          {icon}
          <h2 className="text-lg">{title}</h2>
        </div>
        <ChevronDownIcon className={`w-5 h-5 text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </summary>
      <div className="p-4 pt-0">
        {children}
      </div>
    </details>
  );
};


const VideoPlayer: React.FC<{ scenes: VideoScene[], selectedVoice: SpeechSynthesisVoice | null }> = ({ scenes, selectedVoice }) => {
    const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    
    // Use a ref to get the latest `isPlaying` value inside the `onend` callback without making it a dependency.
    const isPlayingRef = useRef(isPlaying);
    useEffect(() => {
        isPlayingRef.current = isPlaying;
    }, [isPlaying]);

    useEffect(() => {
        // This effect handles the logic of speaking a scene.
        if (!isPlaying) {
            return; // Do nothing if not playing.
        }

        const scene = scenes[currentSceneIndex];
        if (!scene || !scene.script) {
            setIsPlaying(false); // Stop if there's no script.
            return;
        }

        const utterance = new SpeechSynthesisUtterance(scene.script);
        if (selectedVoice) {
            utterance.voice = selectedVoice;
        }

        // When the current scene finishes speaking...
        utterance.onend = () => {
            // ...check if we were still in "playing" mode and not at the end.
            if (isPlayingRef.current && currentSceneIndex < scenes.length - 1) {
                // If so, advance to the next scene.
                setCurrentSceneIndex(prevIndex => prevIndex + 1);
            } else {
                // Otherwise, stop playing.
                setIsPlaying(false);
            }
        };
        
        // Before speaking, cancel any previously ongoing speech to avoid overlaps.
        speechSynthesis.cancel();
        speechSynthesis.speak(utterance);
        
        // This cleanup function is crucial. It runs when the component unmounts
        // or when the dependencies of this effect change (e.g., user pauses, skips scene).
        return () => {
            utterance.onend = null; // Prevent memory leaks from the onend callback.
            speechSynthesis.cancel(); // Stop any speech immediately.
        };

    }, [isPlaying, currentSceneIndex, scenes, selectedVoice]);

    const handlePlayPause = () => {
        // If we are at the last scene and it's paused, pressing play again should restart from the beginning.
        if (!isPlaying && currentSceneIndex === scenes.length - 1) {
             setCurrentSceneIndex(0);
        }
        setIsPlaying(prev => !prev);
    };

    const handleSkip = (direction: 'next' | 'prev') => {
        const newIndex = direction === 'next' 
            ? Math.min(scenes.length - 1, currentSceneIndex + 1)
            : Math.max(0, currentSceneIndex - 1);
        
        // Changing the index will trigger the useEffect to stop the old speech and start the new one if `isPlaying` is true.
        setCurrentSceneIndex(newIndex);
    };

    const currentScene = scenes[currentSceneIndex];

    if (!currentScene) return <Alert type="warning" message="No scenes available to play." />;

    return (
        <div className="space-y-4">
            <div className="aspect-video bg-secondary/30 border border-border rounded-lg flex items-center justify-center overflow-hidden">
                {currentScene.imageUrl ? (
                    <img src={currentScene.imageUrl} alt={currentScene.imagePrompt} className="w-full h-full object-cover animate-fade-in" key={currentSceneIndex}/>
                ) : (
                    <div className="text-center p-4 text-muted-foreground">
                        <PhotoIcon className="w-16 h-16 mx-auto mb-2" />
                        <p>Visual for this scene could not be generated.</p>
                    </div>
                )}
            </div>
            <div className="flex items-center justify-center gap-x-4">
                <Button variant="outline" size="icon" onClick={() => handleSkip('prev')} disabled={currentSceneIndex === 0}>
                    <ChevronLeftIcon className="w-6 h-6" />
                </Button>
                <Button variant="primary" size="icon" onClick={handlePlayPause}>
                    {isPlaying ? <PauseIcon className="w-6 h-6" /> : <PlayIcon className="w-6 h-6" />}
                </Button>
                <Button variant="outline" size="icon" onClick={() => handleSkip('next')} disabled={currentSceneIndex === scenes.length - 1}>
                    <ChevronRightIcon className="w-6 h-6" />
                </Button>
            </div>
            <div className="text-center text-sm text-muted-foreground">
                Scene {currentSceneIndex + 1} of {scenes.length}
            </div>
        </div>
    );
};

const PresentationViewer: React.FC<{ presentation: PresentationContent }> = ({ presentation }) => {
    const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
    const currentSlide = presentation.slides[currentSlideIndex];

    const goToPrev = () => setCurrentSlideIndex(i => Math.max(0, i - 1));
    const goToNext = () => setCurrentSlideIndex(i => Math.min(presentation.slides.length - 1, i + 1));
    
    // Add a key to the content div to force re-render with animation
    const slideKey = `slide-${currentSlideIndex}`;

    if (!currentSlide) {
        return <Alert type="info" message="No slides to display." />;
    }

    return (
        <div className="space-y-4">
            <div key={slideKey} className="bg-secondary/30 border border-border rounded-lg p-6 animate-fade-in-up">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center min-h-[300px]">
                    <div className="md:order-1">
                        <h4 className="font-bold text-xl text-foreground mb-3">{currentSlide.title}</h4>
                        <ul className="space-y-2 pl-4 list-disc text-muted-foreground">
                            {currentSlide.content.map((point, i) => (
                                <li key={i} className="animate-bullet-in" style={{ animationDelay: `${i * 100}ms` }}>{point}</li>
                            ))}
                        </ul>
                    </div>
                    <div className="aspect-video bg-secondary/50 rounded-md flex items-center justify-center overflow-hidden md:order-2">
                        {currentSlide.imageUrl ? (
                           <img src={currentSlide.imageUrl} alt={currentSlide.imagePrompt} className="w-full h-full object-cover"/>
                        ) : (
                           <div className="text-center p-4 text-muted-foreground">
                                <PhotoIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                <p className="text-sm">No visual generated</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            {/* Navigation */}
            <div className="flex items-center justify-center gap-x-4">
                <Button variant="outline" size="sm" onClick={goToPrev} disabled={currentSlideIndex === 0}>
                    <ChevronLeftIcon className="w-4 h-4 mr-2"/> Previous
                </Button>
                <span className="text-sm font-medium text-muted-foreground">
                    Slide {currentSlideIndex + 1} of {presentation.slides.length}
                </span>
                <Button variant="outline" size="sm" onClick={goToNext} disabled={currentSlideIndex === presentation.slides.length - 1}>
                    Next <ChevronRightIcon className="w-4 h-4 ml-2"/>
                </Button>
            </div>
        </div>
    );
};


export const StudyPage: React.FC = () => {
    const { contentId } = useParams<{ contentId: string }>();
    const navigate = useNavigate();
    const { getStudyMaterialById, updateStudyMaterial } = useUploadedContent();
    const [material, setMaterial] = useState<StudyMaterial | null>(null);

    // State for all AI generation activities
    const [isLoading, setIsLoading] = useState<Record<string, boolean>>({});
    const [error, setError] = useState<Record<string, string | null>>({});

    // Specific state for chat
    const [chatInput, setChatInput] = useState('');
    const [isAwaitingChatResponse, setIsAwaitingChatResponse] = useState(false);
    const [useGoogleSearch, setUseGoogleSearch] = useState(false);
    const chatContainerRef = useRef<HTMLDivElement>(null);
    
    // Specific state for notes
    const [selectedNoteLength, setSelectedNoteLength] = useState<NoteLength>(NoteLength.MEDIUM);

    // Specific state for video generation
    const [videoGenerationProgress, setVideoGenerationProgress] = useState('');
    const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
    const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
    
    // Specific state for presentation generation
    const [isGeneratingPresentation, setIsGeneratingPresentation] = useState(false);
    const [presentationGenProgress, setPresentationGenProgress] = useState('');
    const [presentationError, setPresentationError] = useState<string | null>(null);

    // Specific state for block diagram
    const [isGeneratingDiagram, setIsGeneratingDiagram] = useState(false);
    const [diagramError, setDiagramError] = useState<string | null>(null);


    useEffect(() => {
        if (!contentId) {
            navigate('/');
            return;
        }
        const foundMaterial = getStudyMaterialById(contentId);
        if (foundMaterial) {
            setMaterial(foundMaterial);
        } else {
            // Handle case where material is not found, maybe redirect or show error
            navigate('/');
        }
    }, [contentId, getStudyMaterialById, navigate]);

    useEffect(() => {
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      }
    }, [material?.chatHistory, isAwaitingChatResponse]);

    useEffect(() => {
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        // Filter for English voices that sound natural
        const englishVoices = voices.filter(v => v.lang.startsWith('en') && !v.name.includes('Google') && !v.name.includes('Microsoft'));
        setAvailableVoices(englishVoices);
        if(englishVoices.length > 0) {
            setSelectedVoice(englishVoices[0]); // Default to the first available voice
        }
      };
      loadVoices();
      // Voices are loaded asynchronously, so we need to listen for the event
      window.speechSynthesis.onvoiceschanged = loadVoices;
      return () => {
          window.speechSynthesis.onvoiceschanged = null;
      }
    }, []);


    const handleGenerate = useCallback(async (
        type: 'summary' | 'explanation' | 'notes', 
        generatorFn: () => Promise<any>
    ) => {
        if (!material?.id) return;
        setIsLoading(prev => ({ ...prev, [type]: true }));
        setError(prev => ({ ...prev, [type]: null }));
        try {
            const result = await generatorFn();
            const updateKey = type === 'summary' ? 'aiSummary' : type === 'explanation' ? 'aiExplanation' : 'notes';
            const updateValue = type === 'notes' ? { ...material.notes, [selectedNoteLength]: result } : result;
            updateStudyMaterial(material.id, { [updateKey]: updateValue });
        } catch (e) {
            console.error(`Error generating ${type}:`, e);
            setError(prev => ({ ...prev, [type]: `Failed to generate ${type}. Please try again.` }));
        } finally {
            setIsLoading(prev => ({ ...prev, [type]: false }));
        }
    }, [material?.id, material?.notes, selectedNoteLength, updateStudyMaterial]);


    const handleGenerateNotes = () => handleGenerate(
        'notes', 
        () => geminiService.generateNotes(material!.extractedText!, selectedNoteLength)
    );

    const handleSendMessage = useCallback(async () => {
      if (!chatInput.trim() || !material?.id) return;
      
      const userMessage: ChatMessage = {
        id: `msg_${Date.now()}`,
        sender: 'user',
        text: chatInput,
        timestamp: new Date().toISOString(),
      };

      // Immediately update UI with user's message
      updateStudyMaterial(material.id, {
        chatHistory: [...(material.chatHistory || []), userMessage]
      });
      setChatInput('');
      setIsAwaitingChatResponse(true);
      setError(prev => ({ ...prev, chat: null }));

      try {
        const systemInstruction = `You are Ameena AI, a friendly and expert study assistant. The user is currently studying the following material titled "${material.title}". Topic: ${material.topic}. Subject: ${material.subject}.\n\nRefer to this content when answering, but do not mention it explicitly unless asked. Be helpful, encouraging, and clear.\n\n---\nSTUDY MATERIAL:\n${material.extractedText?.substring(0, 4000)}...\n---`;
        
        const chat = geminiService.startOrGetChat(
          systemInstruction,
          material.chatHistory?.map(msg => ({
              role: msg.sender === 'user' ? 'user' : 'model',
              parts: [{ text: msg.text }]
          }))
        );

        const { text: aiText, groundingSources } = await geminiService.sendMessageToChat(chat, userMessage.text, useGoogleSearch);

        const aiMessage: ChatMessage = {
            id: `msg_${Date.now() + 1}`,
            sender: 'ai',
            text: aiText,
            timestamp: new Date().toISOString(),
            groundingSources: groundingSources
        };

        updateStudyMaterial(material.id, {
            chatHistory: [...(material.chatHistory || []), userMessage, aiMessage]
        });

      } catch (e: any) {
        console.error("Error sending message:", e);
        const errorMessage: ChatMessage = {
          id: `err_${Date.now()}`, sender: 'ai',
          text: "Sorry, I encountered an error. Please check your connection or API key and try again.",
          timestamp: new Date().toISOString()
        };
        // Re-fetch material from context to avoid race conditions with state
        const currentMaterial = getStudyMaterialById(material.id);
        updateStudyMaterial(material.id, { chatHistory: [...(currentMaterial?.chatHistory || []), errorMessage] });
      } finally {
        setIsAwaitingChatResponse(false);
      }
    }, [chatInput, material, updateStudyMaterial, getStudyMaterialById, useGoogleSearch]);
    
    const handleGenerateFullPresentation = async () => {
        if (!material?.id || !material.aiExplanation) {
            setPresentationError("An explanation must be generated first to create a presentation.");
            return;
        }

        setIsGeneratingPresentation(true);
        setPresentationError(null);
        setPresentationGenProgress('Starting presentation generation...');
        
        try {
            // Step 1: Generate slide text and image prompts
            setPresentationGenProgress('Step 1/2: Crafting slide content...');
            const content = await geminiService.generatePresentationContent(material.aiExplanation);
            
            if (!content) {
                throw new Error("The AI failed to generate presentation content. The explanation might be too short or ambiguous.");
            }
            
            // Immediately update the context with the text part of the presentation.
            updateStudyMaterial(material.id, { presentationContent: content });

            // Step 2: Generate images for each slide
            const onProgress = (progress: string) => {
                setPresentationGenProgress(`Step 2/2: ${progress}`);
            };
            
            const contentWithImages = await geminiService.generatePresentationImages(content, onProgress);
            
            if (contentWithImages) {
                updateStudyMaterial(material.id, { presentationContent: contentWithImages });
                if (contentWithImages.slides.some(s => !s.imageUrl)) {
                    setPresentationError("Some slide visuals could not be generated. You can still download the presentation with the available content.");
                }
            } else {
                throw new Error("Failed to generate presentation images. The AI service may be unavailable.");
            }

        } catch (err: any) {
            console.error("Presentation generation failed:", err);
            setPresentationError(err.message || "An unknown error occurred during presentation generation. Please try again.");
            updateStudyMaterial(material.id, { presentationContent: undefined });
        } finally {
            setIsGeneratingPresentation(false);
            setPresentationGenProgress('');
        }
    };


    const handleDownloadPptx = () => {
      if (!material?.presentationContent) return;
      const { title, slides } = material.presentationContent;
      
      const pptx = new PptxGenJS();
      pptx.layout = 'LAYOUT_16x9';

      // Define Master Slides
      pptx.defineSlideMaster({
        title: 'TITLE_SLIDE',
        background: { color: '1f2937' }, // Dark Gray
        objects: [
          { 'rect': { x: 0, y: 4.5, w: '100%', h: 0.75, fill: { color: '60a5fa' } } }, // Blue accent
          { 'text': {
              text: title,
              options: { x: 0.5, y: 1.5, w: '90%', h: 1.5, fontSize: 48, bold: true, color: 'FFFFFF', align: 'left' }
            }
          },
          { 'text': {
              text: `A presentation by Ameena AI on ${material.topic || 'your topic'}`,
              options: { x: 0.5, y: 3.0, w: '90%', h: 0.5, fontSize: 18, color: 'e5e7eb' }
            }
          }
        ]
      });
      
      pptx.defineSlideMaster({
          title: "CONTENT_SLIDE",
          background: { color: "FFFFFF" },
          objects: [
              {
                  'placeholder': {
                      options: {
                          name: "title",
                          type: "title",
                          x: 0.5, y: 0.25, w: '90%', h: 0.75,
                          fontSize: 32, bold: true, color: '1f2937'
                      },
                      text: "Default Title",
                  }
              },
              {
                  'placeholder': {
                      options: {
                          name: "body",
                          type: "body",
                          x: 0.5, y: 1.2, w: '90%', h: 5.5,
                          fontSize: 18, color: '374151', align: 'left',
                          bullet: true,
                      },
                      text: "Default Body",
                  }
              },
              {
                  'text': {
                      text: 'Ameena AI',
                      options: { x: 0.5, y: '92%', w: '40%', fontSize: 10, color: 'a1a1aa' }
                  }
              },
              {
                  'placeholder': {
                      options: {
                          name: 'slideNumber',
                          type: 'sldNum',
                          x: '85%', y: '92%', w: '10%', h: 0.5,
                          fontSize: 10, color: 'a1a1aa', align: 'right',
                      }
                  }
              }
          ]
      });

      // Add Title Slide
      pptx.addSlide({ masterName: 'TITLE_SLIDE' });

      // Add Content Slides
      slides.forEach(slide => {
          const slideInstance = pptx.addSlide({ masterName: "CONTENT_SLIDE" });
          slideInstance.addText(slide.title, { placeholder: "title" });
          
          const contentWithOptions = slide.content.map(point => ({ text: point, options: { breakLine: true } }));
          
          if(slide.imageUrl) {
            // Layout with image on the right
            slideInstance.addText(contentWithOptions, { placeholder: "body", w: '45%' });
            slideInstance.addImage({
                data: slide.imageUrl,
                x: '52%', y: 1.2, w: '45%', h: 5.5
            });
          } else {
            // Full width text
            slideInstance.addText(contentWithOptions, { placeholder: "body" });
          }
      });
      
      const safeFilename = (material.title || 'presentation').replace(/[^a-z0-9]/gi, '_').toLowerCase();
      pptx.writeFile({ fileName: `${safeFilename}.pptx` });
    };
    
    const handleGenerateBlockDiagram = async () => {
        if (!material?.aiExplanation) {
            setDiagramError("Please generate an explanation first.");
            return;
        }
        setIsGeneratingDiagram(true);
        setDiagramError(null);
        try {
            const mermaidCode = await geminiService.generateBlockDiagram(material.aiExplanation);
            updateStudyMaterial(material!.id, { blockDiagramMermaid: mermaidCode || 'error' });
        } catch (err: any) {
            setDiagramError(err.message || 'Failed to generate diagram.');
            updateStudyMaterial(material!.id, { blockDiagramMermaid: 'error' });
        } finally {
            setIsGeneratingDiagram(false);
        }
    };
    
    const handleGenerateVideo = async () => {
        if (!material?.aiExplanation) {
            setError(prev => ({ ...prev, video: "Please generate an explanation first to create a video."}));
            return;
        }
        setIsLoading(prev => ({ ...prev, video: true }));
        setError(prev => ({ ...prev, video: null }));
        setVideoGenerationProgress('Starting video generation...');
        try {
            const scenes = await geminiService.generateVideoAssets(
                material.aiExplanation, 
                (progress) => setVideoGenerationProgress(progress)
            );
            updateStudyMaterial(material!.id, { videoScenes: scenes || [] });
        } catch (err: any) {
            console.error(err);
            setError(prev => ({ ...prev, video: err.message || "An unknown error occurred during video generation."}));
        } finally {
            setIsLoading(prev => ({ ...prev, video: false }));
            setVideoGenerationProgress('');
        }
    };


    if (!material) {
        return <div className="text-center p-8"><LoadingSpinner text="Loading study material..." /></div>;
    }
    
    const noteForSelectedLength = material.notes?.[selectedNoteLength];

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Page Header */}
            <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
                <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                    <div>
                        <p className="text-sm font-medium text-primary">{material.subject} &gt; {material.topic}</p>
                        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground mt-1">{material.title}</h1>
                        <div className="flex items-center gap-x-4 mt-3 text-sm text-muted-foreground">
                            <span>Difficulty: <span className="font-semibold text-foreground">{material.difficulty}</span></span>
                            <span>Type: <span className="font-semibold text-foreground">{material.type.charAt(0).toUpperCase() + material.type.slice(1)}</span></span>
                        </div>
                    </div>
                    <div className="flex-shrink-0 flex items-center gap-x-2">
                        <Link to={`/quiz/${material.id}`}>
                            <Button variant="primary" size="md" leftIcon={<ClipboardListIcon className="w-4 h-4"/>}>Take Quiz</Button>
                        </Link>
                    </div>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Core Study Tools */}
                <div className="lg:col-span-2 space-y-6">
                    <AccordionCard title="Original Content" icon={<BookOpenIcon className="w-6 h-6 text-primary" />} defaultOpen={false}>
                      <div className="prose prose-sm dark:prose-invert max-w-none max-h-60 overflow-y-auto p-2 border rounded-md bg-secondary/30">
                        <p>{material.extractedText || "No text content available."}</p>
                      </div>
                    </AccordionCard>
                    
                    <AccordionCard title="AI-Powered Explanation" icon={<LightBulbIcon className="w-6 h-6 text-primary" />} defaultOpen={true}>
                       <div className="space-y-4">
                            {error.explanation && <Alert type="error" message={error.explanation} />}
                            {material.aiExplanation ? (
                                <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap animate-fade-in-up">{material.aiExplanation}</div>
                            ) : (
                                <p className="text-muted-foreground">No explanation generated yet.</p>
                            )}
                            <Button 
                                onClick={() => handleGenerate('explanation', () => geminiService.generateExplanation(material.extractedText!))}
                                isLoading={isLoading.explanation} 
                                disabled={!material.extractedText || isLoading.explanation}
                                size="sm" 
                                variant="secondary"
                                leftIcon={<SparklesIcon className="w-4 h-4"/>}>
                                {material.aiExplanation ? 'Regenerate Explanation' : 'Generate Explanation'}
                            </Button>
                        </div>
                    </AccordionCard>

                    <AccordionCard title="AI-Generated Notes" icon={<ClipboardListIcon className="w-6 h-6 text-primary" />} defaultOpen={false}>
                        <div className="space-y-4">
                          {error.notes && <Alert type="error" message={error.notes} />}
                          <div className="flex items-center gap-2 flex-wrap p-2 bg-secondary/50 rounded-md">
                              <span className="text-sm font-medium text-muted-foreground">Detail Level:</span>
                              {(Object.keys(NoteLength) as Array<keyof typeof NoteLength>).map(key => (
                                <Button 
                                  key={key} 
                                  size="sm"
                                  variant={selectedNoteLength === NoteLength[key] ? 'primary' : 'ghost'}
                                  onClick={() => setSelectedNoteLength(NoteLength[key])}
                                >
                                  {NoteLength[key]}
                                </Button>
                              ))}
                          </div>
                          
                          {noteForSelectedLength ? (
                            <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap p-2 border rounded-md animate-fade-in-up">{noteForSelectedLength}</div>
                          ) : (
                            <p className="text-muted-foreground text-sm px-2">Notes for this level of detail have not been generated yet.</p>
                          )}
                          <Button 
                              onClick={handleGenerateNotes} 
                              isLoading={isLoading.notes} 
                              disabled={!material.extractedText || isLoading.notes}
                              size="sm"
                              variant="secondary"
                              leftIcon={<SparklesIcon className="w-4 h-4"/>}>
                              {noteForSelectedLength ? `Regenerate ${selectedNoteLength} Notes` : `Generate ${selectedNoteLength} Notes`}
                          </Button>
                        </div>
                    </AccordionCard>
                </div>

                {/* Right Column: Chat and Visual Tools */}
                <div className="space-y-6">
                    <AccordionCard title="Chat with Ameena" icon={<ChatBubbleIcon className="w-6 h-6 text-primary" />} defaultOpen={true}>
                        <div className="flex flex-col h-[500px]">
                            <div ref={chatContainerRef} className="flex-grow overflow-y-auto mb-4 pr-2 space-y-4">
                               {material.chatHistory && material.chatHistory.length > 0 ? material.chatHistory.map((msg) => (
                                <div key={msg.id} className={`flex items-start gap-2.5 ${msg.sender === 'user' ? 'justify-end' : ''}`}>
                                  {msg.sender === 'ai' && <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center"><AmeenaLogoIcon className="w-5 h-5 text-primary"/></div>}
                                  <div className={`flex flex-col gap-1 max-w-[320px] ${msg.sender === 'user' ? 'items-end' : ''}`}>
                                    <div className={`p-3 rounded-xl ${msg.sender === 'user' ? 'rounded-br-none bg-primary text-primary-foreground' : 'rounded-bl-none bg-secondary text-secondary-foreground'}`}>
                                      <p className="text-sm font-normal whitespace-pre-wrap">{msg.text}</p>
                                      {msg.groundingSources && msg.groundingSources.length > 0 && (
                                        <div className="mt-2 pt-2 border-t border-secondary-foreground/20">
                                            <p className="text-xs font-semibold mb-1">Sources:</p>
                                            <ul className="space-y-1">
                                                {msg.groundingSources.map(source => (
                                                    <li key={source.uri}><a href={source.uri} target="_blank" rel="noopener noreferrer" className="text-xs flex items-center gap-1 hover:underline"><LinkIcon className="w-3 h-3"/>{source.title || source.uri}</a></li>
                                                ))}
                                            </ul>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )) : (
                                <div className="text-center text-muted-foreground p-4">Start the conversation by asking a question!</div>
                              )}
                              {isAwaitingChatResponse && (
                                <div className="flex items-start gap-2.5">
                                    <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center"><AmeenaLogoIcon className="w-5 h-5 text-primary"/></div>
                                    <div className="p-3 rounded-xl rounded-bl-none bg-secondary text-secondary-foreground">
                                        <LoadingSpinner size="sm" />
                                    </div>
                                </div>
                              )}
                            </div>
                            {error.chat && <Alert type="error" message={error.chat} className="mb-2"/>}
                            <div className="relative">
                                <textarea 
                                    value={chatInput} 
                                    onChange={(e) => setChatInput(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }}}
                                    placeholder="Ask a question..." 
                                    rows={2}
                                    className="pr-24"
                                    disabled={isAwaitingChatResponse}
                                />
                                <Button onClick={handleSendMessage} size="sm" className="absolute right-2 top-1/2 -translate-y-1/2" disabled={!chatInput.trim() || isAwaitingChatResponse}>Send</Button>
                            </div>
                            <label className="flex items-center mt-2 text-xs text-muted-foreground cursor-pointer">
                                <input type="checkbox" checked={useGoogleSearch} onChange={(e) => setUseGoogleSearch(e.target.checked)} className="mr-2 h-3.5 w-3.5 rounded-sm" />
                                <GlobeAltIcon className="w-4 h-4 mr-1"/> Search with Google for up-to-date info
                            </label>
                        </div>
                    </AccordionCard>
                </div>
            </div>
            
            {/* Visual Generation Tools */}
            <div className="space-y-6">
                 <AccordionCard title="Generate Presentation" icon={<PresentationChartIcon className="w-6 h-6 text-primary" />} defaultOpen={false}>
                    <div className="space-y-4">
                        {presentationError && <Alert type="error" title="Presentation Error" message={presentationError} />}

                        {isGeneratingPresentation && (
                            <div className="flex flex-col items-center gap-2 p-4">
                                <LoadingSpinner size="md" />
                                <p className="text-sm text-muted-foreground">{presentationGenProgress}</p>
                                {material.presentationContent && (
                                    <div className="mt-4 w-full opacity-50 pointer-events-none">
                                        <PresentationViewer presentation={material.presentationContent} />
                                    </div>
                                )}
                            </div>
                        )}

                        {!isGeneratingPresentation && material.presentationContent && (
                            <>
                                <PresentationViewer presentation={material.presentationContent} />
                                <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-border">
                                    <Button onClick={handleDownloadPptx} leftIcon={<DownloadIcon className="w-4 h-4" />}>
                                        Download .pptx
                                    </Button>
                                    <Button onClick={handleGenerateFullPresentation} variant="secondary" size="sm" leftIcon={<ArrowPathIcon className="w-4 h-4" />}>
                                        Regenerate
                                    </Button>
                                </div>
                            </>
                        )}

                        {!isGeneratingPresentation && !material.presentationContent && (
                            <div className="text-center">
                                <p className="text-muted-foreground mb-4">Create a PowerPoint presentation from the AI-generated explanation.</p>
                                <Button 
                                    onClick={handleGenerateFullPresentation} 
                                    disabled={!material.aiExplanation}
                                    leftIcon={<SparklesIcon className="w-5 h-5"/>}
                                >
                                    Generate Presentation
                                </Button>
                                {!material.aiExplanation && <p className="text-xs text-muted-foreground mt-2">Please generate an explanation first.</p>}
                            </div>
                        )}
                    </div>
                </AccordionCard>

                <AccordionCard title="Visualize as Block Diagram" icon={<Squares2X2Icon className="w-6 h-6 text-primary" />} defaultOpen={false}>
                    <ErrorBoundary>
                        <div className="space-y-4">
                             {diagramError && <Alert type="error" title="Diagram Error" message={diagramError} />}
                             {material.blockDiagramMermaid && material.blockDiagramMermaid !== 'error' && (
                                <MermaidDiagram chart={material.blockDiagramMermaid} />
                             )}
                             {material.blockDiagramMermaid === 'error' && !diagramError && (
                                <Alert type="warning" title="Could not generate diagram" message="The AI was unable to create a valid diagram from the text. The content might be too abstract for a block diagram." />
                             )}
                            <Button
                                onClick={handleGenerateBlockDiagram}
                                isLoading={isGeneratingDiagram}
                                disabled={!material.aiExplanation || isGeneratingDiagram}
                                variant="secondary"
                                size="sm"
                                leftIcon={<SparklesIcon className="w-4 h-4" />}
                            >
                                {material.blockDiagramMermaid ? 'Regenerate Diagram' : 'Generate Diagram'}
                            </Button>
                             {!material.aiExplanation && <p className="text-xs text-muted-foreground mt-2">Please generate an explanation first.</p>}
                        </div>
                    </ErrorBoundary>
                </AccordionCard>

                <AccordionCard title="Generate AI-Narrated Video" icon={<PlayIcon className="w-6 h-6 text-primary" />} defaultOpen={false}>
                    <div className="space-y-4">
                         {error.video && <Alert type="error" title="Video Generation Error" message={error.video} />}
                         
                         {isLoading.video && (
                             <div className="text-center">
                                <LoadingSpinner text={videoGenerationProgress} />
                             </div>
                         )}

                         {!isLoading.video && material.videoScenes && material.videoScenes.length > 0 && (
                            <>
                                <VideoPlayer scenes={material.videoScenes} selectedVoice={selectedVoice}/>
                                <div className="flex items-center gap-x-2 text-sm">
                                    <label htmlFor="voice-select" className="font-medium text-muted-foreground">Voice:</label>
                                    <select 
                                        id="voice-select"
                                        value={selectedVoice?.name || ''}
                                        onChange={(e) => {
                                            const voice = availableVoices.find(v => v.name === e.target.value);
                                            if (voice) setSelectedVoice(voice);
                                        }}
                                        className="py-1 text-xs"
                                    >
                                        {availableVoices.map(voice => (
                                            <option key={voice.name} value={voice.name}>
                                                {voice.name} ({voice.lang})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </>
                         )}
                         
                         <Button
                            onClick={handleGenerateVideo}
                            isLoading={isLoading.video}
                            disabled={!material.aiExplanation || isLoading.video}
                            variant={material.videoScenes && material.videoScenes.length > 0 ? "secondary" : "primary"}
                            leftIcon={<SparklesIcon className="w-4 h-4" />}
                         >
                            {material.videoScenes && material.videoScenes.length > 0 ? 'Regenerate Video' : 'Generate Video'}
                         </Button>
                         {!material.aiExplanation && <p className="text-xs text-muted-foreground mt-2">Please generate an explanation first.</p>}
                    </div>
                </AccordionCard>
            </div>
        </div>
    );
};