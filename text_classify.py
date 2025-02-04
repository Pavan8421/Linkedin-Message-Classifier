from transformers import pipeline

class BartModelHandler:
    def __init__(self, model_name="facebook/bart-large-mnli"):
        """
        Initialize the BART model handler.

        Args:
            model_name (str): The name of the model to use.
        """
        # Load the zero-shot classification pipeline
        self.classifier = pipeline("zero-shot-classification", model=model_name)

    def text_classification_zero_shot(self, message, categories):
        """
        Perform zero-shot classification using BART.

        Args:
            message (str): Text to classify.
            categories (list): List of possible categories.

        Returns:
            dict: Classification results.
        """
        # Perform zero-shot classification
        result = self.classifier(message, candidate_labels=categories)

        # Extract the top category and its score
        predicted_category = result['labels'][0]
        confidence_score = result['scores'][0]

        return {
            "message": message,
            "predicted_category": predicted_category,
            "confidence_score": confidence_score,
            "raw_output": result
        }

def main():
    # Initialize BART model handler
    bart_handler = BartModelHandler()

    # Zero-Shot Classification Example
    print("\n--- Zero-Shot Classification Example ---")
    categories = ['referral', 'thanks', 'meeting', 'networking', 'general', 'sponsorship']
    messages = [
        "Hi Pavan Kumar.Im a recruiter at DataAnnotation, where we pay smart folks to train AI. Your profile stood out to me as we are seeking bilingual English and Hindi professionals. We need consultants to help train AI to ensure its accuracy. You will help us write answers to prompts and research/fact-check AI responses.A few highlights of what can be your newest side gig: Earn $1K+ USD weekly paid via PayPal 💰Completely remote 🏡Work as much or as little as you want - make your own schedule! 💻NO AI experience required 🤯Please apply at the link below!",
        "Hi, how are you?",
        "Can you provide me a referal",
        "Thanks for your previous support",
        "I'd like to schedule a meeting to discuss the project"
    ]

    for message in messages:
        classification = bart_handler.text_classification_zero_shot(message, categories)
        print("\nMessage:", classification['message'])
        print("Predicted Category:", classification['predicted_category'])
        print("Confidence Score:", classification['confidence_score'])
        print("Raw Output:", classification['raw_output'])

if __name__ == "__main__":
    main()
