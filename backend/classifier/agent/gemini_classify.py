import google.generativeai as genai
import django
import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'classifier.settings')

django.setup()
# Configure your API key

GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
genai.configure(api_key=GEMINI_API_KEY)

def classify_message(message, categories):
    """
    Classify a message into one of the given categories using Gemini API.

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
          [{','.join(categories)}]

          ### Instructions:
          1. Carefully read the group of comma-separated messages.
          2. Analyze the collective intent or purpose across all the messages.
          3. Match them to the single category that best describes their overall intent.
          4. If the messages do not clearly belong to any category, choose "general".

          Provide only the category name as your output unless instructed otherwise.

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
        # Generate the response
        model = genai.GenerativeModel("gemini-1.5-flash")
        response = model.generate_content(
            f"{prompt}",
            generation_config=genai.types.GenerationConfig(
                # Only one candidate for now.
                candidate_count=1,
                max_output_tokens=20,
                temperature=0.1,
            ),
        )
        #print(response.text)
        return response.text.strip()
    except Exception as e:
        return f"Error: {e}"

# Main function to test classification
def main():
    messages = ["Can you help me with a referral for this job?",
                "Thanks for helping.",
                "Hi, how are you?",
                "Can I meet you?",
                """Hi Pavan KumarI'm a recruiter at DataAnnotation, where we pay smart folks to train AI. Your profile stood out to me as we are seeking bilingual English and Hindi professionals. We need consultants to help train AI to ensure its accuracy. You will help us write answers to prompts and research/fact-check AI responses.
                A few highlights of what can be your newest side gig:
                Earn $1K+ USD weekly paid via PayPal 💰
                Completely remote 🏡
                Work as much or as little as you want - make your own schedule! 💻
                NO AI experience required 🤯
                Please apply at the link below!""",
                """Sir, In akrivia drive for Gvp I am not shortlisted for the exam but my cpga meets the eligibility criteria. 
                My cgpa is 8.74.Is there any chance for me to attend the exam sir""",
                """Hello sir,
                  My name is Pavan Kumar currently pursuing my B.Tech final year in Gayatri Vidya Parishad College of Engineering in Information Technology branch. Recently I had viewed your post regarding Pegasystems. I am interested in this job role. Can you please refer me for the role. Please check my resume below sir.
                  Email Id : pavankumarvaranasi2004@gmail.com
                  Resume : https://drive.google.com/file/d/1hR9--aRD8I2EMh49VcZ97kvfRLbEgk7S/view?usp=drive_link
                  Job role : https://lnkd.in/dj2gv2CN
                  Thank you,
                  Pavan Kumar."""
              ]
    categories = ["referral", "thanks", "networking", "general", "sponsorship", "opporutiny", "other", "meeting_request", "marketing", "event", "collaboration", "feedback", "greeting"]    
    # Perform classification
    for message in messages:
      predicted_category = classify_message(message, categories)
      print(predicted_category)

if __name__ == "__main__":
    main()
