import React, { useEffect, useState, useCallback } from 'react';
import mermaid from 'mermaid';
import LoadingSpinner from './LoadingSpinner';
import Alert from './Alert';

const getTheme = () => document.documentElement.classList.contains('dark') ? 'dark' : 'base';

const MermaidDiagram: React.FC<{ chart: string }> = ({ chart }) => {
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTheme, setCurrentTheme] = useState(getTheme());

  const configureMermaid = useCallback(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: currentTheme,
      securityLevel: 'loose',
      fontFamily: 'Inter, sans-serif',
      themeVariables: {
        background: currentTheme === 'dark' ? '#1f2937' : '#f9fafb',
        primaryColor: currentTheme === 'dark' ? '#374151' : '#e5e7eb',
        primaryTextColor: currentTheme === 'dark' ? '#f9fafb' : '#111827',
        lineColor: currentTheme === 'dark' ? '#4b5563' : '#d1d5db',
        secondaryColor: '#60A5FA',
      },
    });
  }, [currentTheme]);

  const renderDiagram = useCallback(async () => {
    if (!chart) {
        setIsLoading(false);
        setError(null);
        setSvg(null);
        return;
    }
    
    setIsLoading(true);
    setError(null);
    configureMermaid();

    try {
      await mermaid.parse(chart);
      const { svg: renderedSvg } = await mermaid.render(`mermaid-diagram-${Date.now()}`, chart);
      setSvg(renderedSvg);
    } catch (e: any) {
      console.error("Mermaid rendering error:", e);
      const message = e.message || "Failed to render diagram. The AI might have generated invalid syntax.";
      setError(message.includes("Max character length exceeded") ? "Diagram is too large to render." : message);
      setSvg(null);
    } finally {
      setIsLoading(false);
    }
  }, [chart, configureMermaid]);
  
  useEffect(() => {
    renderDiagram();
  }, [chart, renderDiagram]);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      const newTheme = getTheme();
      if (newTheme !== currentTheme) {
        setCurrentTheme(newTheme);
      }
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, [currentTheme]);

  if (isLoading) {
    return <LoadingSpinner text="Rendering diagram..." />;
  }

  if (error) {
    return <Alert type="error" title="Diagram Error" message={error} />;
  }

  if (svg) {
    return <div key={currentTheme} className="w-full flex justify-center p-4 bg-secondary/20 rounded-md" dangerouslySetInnerHTML={{ __html: svg }} />;
  }

  return null;
};

export default MermaidDiagram;
