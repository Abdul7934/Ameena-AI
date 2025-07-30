import React from 'react';
import { InformationCircleIcon, CheckCircleIcon, XCircleIcon, SparklesIcon } from '../icons/Icons';

interface AlertProps {
  type: 'info' | 'success' | 'error' | 'warning';
  title?: string;
  message: string;
  className?: string;
}

const Alert: React.FC<AlertProps> = ({ type, title, message, className = '' }) => {
  const baseStyles = "relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4"; 
  
  const typeStyles = {
    info: {
      styleClass: 'bg-background text-foreground border-border',
      IconComponent: InformationCircleIcon,
    },
    success: {
       styleClass: 'border-green-500/50 text-green-700 dark:text-green-300 bg-green-500/10',
       IconComponent: CheckCircleIcon,
    },
    error: {
      styleClass: 'border-destructive/50 text-destructive dark:text-red-400 bg-destructive/10',
      IconComponent: XCircleIcon,
    },
    warning: {
      styleClass: 'border-yellow-500/50 text-yellow-700 dark:text-yellow-300 bg-yellow-500/10',
      IconComponent: SparklesIcon,
    },
  };

  const currentStyle = typeStyles[type];
  const Icon = currentStyle.IconComponent;

  return (
    <div className={`${baseStyles} ${currentStyle.styleClass} ${className}`}>
      <Icon className="h-5 w-5" aria-hidden="true" />
      <div>
        {title && <h5 className="mb-1 font-medium leading-none tracking-tight">{title}</h5>}
        <div className="text-sm [&_p]:leading-relaxed">
          <p>{message}</p>
        </div>
      </div>
    </div>
  );
};

export default Alert;