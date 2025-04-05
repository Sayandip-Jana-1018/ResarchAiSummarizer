# Research AI Summarizer

A modern web application that uses AI to analyze and summarize documents in real-time through your camera. Perfect for researchers, students, and professionals who need quick insights from printed materials.

## Features

- **Real-Time Camera Analysis**: Capture documents through your camera and get instant AI-powered summaries
- **Multiple AI Models**: Choose between Google Gemini, OpenAI GPT, Anthropic Claude, and Mistral AI
- **Clean Summary Display**: Get concise, well-formatted summaries without metadata or formatting artifacts
- **Performance Metrics**: Track processing time, word count, and other analysis statistics
- **Camera Controls**: Select camera devices, adjust settings, and get real-time feedback
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices
- **Glassmorphic UI**: Modern, visually appealing interface with dynamic theming

## Architecture

### Hybrid Frontend/Backend Architecture

The application uses a flexible hybrid architecture that can operate in different modes:

#### Frontend (React/TypeScript)

- Handles UI rendering and user interactions
- Contains mock functions for development without backend
- Uses AI APIs directly from the frontend for summarization when needed
- Located in `src/` directory with components, utils, and pages

#### Backend (Python/FastAPI)

- Provides API endpoints for document processing
- Handles image capture and text extraction using OCR
- Uses the same AI APIs for summarization
- Located in `backend/` directory

### Document Processing Pipeline

1. **Image Capture**: Real-time camera feed with device selection and controls
2. **Text Extraction**: OCR processing to extract text from captured images
3. **AI Analysis**: Processing through selected AI model (Gemini, GPT, Claude, Mistral)

### AI Integration

The application integrates with multiple AI models for text analysis and summarization:

- **Google Gemini**: Primary model for text summarization
- **OpenAI GPT**: Alternative model for different summarization styles
- **Mistral AI**: Efficient model for faster processing
- **Anthropic Claude**: Model for more nuanced analysis

Users can customize the summarization process with options for:
- **Model Selection**: Choose the AI model that best fits your needs
- **Analysis Focus**: Get concise summaries focused on the key information

### Tech Stack

- **Frontend**: React, TypeScript, Next.js, Tailwind CSS
- **Backend**: Python, FastAPI
- **Database**: Supabase (PostgreSQL)
- **Storage**: Supabase Storage
- **Authentication**: Supabase Auth
- **UI Components**: Custom glassmorphic components with dynamic theming
- **AI Integration**: Google Gemini, OpenAI GPT, Mistral AI, Anthropic Claude

## Key Components

### Camera Page

- **Camera Feed**: Real-time video streaming with device selection
- **Image Capture**: Take snapshots of documents for analysis
- **Analysis Display**: Clean, formatted summary of the captured document
- **Stats Panel**: Track processing time, word count, and model information
- **Camera Settings**: Select camera device and AI model
- **Camera Tips**: Helpful guidance for optimal document capture

### Question & Answer Page

- **Document Context**: Select from previously analyzed documents
- **Interactive Chat**: Ask questions about the document content
- **Context-Aware Responses**: Get answers based on the document context
- **Message Formatting**: Support for basic markdown in responses
- **Real-Time Typing**: Smooth typing indicators and scrolling

## Development

### Prerequisites

- Node.js 16+
- Python 3.8+
- npm or yarn
- pip
- Supabase account
- API keys for AI services (Gemini, OpenAI, Anthropic, Mistral)

### Environment Setup

#### Frontend

Create a `.env.local` file in the root directory with:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_API_URL=http://localhost:8000
```

#### Backend

Create a `.env` file in the `backend` directory with:

```
GEMINI_API_KEY=your_gemini_api_key
OPENAI_API_KEY=your_openai_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
MISTRAL_API_KEY=your_mistral_api_key
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_service_key
```

### Installation

```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd backend
pip install -r requirements.txt

# Run frontend development server
npm run dev

# Run backend server
cd backend/app
python server.py
```

## Deployment

The application can be deployed to various platforms:

- Frontend: Vercel, Netlify, or any static hosting
- Backend: Render, Railway, or any Python hosting service

## License

MIT
