import React from 'react';
// Import necessary routing hooks if using React Router or similar
import { useNavigate } from 'react-router-dom'; 
// import { Link } from 'react-router-dom'; 

const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative isolate overflow-hidden pt-14">
        <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80" aria-hidden="true">
          {/* Visual Concept Suggestion: Vibrant orange background element */}
          <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#ff80b5] to-[#FF8C00] opacity-30 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]" style={{ clipPath: 'polygon(74.1% 44.1%, 61.5% 97.2%, 36.3% 41.4%, 61.5% 0%, 36.3% 58.6%, 0% 58.6%, 1.4% 29.5%, 33.1% 7.4%, 60.5% 15.5%, 55.6% 27.1%, 80.7% 2.8%, 72.5% 32.1%, 100% 32.1%, 82.1% 98.2%, 74.1% 44.1%)' }}></div>
        </div>
        <div className="mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:flex lg:items-center lg:gap-x-10 lg:px-8 lg:py-40">
          <div className="mx-auto max-w-2xl lg:mx-0 lg:flex-auto">
            {/* Headline (H1) */}
            <h1 className="text-4xl font-bold tracking-tight text-textPrimary sm:text-6xl">
              Unlock Your Inner World: AI-Powered Reflection Made Simple.
            </h1>
            {/* Sub-headline/Body Copy */}
            <p className="mt-6 text-lg leading-8 text-textSecondary">
              Mood Weaver is the smart journaling app designed to help you move beyond just writing. Capture your thoughts effortlessly, discover hidden patterns with subtle AI, and transform personal insights into real-world progress, all within a private, secure space.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6 lg:justify-start">
              {/* Primary CTA */}
              <button
                onClick={() => navigate('/signup')}
                className="rounded-md bg-primary px-3.5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                Start Your Journey
              </button>
              {/* Optional Secondary CTA or Learn More */}
              {/* <Link to="/learn-more" className="text-sm font-semibold leading-6 text-textPrimary">Learn more <span aria-hidden="true">→</span></Link> */}
            </div>
          </div>
          <div className="mt-16 sm:mt-24 lg:mt-0 lg:flex-shrink-0 lg:flex-grow">
            {/* Visual Concept Suggestion: Clean, modern illustration of journal with AI elements */}
            <div className="aspect-[10/8.5] w-full bg-gray-200 rounded-lg flex items-center justify-center text-gray-600">Illustration Placeholder</div>
          </div>
        </div>
      </section>

      {/* The Problem & Our Solution Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-background" role="region" aria-label="The Problem and Mood Weaver's Solution">
        <div className="container mx-auto text-center max-w-4xl">
          {/* Headline (H2) */}
          <h2 className="text-3xl sm:text-4xl font-bold text-textPrimary mb-12">
            Tired of Scattered Thoughts and Feeling Stuck?
          </h2>
          {/* Sub-headline/Body Copy */}
          <p className="mt-4 text-lg leading-8 text-textSecondary">
            We understand. Your thoughts are valuable, but without structure, they can feel overwhelming and unproductive. Traditional journaling helps, but it can be hard to connect the dots or know what steps to take next. Mood Weaver offers a smarter way.
          </p>
          {/* Visual Concept Suggestion: Split layout showing cluttered vs. organized thoughts */}
          <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            {/* Cluttered Thoughts Visual */}
            <div className="aspect-video bg-gray-200 rounded-lg flex items-center justify-center text-gray-600">Cluttered Thoughts Illustration Placeholder</div>
            {/* Organized Clarity Visual */}
            <div className="aspect-video bg-gray-200 rounded-lg flex items-center justify-center text-gray-600">Organized Clarity Illustration Placeholder</div>
          </div>
          {/* Key Features/Benefits addressing the problem */}
          <div className="mt-12 text-left">
            <h3 className="text-2xl font-semibold text-textPrimary mb-6 text-center">Mood Weaver Helps You:</h3>
            <ul className="list-disc list-inside text-lg text-textSecondary space-y-4 inline-block text-left">
              <li>Organize Disjointed Thoughts into Clarity</li>
              <li>Uncover Hidden Patterns You Didn't See Before</li>
              <li>Translate Reflection into Actionable Progress</li>
            </ul>
          </div>
        </div>
      </section>

      {/* How Mood Weaver's AI Works Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-secondary" role="region" aria-label="How Mood Weaver AI Works">
        <div className="container mx-auto text-center max-w-4xl">
          {/* Headline (H2) */}
          <h2 className="text-3xl sm:text-4xl font-bold text-textPrimary mb-12">
            Your Reflections, Elevated by Intelligent Insights.
          </h2>
          {/* Sub-headline/Body Copy */}
          <p className="mt-4 text-lg leading-8 text-textSecondary">
            Mood Weaver's AI works quietly in the background, analyzing your entries to provide helpful perspectives. It's not a chatbot; it's a powerful tool that helps you gain deeper self-understanding and move forward, always respecting your privacy.
          </p>
          {/* Visual Concept Suggestion: Animated infographic/illustration showing AI process with icons */}
          <div className="mt-16 mb-12 aspect-video bg-gray-200 rounded-lg flex items-center justify-center text-gray-600">AI Process Illustration Placeholder</div>

          {/* Key AI Benefits */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
            <div className="bg-card p-6 rounded-lg shadow-sm border border-border">
              <h3 className="text-xl font-semibold text-textPrimary mb-3 flex items-center"><span className="mr-3 text-primary text-2xl">🔍</span> Pattern Identification</h3>
              <p className="text-textSecondary">Our AI subtly detects recurring moods, themes, and correlations across your entries over time, highlighting trends you might miss.</p>
            </div>
            <div className="bg-card p-6 rounded-lg shadow-sm border border-border">
              <h3 className="text-xl font-semibold text-textPrimary mb-3 flex items-center"><span className="mr-3 text-primary text-2xl">✅</span> Actionable Steps</h3>
              <p className="text-textSecondary">Based on challenges or goals mentioned, the AI can suggest concrete, small steps or prompts to guide your progress.</p>
            </div>
            <div className="bg-card p-6 rounded-lg shadow-sm border border-border">
              <h3 className="text-xl font-semibold text-textPrimary mb-3 flex items-center"><span className="mr-3 text-primary text-2xl">💡</span> Key Item Extraction</h3>
              <p className="text-textSecondary">Important notes, tasks, or specific mentions within your entries are identified and surfaced, so valuable details don't get lost.</p>
            </div>
            <div className="bg-card p-6 rounded-lg shadow-sm border border-border">
              <h3 className="text-xl font-semibold text-textPrimary mb-3 flex items-center"><span className="mr-3 text-primary text-2xl">💬</span> Tailored Prompts</h3>
              <p className="text-textSecondary">Receive personalized questions based on your writing to gently guide deeper reflection and explore new perspectives in future entries.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Core Features & User Experience Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-background" role="region" aria-label="Core Features">
        <div className="container mx-auto text-center">
          {/* Headline (H2) */}
          <h2 className="text-3xl sm:text-4xl font-bold text-textPrimary mb-12">
            Effortless Design, Powerful Features.
          </h2>
          {/* Sub-headline/Body Copy */}
          <p className="mt-4 text-lg leading-8 text-textSecondary max-w-2xl mx-auto">
            Beyond intelligent insights, Mood Weaver provides a beautiful and practical space for your daily reflection. We've focused on a clean, intuitive design that gets out of your way, letting you focus on capturing your thoughts.
          </p>
          {/* Key Features with Visual Concepts */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-16">
            {/* Feature 1: Intuitive Editor */}
            <div className="bg-card p-6 rounded-lg shadow-sm border border-border flex flex-col items-center text-center">
              {/* Visual: Screenshot/Animation of editor */}
              <div className="mb-6 aspect-video w-full bg-gray-200 rounded-md flex items-center justify-center text-gray-600">Editor Screenshot/Animation Placeholder</div>
              <h3 className="text-xl font-semibold text-textPrimary mb-3">Intuitive Editor</h3>
              <p className="text-textSecondary">Write freely with simple Markdown formatting, a dynamic resizing input area, and a quick list mode for capturing notes on the go.</p>
            </div>
            {/* Feature 2: Seamless Image Integration */}
            <div className="bg-card p-6 rounded-lg shadow-sm border border-border flex flex-col items-center text-center">
              {/* Visual: Image embedded in journal illustration */}
              <div className="mb-6 w-32 h-32 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 text-2xl">📸</div>
              <h3 className="text-xl font-semibold text-textPrimary mb-3">Seamless Image Integration</h3>
              <p className="text-textSecondary">Easily add and view supporting images directly within your journal entries, enriching your reflections.</p>
            </div>
            {/* Feature 3: Flexible Tagging */}
            <div className="bg-card p-6 rounded-lg shadow-sm border border-border flex flex-col items-center text-center">
              {/* Visual: Cloud of vibrant tags */}
              <div className="mb-6 w-32 h-32 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 text-2xl">🏷️</div>
              <h3 className="text-xl font-semibold text-textPrimary mb-3">Flexible Tagging</h3>
              <p className="text-textSecondary">Organize and find your thoughts with a powerful, customizable tagging system.</p>
            </div>
            {/* Feature 4: Effortless Search & Filter */}
            <div className="bg-card p-6 rounded-lg shadow-sm border border-border flex flex-col items-center text-center">
              {/* Visual: Magnifying glass over entries */}
              <div className="mb-6 w-32 h-32 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 text-2xl">🔍</div>
              <h3 className="text-xl font-semibold text-textPrimary mb-3">Effortless Search & Filter</h3>
              <p className="text-textSecondary">Instantly locate any entry by keywords, content, or tags.</p>
            </div>
            {/* Feature 5: Beautiful Light & Dark Modes */}
            <div className="bg-card p-6 rounded-lg shadow-sm border border-border flex flex-col items-center text-center">
              {/* Visual: Split screen light/dark mode example */}
              <div className="mb-6 w-32 h-32 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 text-2xl">🌓</div>
              <h3 className="text-xl font-semibold text-textPrimary mb-3">Beautiful Light & Dark Modes</h3>
              <p className="text-textSecondary">Reflect in comfort with a visually appealing experience tailored to your preference.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Final Call to Action Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-primary/20" role="region" aria-label="Ready to Start Your Journey">
        <div className="container mx-auto text-center max-w-3xl bg-card p-8 rounded-lg shadow-lg border border-border">
          {/* Headline (H2) */}
          <h2 className="text-3xl sm:text-4xl font-bold text-textPrimary mb-8">
            Ready to Start Your Journey Towards Deeper Self-Understanding?
          </h2>
          {/* Sub-headline/Body Copy */}
          <p className="mt-4 text-lg leading-8 text-textSecondary">
            Join Mood Weaver today and transform your journaling practice. Gain clarity, identify patterns, and make tangible progress on your personal growth journey. Sign up is quick, free, and your data remains private and secure.
          </p>
          {/* Optional Testimonial */}
          <blockquote className="mt-8 italic text-textSecondary">
            "Mood Weaver helped me see connections in my thoughts I never noticed before. It's truly helped me move forward." - A Satisfied User
          </blockquote>
          {/* Privacy/Security Assurance */}
          <p className="mt-4 text-sm text-textSecondary">
            <span className="mr-2 text-primary">🔒</span> Your data is encrypted and private. We never read or share your entries.
          </p>
          <div className="mt-10 flex items-center justify-center">
            {/* Final CTA */}
            <button
              onClick={() => navigate('/signup')}
              className="rounded-md bg-primary px-4 py-3 text-base font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              Sign Up for Free
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-background">
        <div className="container mx-auto py-12 px-4 sm:px-6 lg:py-16 lg:px-8">
          <div className="flex flex-col items-center">
            <p className="text-sm text-textSecondary">
              &copy; {new Date().getFullYear()} Mood Weaver. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;