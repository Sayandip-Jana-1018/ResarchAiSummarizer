import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Extract request body
    const { document_id, document_text, chunk_size, chunk_overlap } = req.body;

    // Call the RAG backend API
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';
    console.log(`Calling backend at ${backendUrl}/api/rag/process-document`);

    const response = await fetch(`${backendUrl}/api/rag/process-document`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        document_id,
        document_text,
        chunk_size,
        chunk_overlap
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Backend returned error (${response.status}):`, errorText);
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        errorData = { error: errorText || `Backend error: ${response.status}` };
      }
      return res.status(response.status).json(errorData);
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    console.error('Error processing document for RAG:', error);
    return res.status(500).json({ error: 'Internal server error', details: error instanceof Error ? error.message : String(error) });
  }
}
