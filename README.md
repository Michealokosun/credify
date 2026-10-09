# Credify

Credify helps students discover learning opportunities, track scholarship applications, and keep course certificates together. The project is a responsive static website built with HTML, CSS, and browser JavaScript, with Supabase providing authentication, database storage, and private certificate file storage.

## Features

- Responsive landing page with featured courses, scholarships, and student news.
- Course catalog with search and filters for cost, level, and subject area.
- Scholarship directory with search, study-level and destination filters, deadline countdowns, and detail pages.
- Email and password authentication, with Google sign-in available when its provider is configured in Supabase.
- Personal dashboard for scholarship applications, tracked courses, uploaded certificates, and account settings.
- Certificate upload and preview, completion status, and confirmation before deleting dashboard records.
- Pagination for course, scholarship, and dashboard lists when a list has more than 10 results.

## Project structure

```text
.
├── assets/       # Favicon and other visual assets
├── css/          # Site and page stylesheets
├── database/     # Supabase SQL schema and policies
├── docs/         # Project documentation
├── js/           # Page scripts and Supabase browser configuration
├── *.html        # Site pages, kept at the project root for simple static hosting
└── README.md
```

## Run locally

The site has no build step or package installation. Serve the project from its root folder so page routes, stylesheets, scripts, and authentication redirects use the same origin.

For example, with Python installed:

```powershell
py -m http.server 5500
```

Then open [http://localhost:5500](http://localhost:5500). A local static server or editor extension such as Live Server can also be used, as long as it serves this folder on the configured port.

## Supabase setup

1. Create or select a Supabase project.
2. Set the project URL and **publishable** key in `js/supabase-config.js`.
3. In the Supabase SQL Editor, run [`database/dashboard-schema.sql`](database/dashboard-schema.sql). This creates the dashboard tables, row-level security policies, and private `course-certificates` storage bucket.
4. In Supabase Authentication URL settings, allow the local dashboard redirect `http://localhost:5500/dashboard.html`. Add the equivalent dashboard URL for the deployed site.
5. Enable and configure the authentication providers you plan to use. For Google sign-in, configure the OAuth client in Supabase and the Google provider settings; keep the OAuth client secret in Supabase, never in browser JavaScript.
6. Add the deployed site URL to the Supabase redirect allow-list before publishing.

The browser publishable key is expected to be visible in the client. Database access must remain protected by the included row-level security policies. Never place a Supabase `service_role` key, OAuth client secret, or account password in this repository or in frontend code.

## Main pages

| Page | File |
| --- | --- |
| Home | `index.html` |
| Course catalog | `courses.html` |
| Scholarship directory | `scholarships.html` |
| Scholarship details | `scholarship-bangor.html`, `scholarship-exeter.html`, `scholarship-stirling.html` |
| Sign in and account creation | `login.html` |
| Student dashboard | `dashboard.html` |

## Deployment

Deploy the project as a static site with the HTML files at the web root and preserve the `assets/`, `css/`, `database/`, and `js/` folders. Update Supabase authentication redirect settings for the production domain. Do not publish local notes or credentials.
