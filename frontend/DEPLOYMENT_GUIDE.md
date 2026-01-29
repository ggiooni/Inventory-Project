# Smart Inventory - Deployment Guide

## Firebase Cloud Functions Deployment

### Security Architecture

```
┌─────────────────┐     ┌──────────────────────┐     ┌──────────────┐
│    BROWSER      │     │   FIREBASE CLOUD     │     │   GROQ API   │
│   (Frontend)    │────>│     FUNCTIONS        │────>│              │
│                 │     │                      │     │              │
│  No API Key     │     │  API Key stored      │     │  AI Process  │
│                 │<────│  in environment vars │<────│              │
└─────────────────┘     └──────────────────────┘     └──────────────┘
```

---

## Step 1: Login to Firebase

Open the terminal in the project folder and run:

```bash
cd "<PROJECT_FOLDER_PATH>"

firebase login
```

This will open the browser to authenticate with your Google account.

---

## Step 2: Configure the Groq API Key (SECURE)

Run this command to securely store the API key:

```bash
firebase functions:config:set groq.apikey="YOUR_GROQ_API_KEY_HERE"
```

**IMPORTANT:** This command stores the API key on Firebase servers.
- It is NOT stored in the code
- It is NOT exposed to the browser
- Only Cloud Functions can access it

To verify it was saved correctly:

```bash
firebase functions:config:get
```

---

## Step 3: Deploy Cloud Functions

```bash
firebase deploy --only functions
```

This will upload the functions to Firebase. The process may take a few minutes.

When finished, you will see URLs like:

```
Function URL (aiChat): https://us-central1-bar-inventory-15a15.cloudfunctions.net/aiChat
Function URL (getAIPredictions): https://us-central1-bar-inventory-15a15.cloudfunctions.net/getAIPredictions
Function URL (generateShoppingList): https://us-central1-bar-inventory-15a15.cloudfunctions.net/generateShoppingList
```

---

## Step 4: Deploy Frontend (Optional)

If you want to host the frontend on Firebase Hosting:

```bash
firebase deploy --only hosting
```

Your app will be available at:
- https://bar-inventory-15a15.web.app
- https://bar-inventory-15a15.firebaseapp.com

---

## Local Development (Emulator)

To test locally without deploying:

### 1. Create local configuration file

Create a `.runtimeconfig.json` file in the `functions/` folder:

```json
{
  "groq": {
    "apikey": "YOUR_API_KEY_HERE"
  }
}
```

**IMPORTANT:** This file is in .gitignore and will NOT be uploaded to the repository.

### 2. Start emulators

```bash
firebase emulators:start
```

This will start:
- Functions at: http://localhost:5001
- Hosting at: http://localhost:5000

---

## Useful Commands

| Command | Description |
|---------|-------------|
| `firebase login` | Sign in |
| `firebase logout` | Sign out |
| `firebase deploy` | Deploy everything |
| `firebase deploy --only functions` | Deploy only functions |
| `firebase deploy --only hosting` | Deploy only hosting |
| `firebase functions:log` | View function logs |
| `firebase emulators:start` | Start local emulators |

---

## Verify Deployment

After deploying, you can test the function with curl:

```bash
curl -X POST https://us-central1-bar-inventory-15a15.cloudfunctions.net/aiChat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello, are you working?"}'
```

---

## Troubleshooting

### Error: "Groq API key not configured"
- Run: `firebase functions:config:set groq.apikey="YOUR_API_KEY"`
- Redeploy: `firebase deploy --only functions`

### Error: "CORS blocked"
- The functions already have CORS configured
- Verify you are using the correct URL

### Error: "Function not found"
- Make sure you have deployed: `firebase deploy --only functions`
- Check the logs: `firebase functions:log`

---

## Implemented Security

| Aspect | Implementation |
|--------|----------------|
| API Key | Stored in Firebase Config (server-side) |
| CORS | Configured to allow frontend requests |
| Validation | HTTP method and parameter verification |
| Rate Limiting | Firebase applies automatic limits |
| Logs | Errors recorded in Firebase Console |

---

## Costs

Firebase Cloud Functions has a generous free tier:
- 2 million invocations/month free
- 400,000 GB-seconds/month free
- More than enough for a university project

---

**Project:** BSc Computer Science - Final Year Project
**Authors:** Nicolas Boggioni Troncoso & Fernando Moraes
**Institution:** Dorset College Dublin
