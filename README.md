Swap : Skill Exchange Marketplace

Swap is a full-stack skill exchange platform where people can teach what they know and learn what they want, exchanging skills through one-to-one sessions.

Users can discover people with complementary skills, propose swaps, communicate with their match, schedule sessions, complete exchanges, and leave skill-specific ratings.

✨ Features
🔐 Email/password authentication with Supabase
👤 User profiles and onboarding
🧠 Browse and search available skills
🔄 Discover potential skill matches
🤝 Propose and manage skill swaps
💬 Real-time chat between swap participants
📅 Schedule skill exchange sessions
🔔 In-app notifications
⭐ Rate users based on the specific skill they taught
👥 Public user profiles
🖼️ Profile avatar uploads
🌙 Light and dark mode
🌍 Multi-language interface
🔒 Row Level Security for user and swap data
⚡ Real-time updates with Supabase Realtime

🛠️ Tech Stack
React 18
TypeScript
Vite
Tailwind CSS
Supabase
PostgreSQL
Authentication
Row Level Security
Storage
Realtime
Supabase JavaScript Client

🚀 Getting Started
1. Install dependencies
npm install
2. Configure environment variables

Create a .env file in the project root:

VITE_SUPABASE_URL=your-supabase-project-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key

You can use .env.example as a template.

Never commit your .env file or expose a Supabase service-role key in frontend code.

3. Start the development server
npm run dev

The application will be available at the local URL shown by Vite.

4. Build for production
npm run build

To check TypeScript:

npm run typecheck
🗄️ Backend

Swap uses Supabase as its backend.

The project includes database migrations in:

supabase/migrations/

The Supabase backend handles:

User profiles
Skills
User skills
Availability
Skill swaps
Messages
Notifications
Reviews and ratings
Avatar storage
Row Level Security
Realtime updates

The frontend connects to the existing Supabase project through the environment variables.

📁 Project Structure
swap/
├── public/
├── src/
│   ├── components/
│   ├── context/
│   ├── hooks/
│   ├── pages/
│   └── ...
├── supabase/
│   └── migrations/
├── .env.example
├── index.html
├── package.json
├── tailwind.config.js
├── tsconfig.json
├── vite.config.ts
└── README.md
🌐 Deployment

Swap is a Vite application and can be deployed to services such as:

Vercel
Netlify
Cloudflare Pages

For Vercel, use:

Framework: Vite
Build Command: npm run build
Output Directory: dist

Add these environment variables to the deployment platform:

VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
🔒 Security

The application uses Supabase Row Level Security to control access to user and swap data.

The Supabase anon/public key is intended for frontend use. A service-role key must never be placed in the frontend or committed to the repository.

📄 License

This project is currently for personal/portfolio development.
