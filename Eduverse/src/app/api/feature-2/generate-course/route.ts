import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import { getJson } from 'serpapi';
import OpenAI from 'openai';

// Initialize Groq client (using OpenAI SDK with Groq base URL)
const groqClient = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

// Interface for playlist-based course structure
interface PlaylistVideo {
  videoId: string;
  title: string;
  videoUrl: string;
  isEmbeddable: boolean;
}

interface PlaylistCourseData {
  playlistId: string;
  playlistTitle: string;
  videos: PlaylistVideo[];
}

// Function to find matching playlist from popular educational channels
async function findPlaylistCourse(courseName: string): Promise<PlaylistCourseData | null> {
  try {
    const youtubeApiKey = process.env.YOUTUBE_API_KEY;
    if (!youtubeApiKey) {
      console.warn("⚠️ YouTube API key not found");
      return null;
    }

    // Popular educational channels to search
    const educationalChannels = [
      { name: 'CodeWithHarry', id: 'UC7btqG2Ww0_2LwuQxpvo2HQ' },
      { name: 'Apna College', id: 'UCBwmMxybNva6P_5VmxjzwqA' },
      { name: 'freeCodeCamp.org', id: 'UC8butISFwT-Wl7EV0hUK0BQ' },
      { name: 'WsCube Tech', id: 'UCG2g95-tU-KdcT0QoN9E4cg' },
      { name: 'Hitesh Choudhary', id: 'UCXgGY0wkgOzynnHvSEVmE3A' }
    ];
    
    // Extract main keyword from course name (e.g., "Python" from "Python Tutorial")
    const keywords = courseName.toLowerCase().split(' ');
    const mainKeyword = keywords[0]; // Use first word as primary keyword
    
    console.log(`🔍 Searching for "${mainKeyword}" playlists across multiple channels...`);
    console.log(`🔑 Using API Key: ${youtubeApiKey.substring(0, 10)}...`);
    
    // Search each channel for matching playlists
    for (const channel of educationalChannels) {
      console.log(`\n📺 Checking channel: ${channel.name}`);
      
      try {
        // Search for matching playlists using YouTube Data API v3
        const playlistSearch = await axios.get(
          `https://www.googleapis.com/youtube/v3/search`,
          {
            params: {
              part: 'id,snippet',
              maxResults: 5,
              q: mainKeyword,
              type: 'playlist',
              channelId: channel.id,
              key: youtubeApiKey,
            }
          }
        );

        if (playlistSearch.data.items && playlistSearch.data.items.length > 0) {
          // Find best matching playlist
          for (const playlistItem of playlistSearch.data.items) {
            const playlistId = playlistItem.id.playlistId;
            const playlistTitle = playlistItem.snippet.title;
            
            console.log(`   📚 Found playlist: "${playlistTitle}"`);
        
        // Get all videos from this playlist (up to 50)
        const playlistVideos = await axios.get(
          `https://www.googleapis.com/youtube/v3/playlistItems`,
          {
            params: {
              part: 'contentDetails,snippet',
              maxResults: 50,
              playlistId: playlistId,
              key: youtubeApiKey,
            }
          }
        );

        if (playlistVideos.data.items && playlistVideos.data.items.length > 0) {
          console.log(`   ✅ Found ${playlistVideos.data.items.length} videos in playlist`);
          
          // Extract video data and check embeddability
          const videos: PlaylistVideo[] = [];
          
          for (const video of playlistVideos.data.items) {
            const videoId = video.contentDetails.videoId;
            const videoTitle = video.snippet.title;
            const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
            
            // Check if video is embeddable (but still return it regardless)
            try {
              const videoCheck = await axios.get(
                `https://www.googleapis.com/youtube/v3/videos`,
                {
                  params: {
                    part: 'status',
                    id: videoId,
                    key: youtubeApiKey,
                  }
                }
              );

              const isEmbeddable = videoCheck.data.items?.[0]?.status?.embeddable || false;
              
              videos.push({
                videoId,
                title: videoTitle,
                videoUrl,
                isEmbeddable
              });
            } catch {
              // If check fails, add video anyway with embeddable=false
              videos.push({
                videoId,
                title: videoTitle,
                videoUrl,
                isEmbeddable: false
              });
            }
          }

          console.log(`   ✅ Using playlist from ${channel.name}: "${playlistTitle}"`);
          return {
            playlistId,
            playlistTitle,
            videos
          };
        }
          }
        }
      } catch (channelError: any) {
        console.warn(`   ⚠️ Error searching ${channel.name}:`, channelError.message);
        // Continue to next channel
      }
    }

    console.log('\n❌ No matching playlist found across all channels');
    return null;
  } catch (error) {
    console.error("❌ Playlist search error:", error);
    return null;
  }
}

// Function to search YouTube videos (fallback for manual search)
async function searchYouTubeVideo(topic: string): Promise<string> {
  try {
    const youtubeApiKey = process.env.YOUTUBE_API_KEY;
    if (!youtubeApiKey) {
      console.warn("⚠️ YouTube API key not found, skipping video search");
      return "";
    }

    const searchQuery = `${topic} tutorial`;
    console.log(`🔍 Manual search for: "${searchQuery}"`);
    
    const codeWithHarryId = 'UC7btqG2Ww0_2LwuQxpvo2HQ';
    
    try {
      // Search in Code with Harry channel first
      console.log(`🔑 Using YouTube API Key: ${youtubeApiKey?.substring(0, 10)}...`);
      const videoSearch = await axios.get(
        `https://www.googleapis.com/youtube/v3/search`,
        {
          params: {
            part: 'id,snippet',
            maxResults: 5,
            q: searchQuery,
            type: 'video',
            channelId: codeWithHarryId,
            key: youtubeApiKey,
            order: 'relevance',
          }
        }
      );

      if (videoSearch.data.items && videoSearch.data.items.length > 0) {
        // Return first video URL (regardless of embeddability - YouTube button will work)
        const videoId = videoSearch.data.items[0].id.videoId;
        const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
        console.log(`   ✅ Found video: ${videoId}`);
        return videoUrl;
      }

      // Fallback: General YouTube search
      const generalSearch = await axios.get(
        `https://www.googleapis.com/youtube/v3/search`,
        {
          params: {
            part: 'id',
            maxResults: 1,
            q: searchQuery,
            type: 'video',
            key: youtubeApiKey,
          }
        }
      );

      if (generalSearch.data.items && generalSearch.data.items.length > 0) {
        const videoId = generalSearch.data.items[0].id.videoId;
        const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
        console.log(`   ✅ Found video (general search): ${videoId}`);
        return videoUrl;
      }
    } catch (err: any) {
      console.log('   ⚠️ Video search failed:', err.message);
      if (err.response) {
        console.log('   📋 Response data:', err.response.data);
        console.log('   📋 Response status:', err.response.status);
      }
    }

    console.warn(`⚠️ No videos found for: ${searchQuery}`);
    return "";
  } catch (error) {
    console.error("❌ YouTube API Error:", error);
    return "";
  }
}

// Function to generate course banner image using Gemini Image Generation API
async function generateCourseImage(courseName: string, category: string, level: string): Promise<string> {
  try {
    // Use SerpAPI key
    const apiKey = process.env.SERPAPI_KEY || '22537f15f67af3a5b2da664715a88d57047d5ef77942ca76b91e4300d565486c';
    if (!apiKey) {
      console.warn("⚠️ SERPAPI_KEY not found, skipping image generation");
      return "";
    }

    // Use course name as search keyword (first word or full name)
    const searchKeyword = courseName.split(' ')[0] || courseName;

    console.log(`🔍 Searching Google Images for course banner: "${searchKeyword}"`);

    // Search Google Images using SerpAPI
    const searchResults: any = await new Promise((resolve, reject) => {
      getJson({
        q: searchKeyword,
        engine: 'google_images',
        ijn: '0',
        api_key: apiKey
      }, (json: any) => {
        if (json.error) {
          reject(new Error(json.error));
        } else {
          resolve(json);
        }
      });
    });

    // Extract the first rectangular (landscape) image suitable for a banner
    if (!searchResults.images_results || searchResults.images_results.length === 0) {
      console.warn(`⚠️ No image results found for: "${searchKeyword}"`);
      return "";
    }

    // Find first rectangular image (width >= height * 1.8) for banner
    let selectedImage = null;
    for (const image of searchResults.images_results) {
      const width = image.original_width;
      const height = image.original_height;
      
      // Check if image is rectangular/landscape (width should be at least 1.8x the height)
      if (width && height && width >= height * 1.75) {
        selectedImage = image;
        console.log(`📐 Found rectangular banner image: ${width}x${height} (ratio: ${(width/height).toFixed(2)})`);
        break;
      }
    }

    // Fallback to first image if no rectangular image found
    if (!selectedImage) {
      console.warn(`⚠️ No rectangular image (1.8 ratio) found, using first available image`);
      selectedImage = searchResults.images_results[0];
    }

    // Use thumbnail for "zoomed out" effect to avoid cropping
    const imageUrl = selectedImage.thumbnail || selectedImage.original;

    if (!imageUrl) {
      console.warn(`⚠️ No image URL found in selected result`);
      return "";
    }

    console.log(`✅ Course banner found successfully: ${imageUrl}`);
    return imageUrl;

  } catch (error) {
    console.error("❌ Error searching course banner:", error);
    return "";
  }
}

export async function POST(req: NextRequest) {
  try {
    const {
      name,
      description,
      category,
      level,
      includeVideo,
      noOfChapters
    } = await req.json();

    console.log("📝 Course Generation Request:");
    console.log("- Name:", name);
    console.log("- Include Video:", includeVideo);
    console.log("- YouTube API Key exists:", !!process.env.YOUTUBE_API_KEY);

    // Validate required fields
    if (!name || !description || !category || !level || !noOfChapters) {
      return NextResponse.json(
        { error: 'Missing required fields: name, description, category, level, noOfChapters' },
        { status: 400 }
      );
    }
    // Step 1: Try to find matching Code with Harry playlist
    let playlistData: PlaylistCourseData | null = null;
    
    if (includeVideo) {
      console.log("\n🎬 Step 1: Searching for matching playlist...");
      try {
        playlistData = await findPlaylistCourse(name);
      } catch (playlistError) {
        console.warn("⚠️ Playlist search failed:", playlistError);
        // Continue with AI-generated course
      }
    }

    let courseData;

    // Step 2: If playlist found, build course from playlist videos
    if (playlistData && playlistData.videos.length > 0) {
      console.log(`\n✅ Using playlist: "${playlistData.playlistTitle}" (${playlistData.videos.length} videos)`);
      console.log(`🎯 Building course structure from playlist videos...`);

      // Divide videos into chapters
      const videosPerChapter = Math.ceil(playlistData.videos.length / noOfChapters);
      const chapters = [];

      for (let i = 0; i < noOfChapters; i++) {
        const startIdx = i * videosPerChapter;
        const endIdx = Math.min(startIdx + videosPerChapter, playlistData.videos.length);
        const chapterVideos = playlistData.videos.slice(startIdx, endIdx);

        const subtopics = chapterVideos.map(video => ({
          title: video.title,
          theory: `Learn about ${video.title} through this comprehensive tutorial. This topic covers essential concepts and practical applications.`,
          example: `Watch the video tutorial for practical examples and demonstrations of ${video.title}.`,
          handsOn: `Complete the exercises shown in the video and try implementing the concepts on your own. Practice makes perfect!`,
          videoUrl: video.videoUrl,
          isEmbeddable: video.isEmbeddable
        }));

        chapters.push({
          chapterName: `Chapter ${i + 1}: ${chapterVideos[0]?.title || 'Learning Section'}`,
          duration: `${chapterVideos.length * 15} minutes`, // Estimate 15 min per video
          subtopics
        });
      }

      // Generate course image
      const bannerImageUrl = await generateCourseImage(name, category, level);

      courseData = {
        course: {
          cid: uuidv4(),
          name,
          description,
          category,
          level,
          includeVideo: includeVideo || false,
          noOfChapters,
          bannerImageUrl,
          bannerImagePrompt: `Course based on ${playlistData.playlistTitle}`,
          userEmail: "demo@user.com",
          playlistSource: playlistData.playlistTitle,
          chapters
        }
      };

      console.log(`✅ Course built successfully with ${chapters.length} chapters and ${playlistData.videos.length} videos`);
    } 
    // Step 3: Fallback to AI-generated course with manual video search
    else {
      console.log("\n🤖 No matching playlist found. Using AI to generate course structure...");

      const prompt = `Generate a detailed, guided, gamified LMS-style learning course based on the following details. Each chapter should have a duration (e.g., '2 hours') and a list of subtopics. Each subtopic should include:
- A theory/reading section (short explanation)
- An example (code or real-world)
- A hands-on task or quiz
- Optionally, a video/tutorial link (if includeVideo is true)

Return only a valid JSON object with the schema below. Do not include any extra text.

Schema:
{
  "course": {
    "cid": "string", // unique id
    "name": "string",
    "description": "string",
    "category": "string",
    "level": "string",
    "includeVideo": "boolean",
    "noOfChapters": "number",
    "bannerImagePrompt": "string",
    "chapters": [
      {
        "chapterName": "string",
        "duration": "string",
        "subtopics": [
          {
            "title": "string",
            "theory": "string",
            "example": "string",
            "handsOn": "string",
            "videoUrl": "string (optional)"
          }
        ]
      }
    ]
  }
}

Details:
Course Name: ${name}
Description: ${description}
Category: ${category}
Level: ${level}
Include Video: ${includeVideo}
Number of Chapters: ${noOfChapters}`;

      // Use Groq API for course generation
      const response = await groqClient.chat.completions.create({
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        messages: [
          {
            role: "system",
            content: "You are a helpful course generator. Always respond with valid JSON only, no markdown formatting or code blocks."
          },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 4000,
      });

      const text = response.choices[0]?.message?.content || "";

      if (!text) throw new Error("No response from Groq");

      // Extract JSON from response (remove any markdown code blocks if present)
      const cleanText = text
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      
      const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error("Failed to extract JSON from Groq response:", text);
        throw new Error("Groq response was not valid JSON");
      }

      try {
        courseData = JSON.parse(jsonMatch[0]);
      } catch (e) {
        console.error("Failed to parse extracted JSON:", e, jsonMatch[0]);
        throw new Error("Groq response was not valid JSON (after extraction)");
      }

      if (!courseData.course || !courseData.course.chapters || courseData.course.chapters.length !== noOfChapters) {
        console.error("Groq response was not valid JSON or extractable:", text);
        throw new Error("Invalid course structure or chapter count mismatch");
      }

      // Generate course image
      const bannerImageUrl = await generateCourseImage(name, category, level);
      
      // Add generated image URL to course data
      courseData.course.bannerImageUrl = bannerImageUrl;
      courseData.course.cid = uuidv4();
      courseData.course.userEmail = "demo@user.com";

      // Manual video search for each subtopic
      if (includeVideo) {
        console.log("🎬 Fetching YouTube videos for subtopics (manual search)...");
        for (const chapter of courseData.course.chapters) {
          for (const subtopic of chapter.subtopics) {
            if (!subtopic.videoUrl || subtopic.videoUrl === "") {
              console.log(`Searching video for: ${subtopic.title}`);
              const videoUrl = await searchYouTubeVideo(subtopic.title);
              subtopic.videoUrl = videoUrl;
              console.log(`${videoUrl ? '✅' : '⚠️'} Video: ${videoUrl || 'not found'}`);
            }
          }
        }
      } else {
        console.log("⏭️ Video search skipped (includeVideo is false)");
      }
    }

    return NextResponse.json(courseData);
  } catch (error) {
    console.error('❌ Course Generation Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { error: errorMessage, details: String(error) }, 
      { status: 500 }
    );
  }
} 