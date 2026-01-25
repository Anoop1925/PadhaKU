"""
Playground Backend - YouTube to Interactive HTML
Converts educational YouTube videos into interactive learning playgrounds
"""

from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api._errors import TranscriptsDisabled, NoTranscriptFound, VideoUnavailable
import google.generativeai as genai
from googleapiclient.discovery import build
import re
import os
from dotenv import load_dotenv
import yt_dlp
import requests
import xml.etree.ElementTree as ET

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

# Configure Gemini API
API_KEY = os.getenv('PLAYGROUND_API_KEY')
if not API_KEY:
    raise ValueError("PLAYGROUND_API_KEY not found in environment variables")

genai.configure(api_key=API_KEY)

# Configure YouTube Data API v3
YOUTUBE_API_KEY = os.getenv('YOUTUBE_DATA_API_KEY')
if not YOUTUBE_API_KEY:
    raise ValueError("YOUTUBE_DATA_API_KEY not found in environment variables")

youtube = build('youtube', 'v3', developerKey=YOUTUBE_API_KEY)

# Use gemini-2.5-flash model with proper configuration
generation_config = {
    "temperature": 0.7,
    "top_p": 0.95,
    "top_k": 40,
    "max_output_tokens": 8192,
}

model = genai.GenerativeModel('gemini-2.5-flash-lite', generation_config=generation_config)

def clean_transcript_text(text):
    """Strips music cues and filler words, then truncates."""
    # Remove music/sound cues [Music], (Laughter), etc.
    text = re.sub(r'\[.*?\]|\(.*?\)', '', text)
    
    # Remove filler words
    fluff = ["um", "uh", "like", "you know", "actually", "basically"]
    for word in fluff:
        text = re.compile(re.escape(word), re.IGNORECASE).sub('', text)
        
    text = " ".join(text.split())
    # Limit to 10k characters for optimal token usage
    return text[:10000]

def fetch_captions_via_timedtext(video_id):
    """
    Fetch captions directly from YouTube's TimedText API (no OAuth needed)
    Tries multiple direct endpoints that work for public captions
    """
    try:
        print(f"[INFO] Method 4: TimedText API for video: {video_id}")
        
        # Try direct caption URLs (simpler than listing first)
        caption_urls = [
            f"https://www.youtube.com/api/timedtext?v={video_id}&lang=en",
            f"https://www.youtube.com/api/timedtext?v={video_id}&lang=en-US",
            f"https://www.youtube.com/api/timedtext?v={video_id}&lang=en-GB",
        ]
        
        for url in caption_urls:
            try:
                response = requests.get(url, timeout=15, headers={
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                })
                
                if response.status_code == 200 and len(response.content) > 100:
                    # Parse XML captions
                    root = ET.fromstring(response.content)
                    text_elements = root.findall('.//text')
                    
                    if text_elements:
                        caption_text = ' '.join([elem.text.strip() for elem in text_elements if elem.text])
                        if len(caption_text) > 100:
                            print(f"[SUCCESS] TimedText API: {len(caption_text)} chars from {url.split('&lang=')[1]}")
                            return caption_text
                        
            except Exception as e:
                continue
        
        print("[WARN] TimedText API: No captions found")
        return None
        
    except Exception as e:
        print(f"[ERROR] TimedText API failed: {str(e)}")
        return None

def get_video_id(url):
    """Extract YouTube video ID from URL"""
    regex = r"(?:v=|\/)([0-9A-Za-z_-]{11}).*"
    match = re.search(regex, url)
    return match.group(1) if match else None

@app.route('/')
def root():
    """Root endpoint"""
    return jsonify({
        "service": "Playground Backend", 
        "status": "running",
        "endpoints": {
            "/health": "GET - Health check",
            "/generate": "POST - Generate playground from YouTube URL"
        }
    })

@app.route('/health')
def health():
    """Health check endpoint"""
    return jsonify({"status": "healthy", "model": "gemini-2.5-flash-lite"})

@app.route('/generate', methods=['POST'])
def generate():
    """Generate interactive playground from YouTube URL"""
    data = request.json
    video_url = data.get('url')
    
    print(f"\n[REQUEST] Received URL: {video_url}")
    
    video_id = get_video_id(video_url)
    
    if not video_id:
        print("[ERROR] Invalid YouTube URL format")
        return jsonify({"error": "Invalid YouTube URL"}), 400
    
    print(f"[INFO] Extracted video ID: {video_id}")

    try:
        # Use YouTube Data API v3 to get video information
        print(f"[INFO] Fetching video data using YouTube Data API v3...")
        
        # Get video details (title, description, etc.)
        video_response = youtube.videos().list(
            part='snippet',
            id=video_id
        ).execute()
        
        if not video_response.get('items'):
            print("[ERROR] Video not found or unavailable")
            return jsonify({
                "error": "Video not found. Please check the URL and try again."
            }), 400
        
        video_info = video_response['items'][0]['snippet']
        video_title = video_info.get('title', '')
        video_description = video_info.get('description', '')
        
        print(f"[SUCCESS] Got video metadata:")
        print(f"  Title: {video_title}")
        print(f"  Description length: {len(video_description)} chars")
        
        # Fetch transcript using youtube-transcript-api v1.2.3
        print(f"[INFO] Fetching transcript for video ID: {video_id}")
        transcript_text = ""
        
        try:
            print("[INFO] Using youtube-transcript-api v1.2.3...")
            api = YouTubeTranscriptApi()
            
            # List available transcripts
            transcript_list = api.list(video_id)
            
            # Try to get English transcript first
            transcript = None
            try:
                transcript = transcript_list.find_transcript(['en', 'en-US', 'en-GB'])
                print(f"[SUCCESS] Found English transcript ({transcript.language})")
            except:
                # Fall back to first available transcript
                print("[WARN] No English transcript, using first available...")
                for t in transcript_list:
                    transcript = t
                    print(f"[INFO] Using {t.language} transcript")
                    break
            
            if transcript:
                # Fetch transcript data
                transcript_data = transcript.fetch()
                transcript_text = " ".join([entry['text'] for entry in transcript_data])
                print(f"[SUCCESS] Fetched transcript: {len(transcript_data)} segments, {len(transcript_text)} chars")
            else:
                print("[WARN] No transcripts available for this video")
                
        except Exception as e:
            print(f"[ERROR] Failed to fetch transcript: {str(e)}")
            # Try TimedText API as fallback
            print("[INFO] Trying TimedText API as fallback...")
            transcript_text = fetch_captions_via_timedtext(video_id)
            if transcript_text:
                print(f"[SUCCESS] Got {len(transcript_text)} chars via TimedText API")
            else:
                print("[WARN] All transcript methods failed")
        
        # Combine all information
        content_parts = [
            f"VIDEO TITLE: {video_title}",
            f"\nVIDEO DESCRIPTION:\n{video_description[:1000]}",  # Reduced from 3000 to 1000
        ]
        
        if transcript_text:
            cleaned_transcript = clean_transcript_text(transcript_text)
            # Limit transcript to 2000 characters to reduce API load
            transcript_excerpt = cleaned_transcript[:2000] + "..." if len(cleaned_transcript) > 2000 else cleaned_transcript
            content_parts.append(f"\nVIDEO TRANSCRIPT EXCERPT:\n{transcript_excerpt}")
            print(f"[INFO] Including transcript excerpt: {len(transcript_excerpt)} chars")
        else:
            content_parts.append("\nNote: Video transcript not available. Creating playground based on title and description.")
        
        combined_content = "\n".join(content_parts)
        print(f"[INFO] Total content length: {len(combined_content)} characters")
        
        # --- COMPLETE TERMINAL LOGS ---
        print("\n" + "="*60)
        print(f"LOGS: VIDEO CONTENT (SENT TO GEMINI 2.5 FLASH)")
        print("-" * 60)
        print(combined_content[:500] + "..." if len(combined_content) > 500 else combined_content) 
        print("="*60 + "\n")

        prompt = f"""
Create an interactive visual simulation based on this YouTube video:

{combined_content}

TASK: Build a single-page HTML playground with interactive visualizations.

VISUALIZATION RULES:
• MATH/PHYSICS: Interactive graphs with draggable elements, real-time calculations (Chart.js/Canvas)
• BIOLOGY/CHEMISTRY: Clickable diagrams with animations and detailed labels
• SPACE/ENGINEERING: 2D physics simulations with controllable parameters
• OTHER TOPICS: Interactive quizzes, branching maps, or concept explorers

REQUIREMENTS:
• Use Tailwind CSS for modern glassmorphism UI
• Include interactive controls (sliders, buttons, drag elements)
• Add reset button and smooth transitions
• Make it educational and accurate to video content
• Output pure HTML/CSS/JS (no markdown, no ```html tags)
• Add clear title showing the topic

Focus on creating visual, hands-on learning experiences that directly relate to the video's core concepts.
"""

        print("[INFO] Sending prompt to Gemini 2.5 Flash...")
        
        # Retry logic for Gemini API
        max_retries = 2
        retry_count = 0
        response = None
        
        while retry_count < max_retries:
            try:
                # Generate content without invalid request_options
                response = model.generate_content(prompt)
                print(f"[SUCCESS] Received response from Gemini")
                break
            except Exception as gemini_error:
                retry_count += 1
                error_msg = str(gemini_error)
                print(f"[ERROR] Gemini attempt {retry_count} failed: {error_msg}")
                
                if retry_count < max_retries:
                    print(f"[INFO] Retrying... ({retry_count}/{max_retries})")
                    import time
                    time.sleep(3)  # Wait 3 seconds before retry
                else:
                    print(f"[ERROR] All Gemini retries failed")
                    return jsonify({
                        "error": f"AI generation failed after {max_retries} attempts. The request may be too complex or the service is temporarily unavailable. Error: {error_msg}"
                    }), 500
        
        if not response or not response.text:
            return jsonify({"error": "AI generated empty response"}), 500
        
        clean_html = response.text.replace("```html", "").replace("```", "").strip()
        print(f"[INFO] Generated HTML length: {len(clean_html)} characters")
        
        return jsonify({"html": clean_html, "video_id": video_id})

    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"CRITICAL ERROR: {str(e)}")
        print(f"Full traceback:\n{error_details}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    # Bind to 0.0.0.0 for Render deployment, use PORT env variable
    port = int(os.environ.get('PORT', 8080))
    app.run(debug=False, host='0.0.0.0', port=port)
