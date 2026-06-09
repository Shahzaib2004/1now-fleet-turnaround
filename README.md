# Fleet Turnaround Assistant

An AI-powered, real-time vehicle turnaround assistant built with **Next.js**, **React**, and the **OpenRouter SDK**. It helps car rental fleet operators quickly analyze check-in conditions, calculate revenue impact, verify booking windows, generate action checklists, and decide if a vehicle is ready for its next trip.

## Features

- **Quick Return Check-in Form**: Input vehicle plates/nicknames, fuel levels, current mileage vs. last service mileage, and return notes.
- **AI Image Condition Analyzer**: Upload up to 3 photos (damage, dashboard lights, interiors) and automatically analyze them to generate check-in condition notes.
- **Smart Turnaround Verdict**: Instant `GO`, `HOLD`, or `FLAG` decisions with detailed operator reasoning.
- **Time & Revenue Impact Calculation**: Calculates the financial cost of a delay based on the vehicle's Average Daily Rate (ADR).
- **Booking Window Feasibility Check**: Automatically totals estimated action times, compares them to the next booking window, warns the operator of tight/overflowing windows, and suggests items to skip if needed.
- **Urgency-based Action Items & Alerts**: Generates tasks prioritized by `NOW`, `BEFORE NEXT RENTAL`, or `THIS WEEK`, alongside severity-rated maintenance warnings.
- **Interactive Cleaning Checklist**: Displays visual prompts for flagged cleaning items.
- **Fleet Health Dashboard**: Persists local check-in histories in `localStorage` to compute a running health score per vehicle.
- **WhatsApp Summary Sharing**: Quick copy-to-clipboard button formatted for messaging team updates.
- **Robust AI Resiliency**: Automatically falls back to `openrouter/free` if the primary model (`google/gemma-4-26b-a4b-it:free`) faces rate limits or upstream provider errors.

---

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Styling**: Pure CSS Modules (Dark brutalist aesthetic with orange highlights)
- **State Management**: React Hooks (`useState`, `useEffect`)
- **Backend APIs**: 
  - `app/api/analyze/route.ts` (Turnaround decision engine)
  - `app/api/analyze-images/route.ts` (Vision-based condition notes generator)
- **AI Integration**: `@openrouter/sdk`

---

## Setup & Installation

### 1. Clone & Install Dependencies
```bash
git clone <your-repo-url>
cd fleetturnaroundmodule
npm install
```

### 2. Configure Environment Variables
Copy the `.env.example` file to create a `.env.local`:
```bash
cp .env.example .env.local
```

Open `.env.local` and add your secret **OpenRouter API Key**:
```env
# OpenRouter API Configuration
OPENROUTER_API_KEY=sk-or-v1-your-actual-api-key-here
OPENROUTER_MODEL=google/gemma-4-26b-a4b-it:free
```

> [!NOTE]  
> Because the app uses Next.js Route Handlers, your secret OpenRouter API Key remains safely on the server and is never exposed to the client browser.

---

## Running the Application

### Development Mode
To run the local development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build
To verify TypeScript checks, build the optimized project, and run it:
```bash
npm run build
npm start
```

---

## Resilient AI Failover Design

To guarantee continuous operation in high-volume environments or when using free rate-limited models, both backend routes implement a **dual-model fallback strategy**:

### 1. Check-in Analysis Flow (`/api/analyze`)

```mermaid
graph TD
    A[Frontend Form Submit] --> B[POST /api/analyze]
    B --> C{Query Primary Model<br/>gemma-4-26b-a4b-it:free}
    C -->|Success 200| D[Return Structured JSON]
    C -->|Error / 429 Rate Limit| E[Fallback to openrouter/free]
    E -->|Success 200| D
    E -->|Error 500| F[Show Error Panel to Operator]
```

### 2. Visual Photo Analysis Flow (`/api/analyze-images`)

```mermaid
graph TD
    A[Upload Photos] --> B[Base64 Conversion]
    B --> C[POST /api/analyze-images]
    C --> D{Query Vision Model<br/>gemma-4-26b-a4b-it:free}
    D -->|Success 200| E[Return Condition Notes Text]
    D -->|Error / 429 Rate Limit| F[Fallback to openrouter/free]
    F -->|Success 200| E
    F -->|Error 500| G[Show Error Alert to Operator]
    E --> H[Append to Return Condition Notes]
```


---

## AI Image Analysis Details

To optimize speed and prevent server-side timeout issues, the visual inspection tool implements the following constraints and behaviors:

1. **Size Limits**: Enforces a maximum of **3 images** per analysis and a client-side filter limiting each file to **4MB**.
2. **Base64 Payload Pipeline**: Images are encoded to base64 Data URLs on the frontend and sent inside the `messages[].content` array as standard vision message attachments.
3. **Smart Formatting**: The generated findings are appended to any existing manual notes in the text area under a dedicated `[AI Visual Inspection]` header, ensuring no manual documentation is lost.

