# ======================================
# Backend Dockerfile (FastAPI + Uvicorn)
# ======================================

# 1️⃣ Use official lightweight Python image
FROM python:3.11-slim

# 2️⃣ Set working directory inside container
WORKDIR /app

# 3️⃣ Copy dependency file and install packages
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 4️⃣ Copy the FastAPI app into the container
COPY ./app ./app

# 5️⃣ Expose the FastAPI port
EXPOSE 8000

# 6️⃣ Run the server when container starts
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
