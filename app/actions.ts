'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';

/**
 * @fileOverview Modular Server Action for Plant Disease Classification.
 * Uses Gemini via Genkit to provide farmer-friendly advice.
 */

const PlantDiseaseOutputSchema = z.object({
  disease: z.string().describe('Common name of the problem (e.g., "Tomato Early Blight"). Use simple terms.'),
  description: z.string().describe('A simple, 1-2 sentence explanation of what is happening to the plant.'),
  confidence: z.number().describe('The confidence score (0-100).'),
  treatment: z.array(z.string()).describe('3-5 clear, easy steps to fix the problem right now.'),
  prevention: z.array(z.string()).describe('3-5 simple tips to prevent it next season.'),
});

export type PlantDiseasePrediction = z.infer<typeof PlantDiseaseOutputSchema>;

export type PredictionResult = {
  data: PlantDiseasePrediction | null;
  error: string | null;
};

async function readFileAsDataURI(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const base64 = buffer.toString('base64');
  return `data:${file.type};base64,${base64}`;
}

const plantDiseasePrompt = ai.definePrompt({
  name: 'plantDiseasePrompt',
  input: {
    schema: z.object({
      imageDataUri: z.string(),
      language: z.string(),
    })
  },
  output: { schema: PlantDiseaseOutputSchema },
  prompt: `You are an expert Agricultural Advisor helping a local farmer.

CRITICAL INSTRUCTION: You must respond ENTIRELY in the language: {{{language}}}.
Every text field in the output JSON (disease, description, treatment steps, prevention tips) MUST be written in {{{language}}}.

TASK:
1. Analyze the leaf image for diseases.
2. Use very SIMPLE, NON-TECHNICAL language that a farmer would understand. Avoid complex scientific jargon.
3. If the plant is healthy, set "disease" to "Healthy" (translated to {{{language}}}) and provide general care tips in treatment.
4. "treatment": Provide 3-5 low-cost, effective steps for a farmer to take immediately.
5. "prevention": Provide 3-5 simple tips to stop the problem from returning.

Input Image: {{media url=imageDataUri}}`
});

export async function getPlantDiseasePrediction(
  formData: FormData
): Promise<PredictionResult> {
  const imageFile = formData.get('image') as File;
  const language = formData.get('language') as string || 'english';

  if (!imageFile) {
    return { data: null, error: 'No image file provided.' };
  }

  try {
    const imageDataUri = await readFileAsDataURI(imageFile);
    
    const langMap: Record<string, string> = {
      hindi: 'Hindi',
      marathi: 'Marathi',
      english: 'English'
    };
    
    const langLabel = langMap[language] || 'English';

    const { output } = await plantDiseasePrompt({ 
      imageDataUri, 
      language: langLabel 
    });

    if (!output) {
      throw new Error('Analysis failed.');
    }
    
    return { data: output, error: null };
  } catch (e) {
    console.error('AI Inference failed:', e);
    return { 
      data: null, 
      error: `Analysis failed. Please check your internet connection or try a clearer photo.` 
    };
  }
}
