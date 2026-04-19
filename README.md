# 🌿 LeafGuard AI – Plant Disease Detection System

LeafGuard AI is a modern web application that helps users detect plant diseases instantly using AI. Users can capture or upload a leaf image, and the system analyzes it to identify possible diseases and provide recommendations.

---

## 🚀 Features

* 📷 **Camera Capture & Upload**
  Capture plant images directly using camera or upload from device

* 🤖 **AI-Based Detection**
  Uses Google Gemini AI for plant disease identification

* ☁️ **Firebase Integration**

  * Store images in Firebase Storage
  * Save scan history in Firestore

* 📊 **Scan History**
  View previously scanned plant results

* 🌱 **Farmer-Friendly UI**
  Simple and easy-to-use interface

---

## 🛠️ Tech Stack

* **Frontend:** Next.js (App Router), Tailwind CSS
* **Backend:** Next.js Server Actions
* **AI:** Google Gemini (via Genkit)
* **Database:** Firebase Firestore
* **Storage:** Firebase Storage

---

## 🧠 How It Works

1. User captures/uploads a plant leaf image
2. Image is uploaded to Firebase Storage
3. Image URL is sent to Gemini AI
4. AI analyzes and returns:

   * Disease name
   * Confidence level
   * Prevention tips
5. Results are stored in Firestore
6. Output is displayed to the user

---

## 📂 Project Structure

```
src/
 ├── app/
 ├── components/
 ├── lib/
 │    └── firebase.ts
 ├── hooks/
 └── firebase/
```

---

## ⚙️ Setup Instructions

### 1. Clone the repository

```
git clone https://github.com/your-username/leafguard-ai.git
cd leafguard-ai
```

### 2. Install dependencies

```
npm install
```

### 3. Add environment variables

Create `.env.local` file:

```
NEXT_PUBLIC_FIREBASE_API_KEY=your_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=xxxx
NEXT_PUBLIC_FIREBASE_APP_ID=xxxx
```

### 4. Run the project

```
npm run dev
```

Open: http://localhost:3000

---

## 🔒 Firebase Setup

* Enable **Firestore Database**
* Enable **Firebase Storage**
* Update security rules (for development)

---

## 📌 Future Improvements

* 🌍 Multilingual support
* 📱 Mobile app version
* 🧠 Custom trained ML model (TensorFlow Lite)
* 📷 Real-time detection

---

## ⚠️ Disclaimer

This project uses a general AI model (Gemini) for disease detection. Results may not always be 100% accurate and should be verified by agricultural experts.

---

## 👨‍💻 Author

* Your Name

---

## ⭐ Support

If you like this project, give it a ⭐ on GitHub!
