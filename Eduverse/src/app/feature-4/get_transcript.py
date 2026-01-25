import re
from youtube_transcript_api import YouTubeTranscriptApi

def extract_video_id(youtube_url):
    """Extract video ID from YouTube URL"""
    patterns = [
        r'(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)',
        r'youtube\.com\/embed\/([^&\n?#]+)',
        r'youtube\.com\/v\/([^&\n?#]+)'
    ]
    
    for pattern in patterns:
        match = re.search(pattern, youtube_url)
        if match:
            return match.group(1)
    return None

def get_transcript(youtube_url):
    """Get transcript from YouTube video"""
    print("=" * 70)
    print("YouTube Transcript Generator")
    print("=" * 70)
    
    # Extract video ID
    video_id = extract_video_id(youtube_url)
    if not video_id:
        print("❌ Error: Invalid YouTube URL format")
        return
    
    print(f"✓ Video ID: {video_id}")
    print(f"✓ URL: {youtube_url}\n")
    
    try:
        # Get transcript directly using instance method
        api = YouTubeTranscriptApi()
        
        # Try English first, then any available language
        try:
            transcript = api.fetch(video_id, languages=['en'])
            print(f"✓ Successfully fetched English transcript with {len(transcript)} entries\n")
        except:
            # If English not available, get any available transcript
            transcript_list = api.list(video_id)
            # Get first available transcript from the list
            first_transcript = None
            for t in transcript_list:
                first_transcript = t
                break
            
            if first_transcript:
                lang = first_transcript.language_code
                print(f"⚠ English not available. Using {first_transcript.language} ({lang}) instead\n")
                transcript = api.fetch(video_id, languages=[lang])
                print(f"✓ Successfully fetched {first_transcript.language} transcript with {len(transcript)} entries\n")
            else:
                print("❌ No transcripts available for this video")
                return
        print("=" * 70)
        print("TRANSCRIPT")
        print("=" * 70 + "\n")
        
        # Display full transcript
        for i, entry in enumerate(transcript, 1):
            time_seconds = entry.start
            minutes = int(time_seconds // 60)
            seconds = int(time_seconds % 60)
            print(f"[{minutes:02d}:{seconds:02d}] {entry.text}")
        
        print("\n" + "=" * 70)
        print(f"Total entries: {len(transcript)}")
        print("=" * 70)
        
        # Optionally save to file
        with open("transcript.txt", "w", encoding="utf-8") as f:
            for entry in transcript:
                f.write(entry.text + " ")
        
        print("\n✓ Transcript saved to transcript.txt")
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")

if __name__ == "__main__":
    # Get URL from command line or use default
    import sys
    
    if len(sys.argv) > 1:
        url = sys.argv[1]
    else:
        url = "https://www.youtube.com/watch?v=gDZ6czwuQ18"
    
    get_transcript(url)
