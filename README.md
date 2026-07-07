# FRACT

[![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-3EC98E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.io/)

FRACT is an open-source, context-first microblogging platform. It emphasizes security, automated moderation, and a robust anti-spam architecture to provide a safe and engaging environment for users.

## 🚀 Features

### 🛡️ Multi-Layer Anti-Spam System
A backend-enforced, three-layer protection system that ensures platform integrity:
- **Client-Side Pre-checks:** Real-time feedback and rate-limit validation.
- **Backend Functions:** Server-side duplicate detection and cooldown management.
- **Database Firewall:** `BEFORE INSERT` triggers that provide military-grade protection against bypass attempts.

### 🤖 AI-Powered Moderation
Real-time content analysis integrated with Hive AI:
- **Automated Scoring:** Content is analyzed for safety, hate speech, and exploitation.
- **Dynamic Actions:** Automated blurring, feed exclusion, or quarantining based on severity.
- **Manual Review Queue:** Integrated appeal system for transparency and fairness.

### 🔐 Enterprise-Grade Security
- **Data Sanitization:** Robust protection against XSS and SQL injection.
- **Secure Exports:** GDPR-compliant data export with sensitive information masking.
- **Audit Trails:** Comprehensive logging of security events and moderation actions.
- **RLS (Row-Level Security):** Granular database access control ensured by Supabase.

## 💻 Tech Stack

- **Frontend:** React 18 with TypeScript
- **Build Tool:** Vite
- **Styling:** Tailwind CSS & PostCSS
- **Backend:** Supabase (PostgreSQL, Auth, Edge Functions)
- **Icons:** Lucide React
- **Routing:** React Router DOM

## 🛠️ Getting Started

### Prerequisites
- Node.js (Latest LTS recommended)
- Supabase Account

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/boomstrickweb/FRACT.git
   cd FRACT
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Environment Setup:**
   Create a `.env` file in the root directory and add your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```

## 🏗️ Architecture

FRACT follows a modern serverless architecture:
- **`src/components`**: Modular UI components built with React and Tailwind.
- **`src/services`**: Business logic, including security, anti-spam, and AI moderation interfaces.
- **`supabase/functions`**: Edge functions for sensitive operations like IP verification and Hive moderation.
- **Database Layer**: Advanced PostgreSQL triggers and functions for rule enforcement.

## 📜 Compliance & Security

FRACT is designed with privacy in mind:
- **GDPR Ready:** Features for data access, deletion, and minimization.
- **Security Score A+:** Comprehensive protection against common web vulnerabilities.
- **Audit Logs:** Every critical action is recorded in `security_events` for full accountability.

## 📄 License

This project is licensed under the AGPL License - see the LICENSE file for details.

---

Built with ❤️ by the Boomstrick Team.