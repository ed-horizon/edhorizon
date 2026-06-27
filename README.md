# 🌅 EdHorizon

> **A Symphony of Learning & Operational Excellence, Built for the Era of AI.**

EdHorizon is built with **Next.js 16**, **Supabase**, and **Tailwind v4**.

---

## 📖 The Story of EdHorizon

In the traditional world of EdTech, complexity often kills engagement. We set out to change that by building a system that balances a **"Playful & Premium"** student experience with a high-performance administrative engine. 

### 🎭 Chapter 1: The Learner’s Journey (Student)
For the student, EdHorizon is a canvas of knowledge. Inspired by the gamified engagement of Duolingo, the platform offers a "distraction-free" interface where learning units—**Capsules**—are delivered with smooth micro-animations and immediate feedback.
- **Use Case**: A student logs in, sees their specific grade-level subjects (Hindi, Math, Science), and resumes a Video Capsule exactly where they left off. They complete a Quiz Capsule, receive instant gratification through UI feedback, and track their progress toward mastery.

### 🎨 Chapter 2: The Architect’s Studio (Teacher)
Teachers are the heart of the platform. We empowered them with a **Content Studio** that feels like a creative workspace rather than a database entry form.
- **Use Case**: A Teacher uses the **3-Step Capsule Wizard** to quickly prototype a new lesson. 
  1. **Format**: Select "Quiz".
  2. **Metadata**: Link it to "Grade 9 Mathematics - Algebra".
  3. **Content**: Drop in questions. 
  The result? A high-quality learning unit published in minutes, not hours.

### 📈 Chapter 3: The Engine of Growth (Sales)
An academy thrives when its pipeline is healthy. EdHorizon integrates a **Kanban-style CRM** directly into the core, removing the need for fragmented third-party tools.
- **Use Case**: A Sales Representative views their daily **Pipeline Board**. They drag a "New Lead" into the "Demo Scheduled" column. The system automatically tracks the conversion value, providing the academy with real-time growth forecasting.

### 🏦 Chapter 4: The Harmony of Personnel (HR)
Managing educators and staff requires precision. The **HR Dashboard** and **Payroll Pulse** modules bring financial clarity to academy operations.
- **Use Case**: At the end of the month, the HR Manager opens the **Payroll Pulse**. The system auto-calculates payouts based on the **Staff Registry** metadata (Base Salary, Attendance, Role). With one click, a new "Payroll Run" is generated, ensuring everyone is paid accurately and on time.

### 🔭 Chapter 5: The Command Center (Super Admin)
For the enterprise owner, data is the ultimate lever. The **Super Admin Analytics** dashboard provides a "God View" of the entire ecosystem.
- **Use Case**: The Super Admin monitors **Live Database Sync** indicators, reviews **System Health**, and analyzes **Module Engagement** heatmaps to decide which subjects to expand or refine.

---

## 🛠️ The Engineering Philosophy (AI-Era)

This project was built using **Modern Software Engineering Methodologies** tailored for the AI age:

1.  **Context-Driven Development**: Leveraging deep-context documentation (`plan.md`, `PRD.md`) to ensure AI agents and human developers act as a unified team.
2.  **Schema-First Architecture**: Robust PostgreSQL foundations with strict **Row Level Security (RLS)** ensure security is inherited, not added.
3.  **Atomic Design**: UI components are built with **Tailwind v4** and **shadcn/ui**, ensuring a design system that is both ultra-consistent and extremely performant.
4.  **Optimistic UI**: Every interaction (like moving a lead or saving a capsule) is designed for perceived speed, using Next.js 15's concurrent rendering capabilities.

---

## 🚀 Technical Stack

- **Frontend**: Next.js 16 (App Router), React 19, Framer Motion
- **Styling**: Tailwind CSS v4, shadcn/ui
- **Backend & Security**: Supabase (PostgreSQL, Auth, RLS)
- **Private file storage**: Cloudflare R2 with short-lived signed URLs
- **Deployment**: Vercel, Supabase Cloud, and Cloudflare R2

---

## ⚙️ Getting Started

```bash
# Clone the repository
git clone https://github.com/ed-horizon/edhorizon.git

# Install locked dependencies
npm ci

# Create .env.local from the documented variable names
cp .env.example .env.local

# Start development
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to enter the horizon.

### Environment configuration

Supabase stores authentication, relational data, and file metadata. Cloudflare R2 stores the private file objects. Configure every variable listed in `.env.example` locally and in the appropriate Vercel environment.

Never commit `.env.local` or place either R2 secret in a `NEXT_PUBLIC_` variable.

### R2 browser upload CORS

Uploads go directly from the browser to a short-lived presigned R2 URL. Configure the private bucket's CORS policy for each application origin:

```json
[
  {
    "AllowedOrigins": [
      "http://localhost:3000",
      "https://edhorizon-dev.vercel.app"
    ],
    "AllowedMethods": ["PUT"],
    "AllowedHeaders": ["Content-Type"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

Add an exact preview deployment origin while testing a preview. Do not use `*` for the production bucket.
