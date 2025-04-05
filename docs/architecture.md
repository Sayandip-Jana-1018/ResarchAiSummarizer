# AI Summarizer Architecture

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│                        Client Application                        │
│                                                                 │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│                        Next.js API Routes                        │
│                                                                 │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Two-Layer Processing                        │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                                                         │   │
│  │                 Layer 1: Text Extraction                │   │
│  │                                                         │   │
│  │  ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐  │   │
│  │  │   PDF   │   │  Image  │   │Document │   │  Other  │  │   │
│  │  │Extractor│   │   OCR   │   │ Parser  │   │ Parsers │  │   │
│  │  └─────────┘   └─────────┘   └─────────┘   └─────────┘  │   │
│  │                                                         │   │
│  └──────────────────────────┬──────────────────────────────┘   │
│                             │                                  │
│                             ▼                                  │
│                                                                │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                                                         │   │
│  │               Layer 2: AI Summarization                 │   │
│  │                                                         │   │
│  │  ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐  │   │
│  │  │  Gemini │   │  OpenAI │   │ Mistral │   │ Claude  │  │   │
│  │  │   API   │   │   API   │   │   API   │   │   API   │  │   │
│  │  └─────────┘   └─────────┘   └─────────┘   └─────────┘  │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│                        Supabase Backend                         │
│                                                                 │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────────────┐   │
│  │             │   │             │   │                     │   │
│  │    Auth     │   │   Storage   │   │      Database       │   │
│  │             │   │             │   │                     │   │
│  └─────────────┘   └─────────────┘   └─────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

1. **User Upload**:
   - User uploads a document through the client application
   - File is validated and stored in Supabase Storage

2. **Text Extraction (Layer 1)**:
   - API retrieves the file from storage
   - Based on file type, the appropriate extractor is used
   - Raw text is extracted from the document

3. **AI Summarization (Layer 2)**:
   - Extracted text is sent to the selected AI model
   - User's subscription tier determines available models
   - AI generates a formatted summary based on user options

4. **Storage and Display**:
   - Summary is stored in the database
   - Both the summary and extracted text are returned to the client
   - Client displays the summary with options for editing and saving

## Subscription Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│             │     │             │     │             │
│  Basic Plan │ ──► │ Silver Plan │ ──► │  Gold Plan  │
│             │     │             │     │             │
└─────────────┘     └─────────────┘     └─────────────┘
       │                  │                   │
       ▼                  ▼                   ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Gemini AI  │     │  Gemini AI  │     │  Gemini AI  │
│             │     │  OpenAI     │     │  OpenAI     │
│             │     │             │     │  Mistral    │
│             │     │             │     │  Claude     │
└─────────────┘     └─────────────┘     └─────────────┘
       │                  │                   │
       ▼                  ▼                   ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ 5 summaries │     │20 summaries │     │50 summaries │
│  per day    │     │  per day    │     │  per day    │
└─────────────┘     └─────────────┘     └─────────────┘
       │                  │                   │
       ▼                  ▼                   ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Max 10MB   │     │  Max 25MB   │     │  Max 50MB   │
│  file size  │     │  file size  │     │  file size  │
└─────────────┘     └─────────────┘     └─────────────┘
```

## Database Schema

```
┌────────────────┐       ┌────────────────┐       ┌────────────────┐
│    profiles    │       │user_subscription│       │   summaries    │
├────────────────┤       ├────────────────┤       ├────────────────┤
│ id             │       │ id             │       │ id             │
│ email          │◄──────┤ user_id        │       │ user_id        │
│ full_name      │       │ plan           │       │ title          │
│ avatar_url     │       │ active         │       │ summary        │
│ created_at     │       │ payment_id     │       │ original_text  │
│ updated_at     │       │ start_date     │       │ file_path      │
└────────────────┘       │ end_date       │       │ file_name      │
                         │ is_yearly      │       │ file_type      │
                         │ created_at     │       │ model          │
                         │ updated_at     │       │ word_count     │
                         └────────────────┘       │ processing_time│
                                                  │ options        │
                                                  │ created_at     │
                                                  │ updated_at     │
                                                  └────────────────┘
                                                         ▲
                                                         │
┌────────────────┐                                       │
│subscription_plan│                                       │
├────────────────┤                                       │
│ id             │                                       │
│ name           │                                       │
│ description    │                                       │
│ price_monthly  │                                       │
│ price_yearly   │                                       │
│ features       │                                       │
│ created_at     │                                       │
└────────────────┘                                       │
                                                         │
                                                  ┌────────────────┐
                                                  │  storage.files │
                                                  ├────────────────┤
                                                  │ id             │
                                                  │ bucket_id      │
                                                  │ name           │
                                                  │ size           │
                                                  │ mime_type      │
                                                  │ path           │
                                                  │ created_at     │
                                                  │ updated_at     │
                                                  └────────────────┘
```
