# Two-Layer Document Processing Approach

This document explains the two-layer document processing approach implemented in the AI Scientific Research Summarizer.

## Overview

The application uses a sophisticated two-layer approach for processing documents:

1. **Layer 1: Text Extraction** - Extract raw text from various document formats using specialized libraries
2. **Layer 2: AI Summarization** - Process the extracted text using AI models to generate concise, formatted summaries

This approach provides several advantages:
- Specialized handling for each file type ensures optimal text extraction
- Separation of concerns allows for easier maintenance and updates
- Flexibility to swap out AI models without affecting the extraction process
- Better error handling and debugging at each layer

## Layer 1: Text Extraction

### Supported File Types

| File Type | Extensions | Library Used |
|-----------|------------|--------------|
| PDF | .pdf | pdf-parse |
| Images | .jpg, .jpeg, .png, .webp, .gif, .bmp, .tiff | tesseract.js |
| Documents | .doc, .docx, .txt, .rtf, .odt | docx-parser |
| Spreadsheets | .csv, .xls, .xlsx | xlsx |
| Presentations | .ppt, .pptx | pptx-parser |
| Web Content | .html, .htm, .url | node-html-parser |

### Implementation

The text extraction layer is implemented in `src/utils/textExtraction.ts`. The main function is `extractTextFromFile`, which:

1. Identifies the file type based on extension
2. Routes to the appropriate specialized extraction function
3. Returns the extracted text

Example:
```typescript
// Extract text from a PDF file
const extractedText = await extractTextFromFile(fileUrl, 'pdf');
```

### Error Handling

Each extraction function includes robust error handling to:
- Detect and report file corruption
- Handle encoding issues
- Manage memory efficiently for large files
- Provide meaningful error messages

## Layer 2: AI Summarization

### Supported AI Models

| Model | Provider | Subscription Tier |
|-------|----------|-------------------|
| Gemini | Google | Basic, Silver, Gold |
| GPT-4 | OpenAI | Silver, Gold |
| Mistral Large | Mistral AI | Gold |
| Claude 3 | Anthropic | Gold |

### Customization Options

Users can customize their summaries with the following options:

| Option | Values | Description |
|--------|--------|-------------|
| Length | short, medium, long | Controls the length of the summary |
| Style | academic, casual, technical, simplified | Determines the writing style |
| Focus | comprehensive, methodology, results, conclusions | Sets the focus area of the summary |
| Language | english, spanish, french, etc. | Output language for the summary |

### Implementation

The AI summarization layer is implemented in `src/utils/aiModels.ts`. The main function is `summarizeWithAI`, which:

1. Takes the extracted text and user options
2. Generates an appropriate prompt for the selected AI model
3. Calls the corresponding AI service
4. Formats and returns the summary

Example:
```typescript
// Generate a summary using OpenAI
const { summary, processingTime } = await summarizeWithAI(
  extractedText,
  'openai',
  { length: 'medium', style: 'academic', focus: 'comprehensive', language: 'english' }
);
```

## API Integration

The two-layer approach is integrated into the application's API at `src/pages/api/summarize.ts`. The API endpoint:

1. Receives the file URL, type, and summarization options
2. Validates the user's subscription and model access
3. Calls Layer 1 to extract text from the document
4. Passes the extracted text to Layer 2 for AI summarization
5. Returns both the summary and the extracted text to the client
6. Stores the summary in the database for future reference

## Error Handling and Fallbacks

The system includes several fallback mechanisms:

1. If text extraction fails for a specific file type, the API returns a clear error message
2. If an AI model is unavailable, the system can fall back to an alternative model
3. Rate limiting is implemented to prevent abuse of AI services
4. Timeout handling ensures the process doesn't hang indefinitely

## Performance Considerations

To optimize performance:

1. Text extraction is performed asynchronously
2. Large files are processed in chunks to manage memory usage
3. AI requests include appropriate timeouts
4. Results are cached when possible to reduce redundant processing

## Future Enhancements

Planned enhancements to the two-layer approach:

1. Support for additional file formats (e.g., LaTeX, Markdown)
2. Integration with more AI models as they become available
3. Enhanced preprocessing of extracted text for better AI input
4. Fine-tuning of AI models specifically for scientific document summarization
5. Implementation of a feedback loop to improve summarization quality over time
