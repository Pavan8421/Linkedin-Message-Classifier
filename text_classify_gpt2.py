from transformers import GPT2LMHeadModel, GPT2Tokenizer
import re

class GPT2ModelHandler:
    def __init__(self, model_name="gpt2"):
        """
        Initialize the GPT-2 model handler.

        Args:
            model_name (str): The name of the GPT-2 model to use.
        """
        self.tokenizer = GPT2Tokenizer.from_pretrained(model_name)
        self.model = GPT2LMHeadModel.from_pretrained(model_name)
        # Set padding token to avoid warnings
        self.tokenizer.pad_token = self.tokenizer.eos_token

    def text_classification_zero_shot(self, message, categories, max_length=60):
        """
        Perform classification using GPT-2 with prompt engineering.

        Args:
            message (str): Text to classify.
            categories (list): List of possible categories.
            max_length (int): Maximum length of the response.

        Returns:
            dict: Classification results.
        """
        # Construct a prompt for classification
        prompt = f"""
Classify the following message into one of these categories:
{', '.join(categories)}

Message: "{message}"
Please only provide the predicted category name as output."""

        # Tokenize the input prompt
        inputs = self.tokenizer.encode(prompt, return_tensors="pt")

        # Generate a response using GPT-2
        outputs = self.model.generate(
            inputs,
            max_length=max_length,
            num_return_sequences=1,
            do_sample=True,
            pad_token_id=self.tokenizer.eos_token_id  # Set padding token ID
        )
        generated_text = self.tokenizer.decode(outputs[0], skip_special_tokens=True)

        # Extract the predicted category from the output using regex
        try:
            # Use regular expression to capture the category from the generated text
            match = re.search(r'([A-Za-z\s]+)', generated_text.strip())  # Match first word/phrase
            if match:
                prediction = match.group(0).strip()
            else:
                prediction = "Unclassified"  # Fallback if no match
        except Exception:
            prediction = "Unclassified"  # Fallback if an exception occurs

        # Validate if the predicted category is in the provided categories
        predicted_category = None
        for category in categories:
            if category.lower() in prediction.lower():
                predicted_category = category
                break

        return {
            "message": message,
            "predicted_category": predicted_category or "Unclassified",
            "raw_output": generated_text
        }

def main():
    # Initialize GPT-2 model handler
    gpt2_handler = GPT2ModelHandler()

    # Zero-Shot Classification Example
    print("\n--- Zero-Shot Classification Example ---")
    categories = ['referral', 'thanks', 'meeting', 'networking', 'general', 'sponsorship']
    messages = [
        "Hi, how are you?",
        "Can you provide me a referral",
        "Thanks for your previous support",
        "I'd like to schedule a meeting to discuss the project"
    ]

    for message in messages:
        classification = gpt2_handler.text_classification_zero_shot(message, categories)
        print("\nMessage:", classification['message'])
        print("Predicted Category:", classification['predicted_category'])
        print("Raw Output:", classification['raw_output'])

if __name__ == "__main__":
    main()
