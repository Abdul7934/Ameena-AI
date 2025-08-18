

## �� **Project Overview**
**Ameena AI** is an intelligent educational platform that transforms any content (text, YouTube videos, or files) into comprehensive study materials using Google's Gemini AI. It's designed to help students and learners create personalized study experiences with AI-generated notes, quizzes, presentations, and interactive learning tools.

## 🛠️ **Tech Stack & Architecture**

### **Frontend Framework**
- **React 19.1.0** - Latest React with modern hooks and features
- **TypeScript 5.8.2** - Full type safety and modern JavaScript features
- **React Router DOM 7.6.2** - Client-side routing with hash routing

### **Build Tools & Development**
- **Vite 6.2.0** - Ultra-fast build tool and dev server
- **ES Modules** - Modern JavaScript module system
- **Path Aliases** - Clean imports with `@/` prefix

### **Styling & UI**
- **Tailwind CSS** - Utility-first CSS framework via CDN
- **Custom CSS Variables** - CSS custom properties for theming
- **Responsive Design** - Mobile-first approach with breakpoints
- **Dark/Light Theme** - Toggle between themes with localStorage persistence

### **AI & External Services**
- **Google Gemini AI** - Primary AI engine for content generation
  - `gemini-2.5-flash` for text processing
  - `imagen-3.0-generate-002` for image generation
- **Google Search Integration** - Real-time information retrieval
- **ESM.sh CDN** - External package delivery for dependencies

### **Additional Libraries**
- **PptxGenJS** - PowerPoint presentation generation
- **Mermaid.js** - Diagram and flowchart generation
- **React Icons** - Custom icon system

## 🏗️ **Project Structure**

```
ameena-ai/
├── components/          # Reusable UI components
│   ├── common/         # Generic components (Button, Alert, etc.)
│   └── icons/          # Custom icon components
├── contexts/           # React Context for state management
├── hooks/              # Custom React hooks
├── pages/              # Main application pages
├── services/           # API and external service integrations
├── types/              # TypeScript type definitions
└── constants.ts        # Application constants
```

## 🎯 **Core Features & Functionality**

### **1. Content Input & Processing**
- **Text Input** - Direct text pasting for study material
- **YouTube Integration** - Extract transcripts from video URLs
- **File Upload** - Process various file types (PDFs, documents)
- **AI Metadata Generation** - Automatic title, subject, topic, and difficulty detection

### **2. AI-Powered Study Materials**
- **Smart Summaries** - Concise content summaries (100-150 words)
- **Detailed Explanations** - Teacher-like explanations with analogies
- **Multi-level Notes** - Three detail levels:
  - **Short (2M)**: 3-5 bullet points
  - **Medium (5M)**: Core concepts with structure
  - **Detailed (10M)**: Comprehensive coverage

### **3. Interactive Learning Tools**
- **Quiz Generation** - AI-created questions with mixed formats:
  - Multiple Choice Questions (MCQ)
  - Short Answer Questions
- **Performance Feedback** - Personalized AI feedback based on quiz scores
- **Progress Tracking** - Quiz history and performance analytics

### **4. Visual Content Creation**
- **Presentation Generation** - PowerPoint-style slides with:
  - Professional slide content
  - AI-generated background images
  - 16:9 aspect ratio optimization
- **Block Diagrams** - Mermaid.js flowcharts and diagrams
- **Video Assets** - Scene-by-scene breakdowns with cinematic images

### **5. Advanced AI Features**
- **Chat Interface** - Interactive AI conversations
- **Google Search Integration** - Real-time information retrieval
- **Rate Limiting** - Intelligent retry mechanisms with exponential backoff
- **Error Handling** - Graceful fallbacks and user-friendly error messages

## 🔧 **How to Use This Project**

### **Prerequisites**
- **Node.js** (Latest LTS version)
- **npm** or **yarn** package manager
- **Google Gemini API Key** (Required for AI features)

### **Setup Instructions**

1. **Clone & Install**
   ```bash
   git clone <repository-url>
   cd ameena-ai
   npm install
   ```

2. **Environment Configuration**
   ```bash
   # Create .env.local file
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

3. **Run Development Server**
   ```bash
   npm run dev
   ```

4. **Build for Production**
   ```bash
   npm run build
   npm run preview
   ```

### **Usage Workflow**

1. **Upload Content** - Paste text, add YouTube URL, or upload files
2. **AI Processing** - Let AI analyze and suggest metadata
3. **Generate Materials** - Create notes, explanations, and summaries
4. **Study & Quiz** - Use generated materials and test knowledge
5. **Create Presentations** - Generate visual slides with AI images
6. **Track Progress** - Monitor learning progress and quiz performance

## �� **Key Benefits**

- **Personalized Learning** - AI adapts content to individual needs
- **Multi-format Support** - Handle text, video, and document inputs
- **Visual Learning** - Diagrams, presentations, and AI-generated images
- **Interactive Assessment** - Quizzes with intelligent feedback
- **Professional Output** - Presentation-ready materials
- **Modern UI/UX** - Clean, responsive design with dark/light themes

## 🔒 **Security & Configuration**

- **Environment Variables** - Secure API key management
- **Rate Limiting** - Built-in protection against API abuse
- **Error Boundaries** - Graceful error handling
- **Type Safety** - Full TypeScript coverage for reliability

## 🚀 **Deployment Options**

- **Static Hosting** - Deploy built files to any static host
- **Vercel/Netlify** - Easy deployment with build automation
- **Custom Server** - Serve with any Node.js server
- **CDN Distribution** - Optimize for global performance

This project represents a cutting-edge approach to AI-powered education, combining modern web technologies with advanced AI capabilities to create a comprehensive learning platform. It's perfect for students, educators, and anyone looking to transform content into engaging, interactive study materials. add this project details to featured project section in this website
