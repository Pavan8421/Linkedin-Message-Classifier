from django.shortcuts import render
from .gemini_classify import classify_message
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import json
# Create your views here.

@csrf_exempt
def classify(request):
    try:
        data = json.loads(request.body)
        messages = data.get('messages', 'Undefined')
        if messages == 'Undefined':
            return JsonResponse({
                "status": "False",
                "predicted_category": None,
                "message": "No message provided in the request."
            }, status=400)
        
        print(messages)
        # Define categories
        categories = [
            "referral", "thanks", "networking", "general", "sponsorship", 
            "opporutiny", "other", "meeting_request", "marketing", 
            "event", "collaboration", "feedback"
        ]
        
        # Call the classify_message function
        predicted_category = classify_message(messages, categories)
        print(predicted_category)
        # Return success response
        return JsonResponse({
            "status": "True",
            "predicted_category": predicted_category.strip(),  # Clean response
            "message": "Category predicted successfully."
        }, status=200)

    except Exception as e:
        # Handle any unexpected errors
        return JsonResponse({
            "status": "False",
            "predicted_category": None,
            "message": f"An error occurred: {str(e)}"
        }, status=500)