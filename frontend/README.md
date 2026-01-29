# Smart Inventory - AI-Powered Management System

> **BSc Computer Science - Final Year Project**
> Dorset College Dublin, Ireland | 2025

A modern, intelligent inventory management system designed for the hospitality industry. This application combines real-time POS integration with AI-powered predictive analytics to automate stock tracking, generate smart alerts, and provide actionable insights for managers.

---

## Table of Contents

- [Project Overview](#project-overview)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [System Architecture](#system-architecture)
- [Installation](#installation)
- [Usage](#usage)
- [Project Structure](#project-structure)
- [AI Integration](#ai-integration)
- [UX/UI Features](#uxui-features)
- [Screenshots](#screenshots)
- [Future Development](#future-development)
- [Author](#author)
- [Acknowledgements](#acknowledgements)
- [License](#license)

---

## Project Overview

### Problem Statement

Traditional inventory management relies heavily on manual counting and basic spreadsheets, leading to several critical problems:

- Stock-outs during peak hours resulting in lost revenue
- Overstocking leading to waste and increased costs
- Time-consuming manual inventory checks
- Lack of predictive insights for informed purchasing decisions

### Solution

This project addresses these challenges by providing:

- **Automated tracking** through POS system integration
- **AI-powered predictions** for demand forecasting
- **Real-time alerts** for critical stock levels
- **Natural language queries** for intuitive inventory insights
- **Smart recommendations** for cost optimization and waste reduction

---

## Features

### Core Functionality

| Feature | Description |
|---------|-------------|
| **User Authentication** | Secure login with role-based access control (Admin, Manager, Staff) |
| **Real-time Inventory** | Live database synchronization with Firebase Firestore |
| **Smart Alerts** | Three-tier priority system (Urgent, Normal, Info) |
| **POS Integration** | Support for Toast, Square, Clover, and Lightspeed POS systems |
| **AI Assistant** | Natural language queries powered by Groq LLM |

### AI-Powered Features

- **Natural Language Queries**: Ask questions like "What items need restocking this week?"
- **Predictive Analytics**: AI-based demand forecasting using consumption patterns
- **Shopping List Generation**: Automated, intelligent shopping lists with recommended quantities
- **Inventory Insights**: Cost optimization and waste reduction recommendations
- **Anomaly Detection**: Identification of unusual consumption patterns

### UX/UI Features (New)

- **Dark Mode**: Toggle between light and dark themes
- **Sidebar Navigation**: Collapsible sidebar for easy navigation
- **Collapsible Panels**: Expand/collapse sections to focus on what matters
- **Mobile Card View**: Touch-friendly card layout on mobile devices
- **Toast Notifications**: Non-intrusive feedback for user actions
- **Onboarding Tour**: Guided tour for first-time users
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile

### User Roles & Permissions

| Role | Permissions |
|------|-------------|
| **Admin** | Full access: inventory, priorities, POS configuration, AI features |
| **Manager** | Inventory management, POS configuration, AI features |
| **Staff** | View inventory, update stock levels |

---

## Technology Stack

### Frontend
- **HTML5** - Semantic markup and accessibility
- **CSS3** - Modern styling with CSS Variables, Flexbox, Grid
- **JavaScript (ES6+)** - Modular architecture with ES Modules

### Backend & Database
- **Firebase Authentication** - Secure user authentication
- **Firebase Firestore** - Real-time NoSQL database
- **Firebase Cloud Functions** - Secure API proxy for AI services
- **Firebase Hosting** - Cloud deployment (optional)

### AI Integration
- **Groq API** - Ultra-fast LLM inference
- **Llama 3.3 70B** - Large language model for predictions and insights

### External Integrations
- **Toast POS API** - Point-of-sale integration
- **Square API** - Payment and inventory sync
- **Clover API** - POS data synchronization
- **Lightspeed API** - Management integration

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │  index.html │  │  styles.css │  │  JavaScript Modules     │  │
│  │  (UI Layer) │  │  (Styling)  │  │  app.js | ai-assistant  │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SERVICE LAYER                               │
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────────┐  │
│  │ Firebase Auth    │  │ Firebase         │  │ Firebase      │  │
│  │ (Authentication) │  │ Firestore (DB)   │  │ Functions     │  │
│  └──────────────────┘  └──────────────────┘  └───────────────┘  │
│                                                     │           │
│                                                     ▼           │
│                                              ┌───────────────┐  │
│                                              │   Groq API    │  │
│                                              │  (AI/LLM)     │  │
│                                              └───────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    EXTERNAL INTEGRATIONS                         │
│  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────────┐             │
│  │ Toast  │  │ Square │  │ Clover │  │ Lightspeed │             │
│  │  POS   │  │  POS   │  │  POS   │  │    POS     │             │
│  └────────┘  └────────┘  └────────┘  └────────────┘             │
└─────────────────────────────────────────────────────────────────┘
```

---

## Installation

### Prerequisites

- Modern web browser (Chrome, Firefox, Safari, Edge)
- Internet connection (for Firebase and Groq API)
- Node.js (for local development with emulators)

### Setup Instructions

1. **Clone or download the repository**
   ```bash
   git clone https://github.com/GGiooni/Inventory-Project.git
   cd Inventory-Project
   ```

2. **Configure Firebase** (if using your own project)

   Update `js/firebase-config.js` with your Firebase credentials:
   ```javascript
   const firebaseConfig = {
       apiKey: "YOUR_API_KEY",
       authDomain: "YOUR_PROJECT.firebaseapp.com",
       projectId: "YOUR_PROJECT_ID",
       storageBucket: "YOUR_PROJECT.appspot.com",
       messagingSenderId: "YOUR_SENDER_ID",
       appId: "YOUR_APP_ID"
   };
   ```

3. **Deploy Cloud Functions** (for secure AI integration)

   See `DEPLOYMENT_GUIDE.md` for detailed instructions.

4. **Run the application**

   Open `index.html` in a web browser, or use a local server:
   ```bash
   # Using Python
   python -m http.server 8000

   # Using Node.js
   npx serve .
   ```

5. **Access the application**

   Navigate to `http://localhost:8000` in your browser.

---

## Usage

### Demo Credentials

Demo accounts are available for testing. Contact the project team for access credentials.

| Role | Access Level |
|------|--------------|
| Admin | Full system access |
| Manager | Inventory and POS management |
| Staff | View and update stock |

### Getting Started

1. **Login** using the credentials above
2. **View Dashboard** - See stock alerts, POS status, and quick stats
3. **Use AI Assistant** - Click suggestion buttons or type custom queries
4. **Manage Inventory** - Add/remove stock, adjust priorities
5. **Configure POS** - Connect your POS system (Admin only)
6. **Toggle Dark Mode** - Click the moon icon in the header

### AI Assistant Examples

```
"What items need to be restocked this week?"
"Generate a shopping list for next week"
"Which spirits are running low?"
"Analyze my inventory and suggest optimizations"
"What items might go to waste due to overstocking?"
```

---

## Project Structure

```
smart-inventory/
│
├── index.html              # Main application entry point
├── README.md               # Project documentation
├── DEPLOYMENT_GUIDE.md     # Cloud Functions deployment guide
│
├── css/
│   └── styles.css          # Modern UI styles (2000+ lines)
│                           # - CSS Variables for theming
│                           # - Dark mode support
│                           # - Responsive design
│                           # - Component styles
│
├── js/
│   ├── firebase-config.js  # Firebase initialization
│   ├── app.js              # Main application logic
│   │                       # - Authentication
│   │                       # - Inventory management
│   │                       # - POS integration
│   │                       # - Alert system
│   │
│   └── ai-assistant.js     # AI integration module
│                           # - Cloud Functions integration
│                           # - Natural language processing
│                           # - Predictive analytics
│
└── functions/
    ├── index.js            # Firebase Cloud Functions
    └── package.json        # Node.js dependencies
```

---

## AI Integration

### How It Works

The AI assistant uses Firebase Cloud Functions as a secure proxy to the Groq API with the Llama 3.3 70B model:

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  User Query  │ ──▶ │   Firebase   │ ──▶ │   Groq API   │
│              │     │   Functions  │     │  (Llama 3.3) │
└──────────────┘     └──────────────┘     └──────────────┘
                                                 │
                                                 ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Display    │ ◀── │   Format     │ ◀── │  AI Response │
│   Response   │     │   Output     │     │              │
└──────────────┘     └──────────────┘     └──────────────┘
```

### Security

- API keys are stored securely in Firebase Config
- Never exposed to the client browser
- All AI requests routed through Cloud Functions

### AI Capabilities

| Capability | Description |
|------------|-------------|
| **Context-Aware** | Understands current inventory levels, thresholds, and priorities |
| **Predictive** | Forecasts future needs based on patterns |
| **Multilingual** | Responds in English or Spanish based on user input |
| **Conversational** | Maintains conversation history for follow-up questions |

### API Configuration

The system uses Groq's free tier which provides:
- 14,400 requests per day
- 70,000 tokens per minute
- No credit card required

---

## UX/UI Features

### Dark Mode
Toggle between light and dark themes. Preference is saved in localStorage.

### Sidebar Navigation
- Collapsible for more screen space
- Badge indicators for alerts
- Mobile-friendly hamburger menu

### Collapsible Panels
- Click headers to expand/collapse
- Reduce visual clutter
- Focus on what matters

### Toast Notifications
- Non-intrusive feedback
- Auto-dismiss after 5 seconds
- Color-coded by type (success, error, warning, info)

### Responsive Design
- Desktop: Full table view with all columns
- Tablet: Optimized layout
- Mobile: Card-based view for touch-friendly interaction

---

## Screenshots

### Login Screen
*Modern login with gradient background*

### Dashboard (Light Mode)
*Overview with stats, AI assistant, and alerts*

### Dashboard (Dark Mode)
*Same features, easier on the eyes*

### Mobile View
*Card-based inventory for mobile devices*

---

## Future Development

### Planned Enhancements

- [ ] Mobile application (React Native)
- [ ] Advanced ML models for demand prediction
- [ ] Multi-location support
- [ ] Supplier integration and automated ordering
- [ ] Barcode/QR scanning for stock updates
- [ ] Historical analytics and reporting dashboard
- [ ] Email/SMS notifications for critical alerts

### Potential Business Applications

- Restaurant chains inventory optimization
- Bar and nightclub stock management
- Hotel food service operations
- Catering company resource planning
- Retail inventory management

---

## Authors

### Nicolas Boggioni Troncoso
BSc Computer Science - Final Year
Dorset College Dublin, Ireland

- GitHub: [@GGiooni](https://github.com/GGiooni)
- LinkedIn: [nicolas-boggioni](https://www.linkedin.com/in/nicolas-boggioni/)
- Email: 74867@student.dorset-college.ie

### Fernando Moraes
BSc Computer Science - Final Year
Dorset College Dublin, Ireland

- GitHub: [@nando-moraes](https://github.com/nando-moraes)

---

*This project was developed collaboratively as a team effort.*

---

## Acknowledgements

- **Dorset College Dublin** - For academic guidance and support
- **Firebase** - For excellent backend services
- **Groq** - For fast and free AI inference API
- **Meta AI** - For the open-source Llama 3.3 model

---

## License

This project is developed as part of academic coursework at Dorset College Dublin.

For academic use only. All rights reserved.

---

## References

1. Firebase Documentation - https://firebase.google.com/docs
2. Groq API Documentation - https://console.groq.com/docs
3. Toast POS API - https://doc.toasttab.com
4. MDN Web Docs - https://developer.mozilla.org
5. Nielsen Norman Group - UX Guidelines

---

<div align="center">

**Smart Inventory**
*AI-Powered Management for Smarter Operations*

Made with dedication for BSc Computer Science Final Year Project

</div>
