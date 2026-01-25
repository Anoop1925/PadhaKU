import re
import sys
from urllib.parse import urlparse, parse_qs
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api._errors import TranscriptsDisabled, NoTranscriptFound

def extract_video_id(youtube_url):
    """
    Extract video ID from various YouTube URL formats
    Supports:
    - https://www.youtube.com/watch?v=VsFjP58j5i8
    - https://youtu.be/VsFjP58j5i8
    - https://www.youtube.com/watch?v=VsFjP58j5i8&list=...
    """
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

def download_transcript(youtube_url, output_file=None, language='en'):
    """
    Download transcript from a YouTube video
    
    Args:
        youtube_url (str): YouTube video URL
        output_file (str): Optional file path to save transcript
        language (str): Language code for transcript (default: 'en')
    
    Returns:
        dict: Contains status, transcript data, and any messages
    """
    result = {
        'success': False,
        'video_id': None,
        'transcript': None,
        'message': '',
        'error': None
    }
    
    # Extract video ID
    video_id = extract_video_id(youtube_url)
    if not video_id:
        result['error'] = 'Invalid YouTube URL format'
        print(f"❌ Error: {result['error']}")
        return result
    
    result['video_id'] = video_id
    print(f"✓ Video ID extracted: {video_id}")
    
    try:
        # Try to fetch transcript in requested language
        try:
            transcript_data = YouTubeTranscriptApi.get_transcript(video_id, languages=[language])
            print(f"✓ Found {language} transcript")
        except NoTranscriptFound:
            print(f"⚠ No {language} transcript found, attempting to fetch available transcripts...")
            # Try to get any available transcript
            transcript_data = YouTubeTranscriptApi.get_transcript(video_id)
            print(f"✓ Successfully fetched available transcript")
        
        result['transcript'] = transcript_data
        result['success'] = True
        result['message'] = f"Successfully downloaded transcript with {len(transcript_data)} entries"
        
        print(f"✓ {result['message']}")
        
        # Save to file if specified
        if output_file:
            with open(output_file, 'w', encoding='utf-8') as f:
                for entry in transcript_data:
                    f.write(f"{entry['text']}\n")
            print(f"✓ Transcript saved to: {output_file}")
            result['message'] += f"\nTranscript saved to: {output_file}"
        
        # Print first 500 characters as preview
        full_text = ' '.join([entry['text'] for entry in transcript_data])
        print(f"\n📝 Transcript Preview (first 500 characters):\n")
        print(full_text[:500] + "...\n")
        
        return result
        
    except TranscriptsDisabled:
        result['error'] = 'Transcripts are disabled for this video'
        print(f"❌ Error: {result['error']}")
        return result
    
    except NoTranscriptFound:
        result['error'] = 'No transcripts found for this video'
        print(f"❌ Error: {result['error']}")
        return result
    
    except Exception as e:
        result['error'] = str(e)
        print(f"❌ Error: {result['error']}")
        return result

def main():
    """
    Main function to run the transcript downloader
    """
    # Example YouTube URL
    youtube_url = "https://www.youtube.com/watch?v=VsFjP58j5i8&list=RDVsFjP58j5i8&start_radio=1"
    
    # Output file path
    output_file = "transcript.txt"
    
    print("=" * 70)
    print("YouTube Transcript Downloader")
    print("=" * 70)
    print(f"\nURL: {youtube_url}")
    print(f"Output file: {output_file}\n")
    
    # Download transcript
    result = download_transcript(youtube_url, output_file=output_file)
    
    # Print summary
    print("\n" + "=" * 70)
    print("Summary:")
    print("=" * 70)
    print(f"Status: {'SUCCESS ✓' if result['success'] else 'FAILED ❌'}")
    print(f"Video ID: {result['video_id']}")
    if result['transcript']:
        print(f"Transcript entries: {len(result['transcript'])}")
    if result['error']:
        print(f"Error: {result['error']}")
    else:
        print(f"Message: {result['message']}")
    print("=" * 70)

if __name__ == "__main__":
    main()
