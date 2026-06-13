import { GoogleGenAI } from "@google/genai";

// Initialize Gemini Client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

export default async function handler(req: any, res: any) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { audioData, mimeType, locale = "en" } = req.body;

    if (!audioData) {
      console.error("❌ No audio data in request");
      return res.status(400).json({ error: "Audio data is required." });
    }

    console.log("🎤 Transcribing Android audio with Gemini AI...");
    console.log("📊 Request details:", {
      audioSize: audioData.length,
      mimeType: mimeType || "not provided",
      locale
    });

    // Ultra-precise transcription prompt
    const transcriptionPrompt = `You are a precise audio transcription AI. Your ONLY job is to transcribe the audio EXACTLY as spoken.

CRITICAL RULES:
1. Transcribe word-for-word what you hear - DO NOT interpret, summarize, or add context
2. For numbers, write them as digits (e.g., "one hundred" → "100", "forty five thousand" → "45000")
3. Keep the natural language structure as spoken
4. DO NOT add punctuation unless clearly spoken
5. DO NOT add explanations or notes
6. Output ONLY the transcribed text, nothing else

Common phrases to recognize:
- "spent [number] on [item]"
- "received [number]"
- "salary [number]"
- "paid [number] for [item]"

Examples:
Audio: "spent one hundred rupees on food today"
Output: spent 100 on food today

Audio: "received salary forty five thousand"
Output: received salary 45000

Audio: "petrol three hundred"
Output: petrol 300

Now transcribe this audio exactly as spoken:`;

    console.log("📤 Sending to Gemini AI...");

    // Use gemini-1.5-flash-latest which is free and supports audio
    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash-latest",
      contents: [
        transcriptionPrompt,
        {
          inlineData: {
            mimeType: mimeType || "audio/webm",
            data: audioData
          }
        }
      ],
      config: {
        temperature: 0,
        topK: 1,
        topP: 0.8,
        maxOutputTokens: 200
      }
    });

    let transcript = response.text.trim();
    
    console.log("🔍 Raw AI response:", transcript);
    
    // Aggressive cleaning
    transcript = transcript
      .replace(/^["'\s`]+|["'\s`]+$/g, "") // Remove quotes, backticks, spaces
      .replace(/^(output:|transcription:|result:)/gi, "") // Remove labels
      .replace(/\n+/g, " ") // Single line
      .replace(/\s+/g, " ") // Single spaces
      .replace(/[*_]/g, "") // Remove markdown
      .toLowerCase() // Normalize to lowercase
      .trim();
    
    console.log("✅ Cleaned transcription:", transcript);

    if (!transcript || transcript.length === 0) {
      console.error("❌ Empty transcript from Gemini");
      return res.status(500).json({ 
        error: "No speech detected in audio. Please speak clearly and closer to the microphone.",
        transcript: ""
      });
    }

    res.json({
      transcript,
      confidence: 1.0,
      model: "gemini-1.5-flash-latest"
    });
  } catch (error: any) {
    console.error("❌ Transcription error:", error);
    console.error("Error details:", {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code
    });
    res.status(500).json({
      error: error.message || "Failed to transcribe audio",
      fallback: true
    });
  }
}
