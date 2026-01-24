import { NextRequest, NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(req: NextRequest) {
  try {
    const { userEmail } = await req.json();

    if (!userEmail) {
      return NextResponse.json(
        { error: "Missing userEmail" },
        { status: 400 }
      );
    }

    console.log('Seeding test data for:', userEmail);

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Ensure user exists
    const { error: userError } = await supabase
      .from('users')
      .upsert({ 
        email: userEmail,
        display_name: userEmail.split('@')[0] 
      }, { 
        onConflict: 'email' 
      });

    if (userError) {
      console.error('User insert error:', userError);
    }

    // 2. Create or update user_points
    const { error: pointsError } = await supabase
      .from('user_points')
      .upsert({
        user_email: userEmail,
        points: 150,
        total_chapters_completed: 15,
        total_courses_completed: 2,
        last_updated: new Date().toISOString()
      }, {
        onConflict: 'user_email'
      });

    if (pointsError) {
      console.error('Points insert error:', pointsError);
      return NextResponse.json(
        { error: 'Failed to insert points', details: pointsError.message },
        { status: 500 }
      );
    }

    // 3. Add points history (last 30 days with varied activity)
    const historyEntries = [];
    const now = new Date();
    
    // Add entries for the last 30 days with some variation
    for (let i = 0; i < 30; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      
      // Add 1-3 entries per day (varied activity)
      const entriesPerDay = Math.floor(Math.random() * 3) + 1;
      
      for (let j = 0; j < entriesPerDay; j++) {
        historyEntries.push({
          user_email: userEmail,
          points_earned: 10,
          reason: `Completed chapter: Test Chapter ${i * 3 + j + 1}`,
          earned_at: date.toISOString()
        });
      }
    }

    // Delete existing history for this user first
    await supabase
      .from('points_history')
      .delete()
      .eq('user_email', userEmail);

    // Insert new history
    const { error: historyError } = await supabase
      .from('points_history')
      .insert(historyEntries);

    if (historyError) {
      console.error('History insert error:', historyError);
      return NextResponse.json(
        { error: 'Failed to insert history', details: historyError.message },
        { status: 500 }
      );
    }

    // 4. Create a test course if it doesn't exist
    const { data: existingCourse } = await supabase
      .from('courses')
      .select('id')
      .eq('userEmail', userEmail)
      .limit(1)
      .single();

    let courseId = existingCourse?.id;

    if (!courseId) {
      const { data: newCourse, error: courseError } = await supabase
        .from('courses')
        .insert({
          cid: `course-${Date.now()}`,
          name: 'Introduction to Programming',
          description: 'Learn the basics of programming',
          noOfChapters: 10,
          includeVideo: true,
          level: 'Beginner',
          category: 'Programming',
          courseJson: {},
          userEmail: userEmail,
          bannerImageUrl: ''
        })
        .select('id')
        .single();

      if (courseError) {
        console.error('Course insert error:', courseError);
      } else {
        courseId = newCourse?.id;
      }
    }

    // 5. Add user progress
    if (courseId) {
      const progressEntries = [];
      for (let i = 0; i < 5; i++) {
        progressEntries.push({
          user_email: userEmail,
          course_id: courseId,
          chapter_index: i,
          chapter_name: `Chapter ${i + 1}`,
          is_completed: true,
          completed_at: new Date(Date.now() - (5 - i) * 24 * 60 * 60 * 1000).toISOString()
        });
      }

      // Delete existing progress for this user and course
      await supabase
        .from('user_progress')
        .delete()
        .eq('user_email', userEmail)
        .eq('course_id', courseId);

      const { error: progressError } = await supabase
        .from('user_progress')
        .insert(progressEntries);

      if (progressError) {
        console.error('Progress insert error:', progressError);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Test data seeded successfully!',
      data: {
        userEmail,
        points: 150,
        historyEntries: historyEntries.length,
        courseCreated: !!courseId,
        progressEntries: 5
      }
    });

  } catch (error) {
    console.error("Seed data API error:", error);
    return NextResponse.json(
      { error: "Failed to seed data", details: (error as Error).message },
      { status: 500 }
    );
  }
}
