# SurgeAI 🚀

SurgeAI is a cutting-edge, AI-powered social media listening and sentiment analysis platform. It empowers users to monitor their brand, analyze keywords, and derive actionable insights from online discussions across platforms like Reddit (with future extensibility for Twitter and Quora). 

Built with scalability, performance, and user experience in mind, SurgeAI bridges the gap between raw web data and intelligent decision-making.

---

## 🌟 Key Features

- **Multi-Platform Scraping**: Automated background data collection from Reddit.
- **Advanced NLP Pipeline**: Built-in Sentiment Analysis powered by HuggingFace Transformers (PyTorch), analyzing emotions behind every post and comment.
- **Real-Time Dashboards**: Interactive UI visualizing sentiment distribution, keyword rankings, and engagement scores.
- **Campaign Management**: Manage and track multiple marketing or brand awareness campaigns simultaneously.
- **Robust Authentication**: Secure JWT-based user authentication, including password recovery.
- **Scalable Architecture**: decoupled microservices using Next.js for the frontend and FastAPI + Celery for the processing backend.

---

## 🛠️ Technology Stack

SurgeAI is built using modern, production-grade technologies:

### **Frontend (Client)**
- **Framework**: [Next.js 15](https://nextjs.org/) (React 19)
- **Styling**: Tailwind CSS & Radix UI Primitives (shadcn/ui)
- **State & Data Fetching**: Axios, React Hook Form, Zod
- **Visualizations**: Recharts
- **Language**: TypeScript

### **Backend (Server)**
- **API Framework**: [FastAPI](https://fastapi.tiangolo.com/)
- **Database**: PostgreSQL (managed via SQLAlchemy & Alembic)
- **Background Processing**: Celery & Redis
- **Machine Learning**: Transformers, PyTorch, Pandas
- **Language**: Python 3.10+

---

## 🚀 Deployment Links
> - **Live Application**: [https://surge-ai-theta.vercel.app](https://surge-ai-theta.vercel.app)
> <!-- - **API Production URL**: [https://surgeai-backend.onrender.com](https://surgeai-backend.onrender.com) *(Deploying on Render)* -->

---

## 💻 Local Development Setup

Follow these steps to get the environment running on your local machine.

### Prerequisites
- Node.js (v20+)
- Python (3.10+)
- PostgreSQL (running locally or accessible via URL)
- Redis server (running locally)

### 1. Server Setup (Backend)
Navigate to the `server` directory and set up the Python environment:
```bash
cd server
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Create a `.env` file in the `server` folder with your credentials:
```env
# Database & Redis
DATABASE_URL=postgresql://user:password@localhost:5432/surgeai
REDIS_URL=redis://localhost:6379/0
SECRET_KEY=your_super_secret_jwt_key
FRONTEND_URL=http://localhost:3000

# API Keys
REDDIT_CLIENT_ID=your_reddit_client_id
REDDIT_CLIENT_SECRET=your_reddit_client_secret
REDDIT_USER_AGENT=surgeai:v1.0.0 (by /u/yourusername)
```

Run the backend services in separate terminal windows:
```bash
# Start the FastAPI Web Server
uvicorn app.main:app --reload --port 8000

# Start the Celery Worker
celery -A tasks.celery_worker.celery_app worker --loglevel=info
```

### 2. Client Setup (Frontend)
Navigate to the `client` directory and install dependencies:
```bash
cd client
npm install
```

Configure local environment variables. Ensure `next.config.ts` or `.env.local` points to your backend. By default, it proxies to `http://127.0.0.1:8000`.

Start the Next.js development server:
```bash
npm run dev
```
Visit `http://localhost:3000` to view the application.

---

## ☁️ Deployment Guide

The project is structured to be easily deployed on modern Cloud platforms like **Vercel** and **Render**.

### **Frontend (Vercel)**
1. Connect this repository to your Vercel account.
2. Set the Root Directory to `client`.
3. Add the Environment Variable `NEXT_PUBLIC_API_URL` and set it to your deployed Backend URL.
4. Click **Deploy**. Vercel will automatically build the Next.js app.

### **Backend (Render) using Docker**
The backend comes pre-configured with a `render.yaml` Blueprint which automatically leverages **Docker** for a production-grade 1-click deployment.
1. Commit all files, including `server/Dockerfile` and `server/render.yaml` to your Git repository.
2. Connect your repository to Render.
3. Go to **Blueprints** and create a new instance using the `server/render.yaml` file.
4. Render will use the Dockerfile to orchestrate containerized build and launch commands for:
   - A **PostgreSQL** Managed database.
   - A **Redis** instance.
   - A **FastAPI** Web Service.
   - A **Celery** Background Worker.
5. Fill in any missing environment variables (like `REDDIT_CLIENT_ID`) in your Render dashboard after creation.

---

## 🏗️ Project Architecture

1. The User submits a new Campaign on the Next.js Frontend.
2. The Request hits the **FastAPI** Backend, validating and saving data to **PostgreSQL**.
3. FastAPI queues a scraping task into **Redis**.
4. The **Celery Worker** picks up the task, scrapes Reddit data asynchronously, and saves it.
5. A secondary NLP task runs **PyTorch/Transformers** for Sentiment Labeling on the scraped corpus.
6. The User navigates the beautiful UI to interactively explore insights!

> *Designed and developed with a focus on clean code, scalability, and modern UX patterns.*
