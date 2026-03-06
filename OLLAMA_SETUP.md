# Local LLM Setup Guide (Ollama)

To run Specter with a local, private LLM, follow these steps:

## 1. Install Ollama
Download and install Ollama for macOS from the official website:
[https://ollama.com/download/mac](https://ollama.com/download/mac)

## 2. Download the Vision Model
Specter requires a model that can see screenshots. We recommend `llava`.
Run this command in your terminal:
```bash
ollama pull llava
```

## 3. Start the Server
Ollama usually runs as a background app. You can verify it's reachable by running:
```bash
ollama --version
```

## 4. Specter Configuration
Specter is already configured to look for Ollama at `http://localhost:11434`. 
- **OLLAMA_HOST**: `http://localhost:11434` (Internal default)
- **OLLAMA_MODEL**: `llava` (Internal default)

If you change these, you can update them in your `.env.local` file.

## 5. Usage
When you launch a new Test Run in the Specter dashboard:
1. Go to Step 1 (Execution Strategy).
2. Select **Open Source (Local)**.
3. Specter will now route all "brain" operations through your local GPU.
