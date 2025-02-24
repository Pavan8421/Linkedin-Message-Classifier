import torch
from transformers import AutoModelForCausalLM, AutoTokenizer

print("Starting script...")

# Load TinyLlama model and tokenizer
model_name = "TinyLlama/TinyLlama-1.1B-Chat-v1.0"

try:
    print("Loading tokenizer...")
    tokenizer = AutoTokenizer.from_pretrained(model_name)
    print("Tokenizer loaded successfully.")

    print("Loading model...")
    model = AutoModelForCausalLM.from_pretrained(model_name, torch_dtype=torch.float32, device_map="cpu")
    print("Model loaded successfully.")
except Exception as e:
    print("Error loading model:", e)
    exit(1)

print("Script loaded successfully. Reaching end...")
