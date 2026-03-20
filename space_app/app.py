import os
import gradio as gr
from huggingface_hub import InferenceClient

# Set HF_TOKEN as a Secret in your Space settings
HF_TOKEN = os.environ.get("HF_TOKEN", "")


def generate_report(prompt: str) -> str:
    """
    Generate a comprehensive startup validation report using Mistral 7B.
    Falls back to Llama-3-8B if Mistral is unavailable.
    """
    if not prompt or not prompt.strip():
        return "Error: No prompt provided."

    # Try Mistral 7B via novita provider
    try:
        client = InferenceClient(
            model="mistralai/Mistral-7B-Instruct-v0.3",
            provider="novita",
            token=HF_TOKEN,
        )
        result = client.chat_completion(
            messages=[{"role": "user", "content": prompt}],
            max_tokens=2000,
            temperature=0.7,
        )
        return result.choices[0].message.content
    except Exception as e:
        print(f"Mistral 7B failed ({e}), falling back to Llama-3-8B...")

    # Fallback: Llama-3-8B (confirmed working on HF Router)
    client = InferenceClient(
        model="meta-llama/Meta-Llama-3-8B-Instruct",
        token=HF_TOKEN,
    )
    result = client.chat_completion(
        messages=[{"role": "user", "content": prompt}],
        max_tokens=2000,
        temperature=0.7,
    )
    return result.choices[0].message.content


demo = gr.Interface(
    fn=generate_report,
    inputs=gr.Textbox(
        label="Validation Prompt",
        lines=30,
        placeholder="Paste the full campaign data prompt here...",
    ),
    outputs=gr.Textbox(
        label="Generated Report",
        lines=40,
    ),
    title="SurgeAI — Mistral 7B Startup Validator",
    description=(
        "Generates a comprehensive startup validation report from campaign data. "
        "Powered by Mistral-7B-Instruct."
    ),
)

if __name__ == "__main__":
    demo.launch()
