'use client';

import { ChangeEvent, useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { 
  Loader2, 
  UploadCloud, 
  X, 
  ShieldCheck, 
  History as HistoryIcon, 
  Clock, 
  ArrowLeft,
  Camera,
  RotateCw,
  Wifi,
  WifiOff,
  Stethoscope,
  Wrench,
  Sprout,
  AlertTriangle
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { getPlantDiseasePrediction, PredictionResult } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import type { PlantDiseasePrediction } from '@/app/actions';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// Firebase Imports
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, query, orderBy, limit } from 'firebase/firestore';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { initiateAnonymousSignIn } from '@/firebase/non-blocking-login';
import { useAuth } from '@/firebase/provider';

export function PlantDiseasePredictor() {
  const [activeTab, setActiveTab] = useState('analyze');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [prediction, setPrediction] = useState<PlantDiseasePrediction | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [language, setLanguage] = useState('english');
  const [isOnline, setIsOnline] = useState(true);
  
  // Camera States
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Firebase Hooks
  const { firestore } = useFirestore();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();

  // Network Status
  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Initialize Anonymous Sign-In
  useEffect(() => {
    if (!user && !isUserLoading && auth) {
      initiateAnonymousSignIn(auth);
    }
  }, [user, isUserLoading, auth]);

  // Camera Management
  useEffect(() => {
    let stream: MediaStream | null = null;
    if (isCameraActive) {
      const getCamera = async () => {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'environment' } 
          });
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        } catch (error) {
          console.error('Error accessing camera:', error);
          setIsCameraActive(false);
          toast({
            variant: 'destructive',
            title: 'Camera Access Denied',
            description: 'Please enable camera permissions to take photos of your plants.',
          });
        }
      };
      getCamera();
    }
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isCameraActive, toast]);

  // History Query
  const historyQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, 'users', user.uid, 'predictions'),
      orderBy('predictionTimestamp', 'desc'),
      limit(10)
    );
  }, [firestore, user?.uid]);

  const { data: history, isLoading: isHistoryLoading } = useCollection(historyQuery);

  const processFile = (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'Image too large',
        description: 'Please upload an image smaller than 5MB.',
        variant: 'destructive',
      });
      return;
    }
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
    setPrediction(null);
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setImagePreview(dataUrl);
        
        fetch(dataUrl)
          .then(res => res.blob())
          .then(blob => {
            const file = new File([blob], "camera_capture.jpg", { type: "image/jpeg" });
            setImageFile(file);
          });
        
        setIsCameraActive(false);
        setPrediction(null);
      }
    }
  };

  const clearImage = () => {
    setImagePreview(null);
    setImageFile(null);
    setPrediction(null);
    setIsCameraActive(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const selectHistoryItem = (scan: any) => {
    setPrediction({
      disease: scan.predictedDiseaseName,
      confidence: scan.confidenceScore,
      treatment: scan.treatment || [],
      prevention: scan.prevention || [],
      description: scan.description || '',
    });
    setImagePreview(null);
    setImageFile(null);
    setActiveTab('analyze');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async () => {
    if (!isOnline) {
      toast({
        title: 'Offline Mode',
        description: 'Internet connection is required for AI analysis.',
        variant: 'destructive',
      });
      return;
    }

    if (!imageFile) {
      toast({
        title: 'No Image Selected',
        description: 'Please take a photo or upload a file first.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    setPrediction(null);

    const formData = new FormData();
    formData.append('image', imageFile);
    formData.append('language', language);

    const result: PredictionResult = await getPlantDiseasePrediction(formData);

    setIsLoading(false);

    if (result.error) {
      toast({
        title: 'Analysis failed',
        description: result.error,
        variant: 'destructive',
      });
    } else if (result.data) {
      setPrediction(result.data);
      
      if (firestore && user) {
        setIsSaving(true);
        const predictionRef = doc(collection(firestore, 'users', user.uid, 'predictions'));
        const predictionData = {
          id: predictionRef.id,
          modelId: 'gemini-2.5-flash-v1',
          predictionTimestamp: new Date().toISOString(),
          predictedDiseaseName: result.data.disease,
          confidenceScore: result.data.confidence,
          treatment: result.data.treatment,
          prevention: result.data.prevention,
          description: result.data.description || '',
          language: language
        };

        setDocumentNonBlocking(predictionRef, predictionData, { merge: true });
        setTimeout(() => setIsSaving(false), 800);
      }
    }
  };

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6 h-12">
          <TabsTrigger value="analyze" className="text-sm font-bold">New Diagnosis</TabsTrigger>
          <TabsTrigger value="history" className="text-sm font-bold">Previous Scans</TabsTrigger>
        </TabsList>

        <TabsContent value="analyze" className="space-y-4">
          <Card className="shadow-2xl border-primary/20 overflow-hidden">
            <CardHeader className="bg-primary/5 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="font-black text-2xl text-primary">LeafGuard Advisor</CardTitle>
                  <CardDescription className="text-muted-foreground font-medium">Identify issues and save your harvest.</CardDescription>
                </div>
                {isOnline ? (
                  <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200">Online</Badge>
                ) : (
                  <Badge variant="destructive">Offline</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              {!prediction || imageFile ? (
                <>
                  <div className="space-y-3">
                    <Label className="text-sm font-bold flex items-center gap-2">
                      <RotateCw className="h-4 w-4 text-primary" /> Select Language
                    </Label>
                    <RadioGroup value={language} onValueChange={setLanguage} className="grid grid-cols-3 gap-2">
                      {['english', 'hindi', 'marathi'].map((lang) => (
                        <div 
                          key={lang}
                          className={`flex items-center space-x-2 rounded-xl border-2 p-3 transition-all cursor-pointer ${language === lang ? 'border-primary bg-primary/5' : 'border-muted'}`} 
                          onClick={() => setLanguage(lang)}
                        >
                          <RadioGroupItem value={lang} id={`l-${lang}`} className="sr-only" />
                          <Label htmlFor={`l-${lang}`} className="cursor-pointer font-bold w-full text-center capitalize">
                            {lang === 'hindi' ? 'हिन्दी' : lang === 'marathi' ? 'मराठी' : 'English'}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>

                  {isCameraActive ? (
                    <div className="relative rounded-2xl overflow-hidden bg-black aspect-[4/3] flex items-center justify-center">
                      <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
                      <canvas ref={canvasRef} className="hidden" />
                      <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-4">
                        <Button size="lg" variant="destructive" onClick={() => setIsCameraActive(false)} className="rounded-full h-14 w-14 p-0 shadow-xl">
                          <X className="h-6 w-6" />
                        </Button>
                        <Button size="lg" onClick={capturePhoto} className="rounded-full h-14 w-14 p-0 shadow-xl bg-white text-primary hover:bg-white/90 border-4 border-primary">
                          <div className="h-8 w-8 rounded-full bg-primary" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      <div 
                        className="flex flex-col items-center justify-center h-48 rounded-2xl border-4 border-dashed border-primary/20 bg-primary/5 hover:bg-primary/10 transition-all cursor-pointer group"
                        onClick={() => setIsCameraActive(true)}
                      >
                        <Camera className="h-12 w-12 text-primary mb-2 group-hover:scale-110 transition-transform" />
                        <span className="font-bold text-lg">Use Camera</span>
                      </div>
                      <div 
                        className="flex flex-col items-center justify-center h-48 rounded-2xl border-4 border-dashed border-accent/20 bg-accent/5 hover:bg-accent/10 transition-all cursor-pointer group"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <UploadCloud className="h-12 w-12 text-accent mb-2 group-hover:scale-110 transition-transform" />
                        <span className="font-bold text-lg">Upload Photo</span>
                      </div>
                    </div>
                  )}

                  {imagePreview && !isCameraActive && (
                    <div className="relative w-full aspect-video rounded-2xl overflow-hidden border-4 border-primary/10 shadow-lg">
                      <Image src={imagePreview} alt="Leaf Preview" fill className="object-cover" />
                      <Button variant="destructive" size="icon" className="absolute top-2 right-2 rounded-full h-10 w-10 shadow-lg" onClick={clearImage}>
                        <X className="h-5 w-5" />
                      </Button>
                    </div>
                  )}
                  <Input ref={fileInputRef} type="file" className="hidden" onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0])} accept="image/*" />
                </>
              ) : (
                <div className="flex justify-between items-center bg-muted/30 p-4 rounded-xl border">
                   <div className="flex items-center gap-3">
                     <div className="relative h-16 w-16 rounded-lg overflow-hidden border-2 border-primary/20">
                       <Image src={imagePreview || 'https://picsum.photos/seed/1/100/100'} alt="Analysis" fill className="object-cover" />
                     </div>
                     <p className="font-bold text-sm">Diagnosis Complete</p>
                   </div>
                   <Button variant="outline" size="sm" onClick={clearImage} className="font-bold">
                     <RotateCw className="h-4 w-4 mr-2" /> New Scan
                   </Button>
                </div>
              )}
            </CardContent>
            
            <CardFooter className="bg-muted/30 p-6 border-t flex flex-col gap-4">
              <Button 
                onClick={handleSubmit} 
                disabled={!imageFile || isLoading || !isOnline} 
                className="w-full h-14 text-xl font-black shadow-lg"
              >
                {isLoading ? <><Loader2 className="mr-3 h-6 w-6 animate-spin" /> Analyzing...</> : 'Check Plant Health'}
              </Button>
              {isSaving && <p className="text-center text-xs text-primary font-bold animate-pulse">Saving record to cloud...</p>}
            </CardFooter>

            {prediction && (
              <div className="border-t-8 border-primary/20 pb-10">
                <div className="p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex flex-col gap-4">
                    <div className="flex justify-between items-end">
                       <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                         <Stethoscope className="h-4 w-4" /> The Problem
                       </h3>
                       <Badge className="bg-green-500 text-white font-black">{prediction.confidence.toFixed(0)}% Confidence</Badge>
                    </div>
                    <div className="p-6 rounded-3xl bg-primary/10 border-2 border-primary/20">
                      <h2 className="text-3xl font-black text-foreground mb-2">{prediction.disease}</h2>
                      <p className="text-lg text-muted-foreground leading-relaxed font-medium">{prediction.description}</p>
                    </div>
                  </div>

                  <div className="grid gap-6">
                    <div className="space-y-4">
                      <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                        <Wrench className="h-4 w-4" /> How to fix it?
                      </h3>
                      <div className="grid gap-3">
                        {prediction.treatment.map((step, i) => (
                          <div key={i} className="flex gap-4 items-center bg-card p-4 rounded-2xl border shadow-sm">
                            <span className="h-10 w-10 shrink-0 bg-primary/20 text-primary font-black flex items-center justify-center rounded-xl text-lg">{i + 1}</span>
                            <span className="font-bold text-muted-foreground">{step}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4" /> Prevention Tips
                      </h3>
                      <div className="grid gap-3">
                        {prediction.prevention.map((tip, i) => (
                          <div key={i} className="flex gap-4 items-center bg-accent/5 p-4 rounded-2xl border border-accent/10 shadow-sm">
                            <Sprout className="h-6 w-6 text-accent shrink-0" />
                            <span className="font-bold text-muted-foreground">{tip}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <Alert className="bg-yellow-50 border-yellow-200">
                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                    <AlertDescription className="text-xs text-yellow-800">
                      <strong>Note:</strong> This is an AI analysis. For critical issues, consult your local agricultural expert.
                    </AlertDescription>
                  </Alert>
                </div>
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-black">
                <HistoryIcon className="h-6 w-6 text-primary" />
                Scan History
              </CardTitle>
              <CardDescription className="font-medium">Track your farm's health over time.</CardDescription>
            </CardHeader>
            <CardContent>
              {isHistoryLoading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <Loader2 className="h-10 w-10 animate-spin text-primary/40" />
                  <p className="text-sm font-bold text-muted-foreground">Loading your records...</p>
                </div>
              ) : !history || history.length === 0 ? (
                <div className="text-center py-20 px-6 border-4 border-dashed rounded-3xl bg-muted/20">
                  <HistoryIcon className="mx-auto h-16 w-16 text-muted-foreground/30 mb-4" />
                  <h3 className="text-lg font-black text-muted-foreground">No scans found</h3>
                  <Button variant="outline" className="mt-6 font-bold" onClick={() => setActiveTab('analyze')}>New Analysis</Button>
                </div>
              ) : (
                <div className="grid gap-3">
                  {history.map((scan) => (
                    <div 
                      key={scan.id} 
                      className="flex items-center justify-between p-4 rounded-2xl border-2 hover:border-primary transition-all cursor-pointer group"
                      onClick={() => selectHistoryItem(scan)}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                           <h4 className="font-black text-lg text-foreground">{scan.predictedDiseaseName}</h4>
                           <Badge className="bg-primary/10 text-primary border-none">{scan.confidenceScore.toFixed(0)}%</Badge>
                        </div>
                        <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase">
                          <Clock className="h-3 w-3" />
                          {new Date(scan.predictionTimestamp).toLocaleDateString()}
                        </div>
                      </div>
                      <ArrowLeft className="h-5 w-5 text-muted-foreground group-hover:text-primary rotate-180 transition-transform" />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
