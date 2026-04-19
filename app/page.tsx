import { Sprout } from 'lucide-react';
import { PlantDiseasePredictor } from '@/components/plant-disease-predictor';

export default function Home() {
  return (
    <div className="bg-background text-foreground">
      <div className="container mx-auto flex min-h-dvh flex-col items-center justify-center gap-12 px-4 py-16">
        <header className="flex flex-col items-center gap-4 text-center">
          <div className="inline-flex items-center gap-3 rounded-full bg-primary/10 px-4 py-2">
            <Sprout className="h-6 w-6 text-primary" />
            <span className="font-headline font-semibold text-primary">
              LeafGuard AI
            </span>
          </div>
          <h1 className="font-headline text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Detect Plant Diseases Instantly
          </h1>
          <p className="max-w-2xl text-lg text-muted-foreground">
            Upload a photo of a plant leaf, and our AI will identify potential diseases and provide a confidence score.
          </p>
        </header>
        <main className="w-full max-w-2xl">
          <PlantDiseasePredictor />
        </main>
      </div>
    </div>
  );
}
