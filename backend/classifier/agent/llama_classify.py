from llama_cpp import Llama
import logging
import warnings
warnings.filterwarnings("ignore")
logging.getLogger("llama_cpp").setLevel(logging.ERROR)
logging.getLogger("transformers").setLevel(logging.ERROR)

'''import django
import os

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'classifier.settings')
django.setup()'''

def classify_message(message, categories):
    """
    Classify a message into one of the given categories using LLaMA GGUF model.

    Args:
        message (str): The message to classify.
        categories (list): List of possible categories.

    Returns:
        str: The predicted category name.
    """
    # Construct the prompt for classification
    prompt = f"""
        You are an advanced LinkedIn message classifier. Your task is to analyze the provided group of text messages and categorize them into the most relevant category from the list of possible categories. 

        ### Context:
        The messages are sent by LinkedIn users for various purposes, including professional inquiries, networking, appreciation, or referrals. Your classification must align with the intent and tone of the messages collectively.

        ### Categories:
        [{', '.join(categories)}]

        ### Instructions:
        1. Carefully read the group of comma-separated messages.
        2. Analyze the collective intent or purpose across all the messages.
        3. Match them to the single category that best describes their overall intent.
        4. If the messages do not clearly belong to any category, choose "general".

        Provide only the category name as your output unless instructed otherwise.Please only provide only the name of the category to which it is classified.
        Please don't provide any other text.

        ### Example:
        Messages: "Can you please refer me for a role in your company?, Thank you for taking the time to respond to my query."
        Category: referral

        Messages: "Hi, how are you?, Can I meet you to discuss opportunities?, Thank you for your assistance!"
        Category: networking

        Messages: "I came across your post about sponsorship opportunities., We would like to collaborate for an upcoming event."
        Category: collaboration

        ---

        Classify the following group of messages:
        [{message}]
    """
    try:
        # Load the LLaMA model
        llm = Llama.from_pretrained(
            repo_id="bartowski/Llama-3.2-3B-Instruct-GGUF",
            filename="Llama-3.2-3B-Instruct-IQ3_M.gguf",
        )
        
        # Generate the response
        response = llm.create_chat_completion(
            messages=[{"role": "user", "content": prompt}],
            max_tokens=20,
            temperature=0.1
        )
        
        # Extract the response text
        return response["choices"][0]["message"]["content"].strip()
    except Exception as e:
        return f"Error: {e}"

# Main function to test classification
def main():
    messages = [
        "Can you help me with a referral for this job?",
        "Thanks for helping.",
        "Hi, how are you?",
        "Can I meet you?",
        "We are looking for sponsorship opportunities. Let's collaborate.",
        "Hello, I found your post about a job opening. Can you refer me?"
    ]
    categories = ["referral", "thanks", "networking", "general", "sponsorship", "opportunity", "other", "meeting_request", "marketing", "event", "collaboration", "feedback", "greeting"]
    
    #for message in messages:
    predicted_category = classify_message(messages[5], categories)
    print(f"Message: {messages[5]}\nPredicted Category: {predicted_category}\n")

if __name__ == "__main__":
    main()
