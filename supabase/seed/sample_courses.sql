-- =====================================================================
-- iBox Academy — SAMPLE COURSES (for testing only)
-- Run in Supabase → SQL Editor. Safe to run once; re-running skips
-- courses that already exist. Remove them later with remove_sample_courses.sql.
--
-- Creates 3 published courses (slugs start with "sample-"):
--   1. Video editing for reels   — LKR 4,900, on sale for LKR 2,900
--   2. Freelancing 101           — LKR 100 (for testing PayHere)
--   3. Spoken English confidence — Free (for testing free enrolment)
-- Lessons are text, quiz and assignment lessons so they work without
-- uploading videos. Add your own videos and images in the course builder.
-- =====================================================================

do $$
declare
  c uuid;
  s uuid;
  l uuid;
begin
  -- -------------------------------------------------------------------
  -- 1. Video editing for reels
  -- -------------------------------------------------------------------
  if not exists (select 1 from public.courses where slug = 'sample-video-editing-for-reels') then
    insert into public.courses (
      slug, title, subtitle, description, category_id, level, language,
      outcomes, audience, prerequisites, price_lkr, sale_price_lkr, access_type,
      seo_title, seo_description, preview_checked_at
    ) values (
      'sample-video-editing-for-reels',
      'Video editing for reels: start here',
      'Edit short videos people actually finish watching, using only your phone.',
      $d$This beginner course takes you from raw clips to a finished 30-second reel.

You'll learn how to pick the strongest moments, cut out the slow parts, add captions people read, and export at the right settings for Instagram Reels and TikTok.

Everything is taught on a phone with free apps, in short lessons you can finish on the bus.$d$,
      (select id from public.categories where slug = 'video-content-creation'),
      'beginner', 'en',
      array[
        'Plan a 30-second reel before you start filming',
        'Cut slow parts so viewers keep watching',
        'Add readable captions and simple text titles',
        'Export videos at the right size for Reels and TikTok'
      ],
      array['Beginners who want to start posting short videos', 'Small business owners promoting products on social media'],
      array['A smartphone with a free editing app such as CapCut or InShot'],
      4900, 2900, 'lifetime',
      'Video editing for reels: a beginner course',
      'Learn to edit short videos on your phone: cuts, captions and export settings for Reels and TikTok.',
      now()
    ) returning id into c;

    insert into public.course_sections (course_id, title, position) values (c, 'Getting started', 0) returning id into s;
    insert into public.lessons (course_id, section_id, type, status, title, description, body, reading_minutes, position, is_preview) values
      (c, s, 'text', 'published', 'Welcome and what you''ll need', 'How this course works.',
       $b$# Welcome

In this course you'll edit one complete reel, step by step.

# What you need

- A phone with at least 2 GB of free space
- A free editing app (CapCut or InShot both work)
- 5 to 10 short clips you've filmed yourself

# How to use the lessons

Each lesson is short. Watch or read it, then try the step on your own clips before moving on.$b$, 2, 0, true),
      (c, s, 'text', 'published', 'Plan your reel in 3 lines', 'Decide the hook, the middle and the ending before editing.',
       $b$# The 3-line plan

Before you open the editor, write three lines:

- Hook: what makes someone stop scrolling in the first 2 seconds?
- Middle: the one idea or result you want to show.
- Ending: what should the viewer do next (follow, comment, visit)?

Keep this plan open while you edit. If a clip doesn't support one of the three lines, cut it.$b$, 3, 1, false);

    insert into public.course_sections (course_id, title, position) values (c, 'Editing basics', 1) returning id into s;
    insert into public.lessons (course_id, section_id, type, status, title, description, body, reading_minutes, position) values
      (c, s, 'text', 'published', 'Cut the boring bits', 'The fastest way to make a video feel professional.',
       $b$# Trim every clip

Start every clip at the moment something happens. Delete pauses, "umm"s and the seconds before you start talking.

# The 2-second rule

If nothing new happens on screen for 2 seconds, cut or speed it up.

# Try it

Trim all your clips now, then watch the result once without stopping. Note any moment where you feel bored and cut it.$b$, 3, 0);
    insert into public.lessons (course_id, section_id, type, status, title, description, settings, position)
      values (c, s, 'quiz', 'published', 'Editing basics check', 'Three quick questions.', '{"passPercent": 70}', 1)
      returning id into l;
    insert into public.quiz_questions (lesson_id, position, prompt, options, correct_option_id, explanation) values
      (l, 0, 'Where should most clips start?',
       '[{"id":"a","text":"At the very beginning of the recording"},{"id":"b","text":"At the moment something happens"},{"id":"c","text":"Halfway through"}]',
       'b', 'Starting on the action keeps viewers watching.'),
      (l, 1, 'What does the 2-second rule say?',
       '[{"id":"a","text":"Every clip must be exactly 2 seconds"},{"id":"b","text":"Add a transition every 2 seconds"},{"id":"c","text":"If nothing new happens for 2 seconds, cut or speed it up"}]',
       'c', 'Long static moments are where viewers swipe away.'),
      (l, 2, 'What is the job of the hook?',
       '[{"id":"a","text":"To make someone stop scrolling in the first seconds"},{"id":"b","text":"To show your logo"},{"id":"c","text":"To list everything in the video"}]',
       'a', 'You have about 2 seconds to earn attention.');

    insert into public.course_sections (course_id, title, position) values (c, 'Finishing and posting', 2) returning id into s;
    insert into public.lessons (course_id, section_id, type, status, title, description, body, reading_minutes, position) values
      (c, s, 'text', 'published', 'Captions and export settings', 'Make it readable on mute and sharp on every phone.',
       $b$# Captions

Most people watch with the sound off. Add auto-captions, then fix any wrong words. Keep captions in the middle third of the screen so app buttons don't cover them.

# Export settings

- Size: 1080 x 1920 (vertical 9:16)
- Frame rate: 30 fps
- Resolution: 1080p

Export, then watch it once on your phone before posting.$b$, 3, 0);
    insert into public.lessons (course_id, section_id, type, status, title, description, body, settings, position) values
      (c, s, 'assignment', 'published', 'Edit your first 30-second reel', 'Put everything together.',
       $b$Edit a reel of up to 30 seconds using your own clips.

It should have:

- A clear hook in the first 2 seconds
- No pauses longer than 2 seconds
- Captions that are correct and easy to read
- Vertical 1080 x 1920 export

Submit a link to the posted reel, or upload the exported file. Add one sentence about what you'd improve next time.$b$,
       '{"submission": ["text", "file"], "maxFileMb": 100}', 1);
  end if;

  -- -------------------------------------------------------------------
  -- 2. Freelancing 101 (LKR 100 — handy for PayHere sandbox tests)
  -- -------------------------------------------------------------------
  if not exists (select 1 from public.courses where slug = 'sample-freelancing-101') then
    insert into public.courses (
      slug, title, subtitle, description, category_id, level, language,
      outcomes, audience, prerequisites, price_lkr, access_type, access_days,
      seo_title, seo_description, preview_checked_at
    ) values (
      'sample-freelancing-101',
      'Freelancing 101: land your first client',
      'Turn one skill into paid work online, with a simple profile and a proposal that gets replies.',
      $d$A practical starter course for anyone in Sri Lanka who wants to earn online.

You'll choose a service you can sell, set a fair starting price, write a profile that builds trust, and send proposals that clients answer.

By the end you'll have a ready-to-publish profile and three proposal templates.$d$,
      (select id from public.categories where slug = 'freelancing-online-work'),
      'beginner', 'en',
      array[
        'Choose one service you can sell this month',
        'Set a starting price that wins work without underselling',
        'Write a profile that shows proof, not promises',
        'Send short proposals that clients reply to'
      ],
      array['Students and graduates looking for online income', 'Anyone with a skill who has never freelanced'],
      array[]::text[],
      100, 'fixed_days', 365,
      'Freelancing 101: land your first client',
      'A beginner freelancing course: pick a service, price it, build a profile and win your first client.',
      now()
    ) returning id into c;

    insert into public.course_sections (course_id, title, position) values (c, 'Choose what to sell', 0) returning id into s;
    insert into public.lessons (course_id, section_id, type, status, title, description, body, reading_minutes, position, is_preview) values
      (c, s, 'text', 'published', 'Pick one service', 'Narrow beats broad when you are starting out.',
       $b$# Start narrow

"I do design" is hard to buy. "I design Instagram posts for restaurants" is easy to buy.

# Find your service

- List 3 things people already ask you to help with.
- Pick the one you could deliver within 3 days.
- Write it as: I help [who] get [result] by [what you do].$b$, 3, 0, true),
      (c, s, 'text', 'published', 'Set your first price', 'A simple way to price without guessing.',
       $b$# A starting formula

Estimate the hours a job takes, multiply by a modest hourly rate, then round to a clean number.

# Raise it later

After 3 good reviews, raise your price by 20 to 30 percent. Early reviews matter more than early profit.$b$, 2, 1, false);

    insert into public.course_sections (course_id, title, position) values (c, 'Win the work', 1) returning id into s;
    insert into public.lessons (course_id, section_id, type, status, title, description, body, reading_minutes, position) values
      (c, s, 'text', 'published', 'Write a proposal that gets replies', 'Short, specific and about the client.',
       $b$# The 4-line proposal

- Line 1: show you read their post (mention one detail).
- Line 2: the result you will deliver.
- Line 3: one proof (a sample, a review or a number).
- Line 4: a simple next step, e.g. "Shall I send a quick draft?"

Never paste the same long message to everyone.$b$, 3, 0);
    insert into public.lessons (course_id, section_id, type, status, title, description, body, settings, position) values
      (c, s, 'assignment', 'published', 'Draft your profile and one proposal', 'Get feedback before you publish.',
       $b$Write:

1. Your one-line service statement.
2. A profile introduction of up to 120 words.
3. One proposal for a real job post you found this week.

Paste all three as text.$b$,
       '{"submission": ["text"], "maxFileMb": 20}', 1);
  end if;

  -- -------------------------------------------------------------------
  -- 3. Spoken English confidence (free — tests free enrolment)
  -- -------------------------------------------------------------------
  if not exists (select 1 from public.courses where slug = 'sample-spoken-english-confidence') then
    insert into public.courses (
      slug, title, subtitle, description, category_id, level, language,
      outcomes, audience, prerequisites, price_lkr, access_type,
      seo_title, seo_description, preview_checked_at
    ) values (
      'sample-spoken-english-confidence',
      'Spoken English confidence builder',
      'Daily habits that help you speak up in class, interviews and meetings.',
      $d$A free short course to help you speak English more confidently.

Instead of grammar drills, you'll practise small daily habits: thinking in short sentences, preparing answers to common questions, and recovering calmly when you forget a word.$d$,
      (select id from public.categories where slug = 'english-communication'),
      'all_levels', 'en',
      array[
        'Answer common questions in short, clear sentences',
        'Introduce yourself confidently in under 30 seconds',
        'Recover calmly when you forget a word'
      ],
      array['Students preparing for interviews or presentations', 'Anyone who understands English but feels shy speaking'],
      array[]::text[],
      0, 'lifetime',
      'Free spoken English confidence course',
      'Free course: daily habits to speak English with more confidence in interviews, class and meetings.',
      now()
    ) returning id into c;

    insert into public.course_sections (course_id, title, position) values (c, 'Speak every day', 0) returning id into s;
    insert into public.lessons (course_id, section_id, type, status, title, description, body, reading_minutes, position, is_preview) values
      (c, s, 'text', 'published', 'Your 30-second introduction', 'A ready answer to "Tell me about yourself".',
       $b$# The formula

- Who you are: name and what you do or study.
- One thing you're proud of.
- What you're looking for now.

# Practise

Say it out loud 3 times today. Record it once on your phone and listen back.$b$, 2, 0, true),
      (c, s, 'text', 'published', 'When you forget a word', 'Keep talking instead of freezing.',
       $b$# Describe it

If you forget a word, describe it: "the thing you use to..." The listener will often help you.

# Useful phrases

- "Let me put it another way."
- "What I mean is..."
- "Give me a second to think."$b$, 2, 1, false);
    insert into public.lessons (course_id, section_id, type, status, title, description, settings, position)
      values (c, s, 'quiz', 'published', 'Quick check', 'Two questions.', '{"passPercent": 50}', 2)
      returning id into l;
    insert into public.quiz_questions (lesson_id, position, prompt, options, correct_option_id, explanation) values
      (l, 0, 'You forget a word mid-sentence. What is the best thing to do?',
       '[{"id":"a","text":"Stop talking"},{"id":"b","text":"Describe the thing instead"},{"id":"c","text":"Switch topics"}]',
       'b', 'Describing keeps the conversation moving and usually gets you the word.'),
      (l, 1, 'How long should a self-introduction be in an interview?',
       '[{"id":"a","text":"About 30 seconds"},{"id":"b","text":"5 minutes"},{"id":"c","text":"One word"}]',
       'a', 'Short and clear leaves room for follow-up questions.');
  end if;

  -- Publish all sample courses (runs as the database owner, so the publish guard allows it).
  update public.courses
    set status = 'published', published_at = coalesce(published_at, now())
    where slug like 'sample-%' and status <> 'published';
end
$$;
