# Fleet Turnaround Assistant - React Component Integration

## Setup

The Fleet Turnaround Assistant has been successfully converted to a React component for your Next.js project.

### Files Created:

1. **`app/components/FleetTurnaroundAssistant.tsx`** - Main React component with all logic
2. **`app/components/FleetTurnaroundAssistant.module.css`** - CSS module with all styling
3. **`.env.local`** - Environment configuration file

### Files Modified:

1. **`app/page.tsx`** - Updated to import and render the component
2. **`app/layout.tsx`** - Simplified to remove unused dependencies
3. **`app/globals.css`** - Cleaned up to use minimal base styles

## Configuration

### Step 1: Add Your API Key

Open `.env.local` in the project root and replace `YOUR_KEY_HERE` with your actual Anthropic Claude API key:

```env
NEXT_PUBLIC_ANTHROPIC_API_KEY=sk-ant-your-actual-api-key-here
NEXT_PUBLIC_ANTHROPIC_API_URL=https://api.anthropic.com/v1/messages
NEXT_PUBLIC_ANTHROPIC_MODEL=claude-sonnet-4-20250514
```

**Important:** The `NEXT_PUBLIC_` prefix is required for client-side access to these variables.

### Step 2: Run the project

```bash
npm run build
npm start
```

Open `http://localhost:3000` - the Fleet Turnaround Assistant is live!

3. **Fill** the form on the left:
   - Vehicle info, mileage, fuel level
   - Next booking time window
   - Daily rate (for revenue impact calc)
   - Return condition notes
   - Previous known issues (optional)

4. **Click** "Analyze Turnaround →"

5. **View** AI analysis on the right panel:
   - Verdict (GO/HOLD/FLAG)
   - Time to ready & revenue impact
   - Action items with urgency levels
   - Maintenance alerts
   - Cleaning checklist
   - Fleet manager's advice

6. **Track** vehicle history - automatically saved to localStorage

7. **Share** via WhatsApp using the copy button

## Component Architecture

The component uses React hooks (`useState`, `useEffect`) to manage:
- Form state
- Analysis results
- Fleet history (localStorage)
- Checklist interactions
- API calls to Claude

CSS is organized with CSS Modules for scoped styling and no build complexity.

## Environment Variables

The component reads from `.env.local`:

| Variable | Default | Purpose |
|----------|---------|---------|
| `NEXT_PUBLIC_ANTHROPIC_API_KEY` | `YOUR_KEY_HERE` | Your Anthropic API key |
| `NEXT_PUBLIC_ANTHROPIC_API_URL` | Claude API endpoint | API base URL |
| `NEXT_PUBLIC_ANTHROPIC_MODEL` | `claude-sonnet-4-20250514` | Claude model version |

## Dark Theme

The component features a dark brutalist design:
- Dark background (#0a0a0a)
- Orange accent (#FF5C00)
- No external dependencies or frameworks
- Production-ready styling

## API Integration

The component sends vehicle data to Anthropic's Claude API and expects a JSON response with:
- Verdict (GO/HOLD/FLAG)
- Action items with urgency levels
- Maintenance alerts
- Cleaning checklist
- Timing analysis

All data is validated and displayed in a user-friendly format.

## localStorage Keys

- `fleet_history` - Array of all vehicle turnaround entries with timestamps and results

## Responsive Design

- **Desktop**: Two-column layout (form left, output right)
- **Tablet/Mobile**: Single column, stacked layout

---

Ready to deploy! 🚀
