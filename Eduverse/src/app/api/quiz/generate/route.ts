import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const client = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

export async function POST(req: NextRequest) {
  try {
    const { courseId, cid, chapterIndex } = await req.json();

    if ((!courseId && !cid) || chapterIndex === undefined) {
      return NextResponse.json(
        { error: "Missing courseId/cid or chapterIndex" },
        { status: 400 }
      );
    }

    // Fetch course from database - support both id and cid lookup
    const supabase = createClient(supabaseUrl, supabaseKey);
    let course;
    let courseError;
    
    if (cid) {
      // Lookup by cid (string identifier)
      const result = await supabase
        .from("courses")
        .select("id, cid, coursejson, name")
        .eq("cid", cid)
        .single();
      course = result.data;
      courseError = result.error;
    } else {
      // Lookup by id (numeric)
      const result = await supabase
        .from("courses")
        .select("id, cid, coursejson, name")
        .eq("id", courseId)
        .single();
      course = result.data;
      courseError = result.error;
    }

    if (courseError || !course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    const courseJson = course.coursejson;
    const chapters = courseJson.chapters || [];

    if (chapterIndex < 0 || chapterIndex >= chapters.length) {
      return NextResponse.json(
        { error: "Invalid chapter index" },
        { status: 400 }
      );
    }

    const chapter = chapters[chapterIndex];
    const chapterName = chapter.chapterName;
    const subtopics = chapter.subtopics || [];

    // Build subtopic content for the prompt
    const subtopicContent = subtopics
      .map(
        (st: { title: string; theory: string; example: string }) =>
          `- ${st.title}: ${st.theory}. Example: ${st.example}`
      )
      .join("\n");

    const prompt = `You are a quiz generator for an educational platform. Generate EXACTLY 5 multiple choice questions based on the following chapter content.

Chapter: ${chapterName}
Course: ${course.name}

Subtopics:
${subtopicContent}

Requirements:
1. Generate exactly 5 MCQ questions
2. Each question should have exactly 4 options
3. IMPORTANT: Each option must be SHORT - maximum 3-4 words only. No long sentences.
4. Questions should test understanding of the subtopics
5. Make questions educational but fun
6. Vary difficulty from easy to medium

Respond with ONLY valid JSON in this exact format (no markdown, no code blocks):
{
  "questions": [
    {
      "question": "Question text here?",
      "options": ["Short Option", "Another One", "Third Choice", "Last Option"],
      "correctAnswerIndex": 0
    }
  ]
}`;

    const response = await client.chat.completions.create({
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      messages: [
        {
          role: "system",
          content:
            "You are a helpful quiz generator. Always respond with valid JSON only, no markdown formatting.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 1500,
    });

    const content = response.choices[0]?.message?.content || "";

    // Parse the JSON response
    let quizData;
    try {
      // Remove any potential markdown code blocks
      const cleanContent = content
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      quizData = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error("Failed to parse quiz response:", content);
      return NextResponse.json(
        { error: "Failed to generate quiz. Please try again." },
        { status: 500 }
      );
    }

    // Validate the quiz structure
    if (
      !quizData.questions ||
      !Array.isArray(quizData.questions) ||
      quizData.questions.length !== 5
    ) {
      return NextResponse.json(
        { error: "Invalid quiz format generated. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      quiz: quizData,
      chapterName,
      courseName: course.name,
      courseId: course.id,
      cid: course.cid,
    });
  } catch (error) {
    console.error("Quiz generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate quiz" },
      { status: 500 }
    );
  }
}
