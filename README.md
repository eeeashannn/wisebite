# WiseBite

A smart pantry management web application designed to reduce household food waste through digital inventory tracking, barcode scanning, expiry-aware recipe generation, social recipe sharing, and household collaboration.

---

## Application Overview

WiseBite helps users manage their kitchen inventory and reduce food waste. Users maintain a digital pantry of everything they own, receive visual alerts when items are expiring, scan barcodes to add products quickly, generate recipes that prioritise ingredients nearing expiry, share recipes they have cooked, manage shopping lists with smart suggestions, view weekly usage insights, and collaborate with household members through shared pantry visibility.

The application is structured as a **React single-page application** (frontend) communicating with a **Python Flask REST API** (backend), with **PostgreSQL** for data persistence, deployed on **Cloudflare Pages** (frontend) and **Render** (backend).

---

## Technology Stack — Detailed Justification

### Frontend

#### React 19 (via Create React App) — chosen over Vue, Angular, Svelte, and vanilla JS

**Why React:**
- **Component-based architecture**: WiseBite has eight distinct pages (Home, Scan, Recipes, Share, Shopping, Insights, Household, Profile), each with multiple sub-components (dashboard cards, pantry items, recipe cards, social post cards). React's component model allows each of these to be built, tested, and maintained independently, then composed together in `App.js`.
- **Ecosystem and community size**: React has the largest ecosystem of any frontend framework. This matters practically because it meant that libraries like `html5-qrcode` (barcode scanning) had well-documented React integration patterns and community solutions for common issues.
- **Hooks and functional components**: React 19's hooks (`useState`, `useEffect`, `useRef`, `useCallback`) provide a clean way to manage component state and side effects without class-based boilerplate. For example, the barcode scanner's lifecycle (start, stop, cleanup) is managed entirely through `useEffect` cleanup functions and `useRef` for tracking scanner state across renders.
- **Large talent pool and documentation**: As a university project, using the most widely adopted framework meant the most available learning resources, tutorials, and Stack Overflow answers for troubleshooting.

**Why not Vue:** Vue is lighter and has a gentler learning curve, but its ecosystem is smaller. The `html5-qrcode` library had more React-specific documentation and examples. Vue's reactivity system is elegant but React's explicit state management (`useState`) made debugging easier during rapid iteration.

**Why not Angular:** Angular is a full framework with TypeScript, dependency injection, and a module system. For a project of WiseBite's scope, Angular's boilerplate and learning curve would have slowed development without providing proportional benefit. Angular's opinionated structure is better suited to large team projects with strict architectural requirements.

**Why not Svelte:** Svelte compiles to vanilla JS and produces smaller bundles, but its ecosystem is much smaller than React's. Finding a well-supported barcode scanning library with Svelte examples would have been significantly harder. Svelte's compiler-based approach also means fewer runtime debugging tools compared to React DevTools.

**Why not vanilla JavaScript:** Building eight pages with dynamic state, API calls, conditional rendering, and component reuse in plain JS would have required reimplementing much of what React provides. The manual DOM manipulation, event listener management, and state synchronisation would have increased code volume and bug surface dramatically.

#### Create React App (CRA) — chosen over Vite, Next.js, and Remix

**Why CRA:**
- **Zero configuration**: CRA provides a working React setup with Webpack, Babel, ESLint, and a development server out of the box. No configuration files to write or maintain.
- **Mature and stable**: CRA has been the standard React starter for years. Build output is a static folder of HTML, CSS, and JS files that can be deployed to any static host (Cloudflare Pages, Netlify, Vercel, S3).
- **Environment variable support**: CRA's `REACT_APP_*` prefix convention made it straightforward to configure the backend API URL differently for development (`http://127.0.0.1:5000`) and production (Render URL) without changing code.

**Why not Vite:** Vite offers faster development server startup and hot module replacement. For a project of this size, CRA's startup speed was acceptable (a few seconds), and CRA's maturity meant fewer edge-case issues during deployment. Vite would have been a valid alternative.

**Why not Next.js:** Next.js adds server-side rendering, file-based routing, and API routes. WiseBite does not need SSR (it is a private, authenticated app, not a public content site), and the backend is a separate Flask API. Next.js would have added unnecessary complexity and blurred the frontend/backend separation.

#### html5-qrcode v2.3.8 — chosen over QuaggaJS, ZXing, and native BarcodeDetector API

**Why html5-qrcode:**
- **Browser-based, no native dependencies**: Works entirely through the `getUserMedia` WebRTC API, requiring no native plugins or app store distribution.
- **Multiple barcode format support**: Decodes EAN-13, UPC-A, EAN-8, Code 128, and QR codes, covering the full range of grocery product barcodes.
- **Active maintenance and documentation**: The library has clear documentation for starting, stopping, and configuring the scanner, with examples for handling camera device selection.

**Why not QuaggaJS:** QuaggaJS is an older library focused on 1D barcodes. It has not been actively maintained and has known issues with newer browser APIs, particularly on iOS Safari. Its camera initialisation is less reliable across devices.

**Why not ZXing (via @aspect-build/aspect-zxing or similar):** ZXing ports to JavaScript exist but are typically heavier (WASM-based) and have more complex setup requirements. For a web app where bundle size and startup time matter on mobile, html5-qrcode's pure JS approach was more appropriate.

**Why not the native BarcodeDetector API:** The `BarcodeDetector` API is a newer browser standard but is not supported on iOS Safari (the primary mobile target for WiseBite). Using it would have required a polyfill that essentially wraps a library like html5-qrcode anyway, adding complexity without benefit.

#### CSS Custom Properties (Design Tokens) — chosen over Tailwind, CSS Modules, styled-components

**Why vanilla CSS with custom properties:**
- **No build tooling overhead**: CSS custom properties (`:root` variables like `--bg`, `--surface`, `--text`, `--primary`) work natively in all modern browsers. No additional build step, PostCSS plugin, or runtime library is needed.
- **Theming simplicity**: The dark theme was implemented by defining all colours as CSS variables in one place (`index.css`), then referencing them throughout component CSS files. Changing the theme requires updating only the variable definitions.
- **CRA compatibility**: CRA's default CSS handling (plain `.css` imports) works without configuration. Adding Tailwind or styled-components would have required additional setup or ejecting CRA.

**Why not Tailwind CSS:** Tailwind is powerful for rapid prototyping but produces verbose HTML with many utility classes. For a project where CSS files are maintained alongside components, traditional CSS with shared variables was more readable and easier to maintain. Tailwind also requires PostCSS configuration that CRA does not provide by default without ejecting.

**Why not styled-components:** CSS-in-JS libraries add runtime overhead (generating styles at render time) and increase bundle size. For WiseBite's scope, the overhead was not justified. Plain CSS files are also easier to inspect in browser DevTools.

---

### Backend

#### Flask 3.0 (Python) — chosen over Express.js (Node), Django, FastAPI, and Spring Boot

**Why Flask:**
- **Minimal boilerplate**: A Flask API can be defined in a single file. WiseBite's entire backend (`app.py`, ~1,700 lines) contains all routes, business logic, and persistence in one place. This made the codebase easy to navigate and modify during rapid iteration.
- **Python familiarity**: Python is widely taught in university courses and was already familiar to the developer. This reduced the learning curve and allowed focus on application logic rather than language syntax.
- **Decorator-based routing**: Flask's `@app.route` decorators make it immediately clear which function handles which endpoint. Adding a new endpoint is a single decorator and function, with no configuration files or routing tables.
- **Rich ecosystem**: Libraries for password hashing (`werkzeug.security`), JWT (`PyJWT`), CORS (`flask-cors`), HTTP requests (`requests`), and PostgreSQL (`psycopg2`) are all mature, well-documented, and installable with `pip`.
- **Lightweight**: Flask does not impose an ORM, template engine, or project structure. This was important because WiseBite uses in-memory data structures with a custom JSON snapshot persistence model, not a traditional ORM-based approach.

**Why not Express.js (Node.js):** Express would have been a strong alternative, especially since the frontend is JavaScript. However, using Python for the backend provided a clear language boundary between frontend and backend, reinforcing the separation of concerns. Python's standard library also makes data manipulation (sorting by expiry dates, computing statistics, building recipe structures) more readable with list comprehensions and dictionary operations.

**Why not Django:** Django is a full-featured framework with an ORM (Django ORM), admin panel, template engine, and authentication system built in. For WiseBite, most of these are unnecessary: the frontend is a separate React app (no server-side templates), authentication is custom JWT-based, and the data model uses in-memory structures rather than an ORM. Django's "batteries included" approach would have added significant overhead and complexity without proportional benefit for this project's scope.

**Why not FastAPI:** FastAPI is a modern Python framework with automatic OpenAPI documentation and async support. It would have been a valid choice, but Flask's synchronous model was simpler to reason about for this project. WiseBite does not have high concurrency requirements (it is not serving thousands of simultaneous requests), so async support was not needed. FastAPI also requires Pydantic models for request validation, which adds structure but also boilerplate.

**Why not Spring Boot (Java):** Spring Boot is an enterprise-grade framework designed for large, team-based projects. Its annotation-driven configuration, dependency injection, and extensive boilerplate are justified at scale but would have dramatically slowed development for a single-developer university project. The Java compile-test cycle is also slower than Python's edit-and-run workflow.

#### PyJWT 2.8.0 — chosen over session-based auth, Flask-Login, and OAuth

**Why JWT:**
- **Stateless authentication**: JWTs are self-contained tokens that encode user identity and expiry. The backend does not need to store session state, which aligns with the in-memory architecture and avoids the need for a session store like Redis.
- **Frontend simplicity**: The token is stored in `localStorage` and attached to every API request as a `Bearer` header. No cookies, no CSRF tokens, no session management complexity.
- **Cross-domain compatibility**: Because the frontend and backend are deployed on different domains (Cloudflare Pages vs. Render), cookie-based sessions would have required `SameSite` and `Secure` cookie configuration. JWTs in `Authorization` headers avoid this entirely.

**Why not Flask-Login with sessions:** Flask-Login uses server-side sessions stored in cookies. This requires session storage (in-memory, Redis, or database) and does not work cleanly across different domains without careful cookie configuration. For a split-domain deployment, JWTs are simpler.

**Why not OAuth (e.g., Google Sign-In):** OAuth would add a dependency on an external identity provider and require registering the app with Google/GitHub. For a university project, simple email/password auth with JWT was sufficient and kept the system self-contained.

#### flask-cors 4.0.0 — handling Cross-Origin Resource Sharing

**Why needed:** The frontend (on `localhost:3000` in development, or a Cloudflare Pages domain in production) and backend (on `localhost:5000` or a Render domain) are on different origins. Browsers block cross-origin requests by default. `flask-cors` configures the backend to include the necessary `Access-Control-Allow-Origin` headers.

**Additional CORS handling:** A custom `@app.after_request` hook was added to dynamically echo back the request's `Origin` header when the standard CORS middleware does not cover all response paths (e.g., error responses, OPTIONS preflight). This was necessary to handle edge cases in the deployed environment where `flask-cors` alone was insufficient.

#### PostgreSQL (via psycopg2-binary) — chosen over SQLite, MongoDB, Firebase, and file-based storage

**Why PostgreSQL:**
- **Hosted database**: Render provides a managed PostgreSQL instance that persists data independently of the backend server. When Render restarts or redeploys the backend, the database remains intact. SQLite stores data in a local file, which would be lost on every Render deployment.
- **Reliability**: PostgreSQL is a proven, ACID-compliant relational database used in production by companies of all sizes. It provides strong guarantees about data durability and consistency.
- **Free tier availability**: Render offers a free PostgreSQL tier, making it cost-effective for a university project.

**Why not SQLite:** SQLite is excellent for local development but stores data in a file on the server's filesystem. On Render (and most cloud hosting platforms), the filesystem is ephemeral — it resets on every deploy. This would result in data loss, which is exactly the problem the persistence feature was meant to solve.

**Why not MongoDB:** MongoDB is a document database that stores JSON-like documents. While WiseBite's persistence model is JSON-based (a single snapshot document), MongoDB would require a MongoDB hosting provider (MongoDB Atlas) and a different driver library. PostgreSQL on Render was more convenient since Render provides it natively as an add-on.

**Why not Firebase:** Firebase (Firestore or Realtime Database) is a managed NoSQL service by Google. It would have provided real-time sync and persistence out of the box, but would have introduced a dependency on Google Cloud, required a different authentication model (Firebase Auth), and fundamentally changed the backend architecture. The project was designed as a self-contained Flask API.

**Persistence model note:** Rather than using PostgreSQL with a normalised relational schema (separate tables for users, items, posts, etc.), WiseBite stores the entire application state as a single JSON document in an `app_state` table. This "snapshot" approach was chosen for development speed — no schema migrations, no ORM configuration, no foreign key management. The trade-off is that it does not scale to large user bases, but it was sufficient for the scope of this project.

#### Gunicorn — chosen over uWSGI, Waitress, and Flask's built-in server

**Why Gunicorn:**
- **Production-grade**: Flask's built-in development server (`app.run()`) is single-threaded and not suitable for production. Gunicorn is a pre-fork WSGI server that handles multiple requests concurrently.
- **Render compatibility**: Render's Python deployment expects a WSGI server. Gunicorn is the most commonly used and best-documented option for Flask on Render.
- **Simple configuration**: Gunicorn requires no configuration file for basic usage. The Render start command is simply `gunicorn app:app`.

**Why not uWSGI:** uWSGI is more feature-rich but significantly more complex to configure. For a single-process Flask app, Gunicorn's simplicity was preferred.

**Why not the built-in Flask server:** Flask's `app.run(debug=True)` is used only for local development. It is single-threaded, not optimised for performance, and displays debug information that should not be exposed in production.

---

### External APIs

#### FatSecret API — primary barcode product lookup

**Why FatSecret:** FatSecret provides a comprehensive database of branded food products with nutritional data. Its barcode lookup endpoint returns product name, brand, and nutritional information. It uses OAuth2 client-credentials authentication, which is straightforward to implement.

**Fallback — Open Food Facts:** Open Food Facts is a free, open-source product database maintained by volunteers. It serves as a fallback when FatSecret credentials are not configured or when FatSecret does not have the product. Open Food Facts has broader international coverage (especially for European products) but less consistent data quality than FatSecret.

**Why a two-tier approach:** Not all products exist in both databases. By trying FatSecret first (higher data quality) and falling back to Open Food Facts (broader coverage, no API key required), the system maximises the chance of finding any given product.

---

### Deployment

#### Cloudflare Pages (Frontend) — chosen over Netlify, Vercel, GitHub Pages, and S3

**Why Cloudflare Pages:**
- **Free HTTPS**: Automatic SSL certificates, which is critical because mobile browsers require HTTPS for camera access (`getUserMedia`).
- **Global CDN**: Static assets are served from Cloudflare's edge network, reducing load times worldwide.
- **Simple deployment**: A single command (`npx wrangler pages deploy build`) deploys the React build output. No CI/CD pipeline configuration required.
- **Free tier**: Generous free tier with unlimited bandwidth for static sites.

**Why not GitHub Pages:** GitHub Pages does not support single-page application routing (returns 404 for non-root paths). While WiseBite does not use client-side routing, GitHub Pages also has a more restrictive build pipeline.

**Why not Vercel:** Vercel is optimised for Next.js. While it supports static sites, Cloudflare Pages provides equivalent functionality with a simpler deployment model for a CRA build.

#### Render (Backend + PostgreSQL) — chosen over Heroku, Railway, Fly.io, and AWS

**Why Render:**
- **Integrated PostgreSQL**: Render provides a managed PostgreSQL instance as a native add-on. The `DATABASE_URL` environment variable is automatically available to the backend service, with no external configuration.
- **Git-based auto-deploy**: Pushing to the connected Git repository triggers automatic rebuilds and redeployments, streamlining the deployment workflow.
- **Free tier**: Render offers a free tier for web services and PostgreSQL databases, suitable for a university project.
- **Simple configuration**: Environment variables are set through the Render dashboard, and the start command (`gunicorn app:app`) is specified in the service settings.

**Why not Heroku:** Heroku removed its free tier in 2022, making it less accessible for student projects. Render provides equivalent functionality with a free tier.

**Why not AWS (EC2/ECS/Lambda):** AWS provides maximum flexibility but requires significant infrastructure knowledge (VPC configuration, security groups, IAM roles, RDS setup). The operational overhead is not justified for a university project.

---

## Features

| Feature | Page | Description |
|---------|------|-------------|
| Dashboard | Home | Summary statistics (total, fresh, expiring, expired), reminders, needs-attention alerts, activity feed |
| Pantry List | Home | Searchable, filterable list sorted by expiry with colour-coded status (green/orange/red) |
| Barcode Scan | Scan | Camera-based barcode reader with manual entry fallback; auto-fills item details from product databases |
| Recipe Generator | Recipes | Rule-based engine prioritising expiring items; dietary/cuisine/time filters; structured prep/cook/finish sections with nutrition estimates |
| Social Feed | Share | Global recipe sharing with photo uploads, likes, and owner-only edit/delete |
| Shopping List | Shopping | Manual and recipe-driven list with smart reorder suggestions based on consumption history |
| Weekly Insights | Insights | Computed analytics on pantry usage, waste patterns, and consumption trends |
| Household | Household | Create or join via invite codes; toggle shared pantry visibility across members |
| Profile | Profile | Display name and photo upload |
| Authentication | Auth | Email/password signup and login with JWT session management |

---

## Data Persistence

By default, the backend uses in-memory Python data structures. To persist data across server restarts, set:

- `DATABASE_URL` — PostgreSQL connection string (Render Postgres URL)

When configured, the backend stores a JSON snapshot of all application state (users, items, posts, households, shopping list, activity) to an `app_state` table after every successful mutating request (POST/PUT/DELETE). On startup, the most recent snapshot is loaded to restore state.

---

## Running Locally

**Backend:**
```
cd backend
pip install -r requirements.txt
python app.py
```

**Frontend:**
```
cd frontend
npm install
npm start
```

The frontend runs on `http://localhost:3000` and the backend on `http://localhost:5000`.

**Environment variables (optional):**
- `DATABASE_URL` — PostgreSQL connection string for persistence
- `SECRET_KEY` — JWT signing secret (defaults to a dev value)
- `FATSECRET_CLIENT_ID` / `FATSECRET_CLIENT_SECRET` — FatSecret API credentials for barcode lookup
- `REACT_APP_API_URL` — Backend URL for the frontend build (defaults to `http://127.0.0.1:5000`)
