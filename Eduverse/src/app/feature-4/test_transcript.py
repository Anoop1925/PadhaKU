import re
from youtube_transcript_api import YouTubeTranscriptApi

url = 'https://www.youtube.com/watch?v=gDZ6czwuQ18'
video_id = re.search(r'(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)', url).group(1)

print("=" * 70)
print("YouTube Transcript Downloader")
print("=" * 70)
print(f"Video ID: {video_id}\n")

api = YouTubeTranscriptApi()
transcript_list = api.list(video_id)
first_transcript = next(iter(transcript_list))
print(f"Language: {first_transcript.language}")
print(f"Language Code: {first_transcript.language_code}")
print(f"Is Generated: {first_transcript.is_generated}\n")

transcript = api.fetch(video_id, languages=[first_transcript.language_code])
print(f"Total entries: {len(transcript)}\n")

print("=" * 70)
print("TRANSCRIPT (showing entries)")
print("=" * 70 + "\n")

# Show first 30 entries
for i, entry in enumerate(transcript[:30]):
    minutes = int(entry.start // 60)
    seconds = int(entry.start % 60)
    print(f"[{minutes:02d}:{seconds:02d}] {entry.text}")

print("\n" + "=" * 70)
print("(Showing first 30 of {} total entries)".format(len(transcript)))
print("=" * 70)

# Save full transcript to file
with open("transcript.txt", "w", encoding="utf-8") as f:
    for entry in transcript:
        f.write(entry.text + " ")

print("\nFull transcript saved to transcript.txt")
