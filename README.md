
**WiseBite: Product description**

**What it is**

WiseBite is a web application that helps people manage their food at home and cut down on waste. Users keep a digital pantry, see what is about to go off, and get ideas for using food before it expires. The app runs in the browser and talks to a small backend API.

**Main areas of the app**

**Home**

The Home view is the main screen. At the top it shows four summary numbers: total items in the pantry, how many are still fresh, how many are expiring soon (within a few days), and how many are already expired. Under that, “My Pantry” lists all items. Each item shows name, category, expiry date, quantity and unit, and optional notes. Items are ordered by expiry so the soonest to expire appear first. Colours indicate status: green for fresh, orange for expiring soon, red for expired. Users can search the list by name and filter by category (e.g. Dairy, Meat, Vegetables, Bakery, Pantry, Beverages, Frozen, Snacks, Other). From here they can add new items or delete existing ones.

**Scan**

The Scan area is for adding products by barcode. Users can turn on the device camera and point it at a barcode; the app reads the code and looks up the product. They can also type the barcode number and look it up manually. When a product is found, the app opens the Add Item form with name, category, and image filled in so the user only needs to set expiry and quantity. Product data comes from the FatSecret API when credentials are set, and from Open Food Facts when FatSecret is not used or does not find the product.

**Recipes**

The Recipes area helps users cook with what they have. It highlights “priority” ingredients: items that will expire within about a week. Users can choose dietary style (e.g. vegetarian, vegan, gluten free), cuisine (e.g. Italian, Asian, Mexican), and maximum cooking time (e.g. under 15, 30, or 45 minutes). After they request a recipe, the backend suggests one based on their pantry, favouring items that are expiring soon. The result includes richer local details such as prep/cook/finish sections, rough ingredient amounts, timing estimates, and nutrition-per-serving estimates. It can also list “missing ingredients” with links to search for them on Deliveroo or Uber Eats so users can order what they don’t have.

**Share**

The Share area is a global feed where signed-in users can share recipes they cooked. Each post can include title, caption, ingredients, steps, an optional cooked date, and an optional photo upload. Users can like/unlike posts, and each user can edit or delete only their own posts.

**Adding and editing items**

Adding an item can be done from Home (Add Item) or after a barcode lookup on Scan. The form asks for name, category, expiry date, quantity, unit, optional notes, and optionally an image URL or barcode. When a barcode is scanned or entered and a product is found, name, category, and image are filled in automatically. Users can still add items manually without scanning.

**Technical side**

The frontend is a React app (Create React App) with a top bar that has the WiseBite logo and sections such as Home, Scan, Recipes, Share, Shopping, Insights, Household, and Profile. Data is stored and computed on a Python Flask backend that exposes REST endpoints for items, stats, barcode lookup, recipe generation, and social posts. Pantry data is kept in memory (with optional sample data for testing). Barcode lookup uses FatSecret when client ID and secret are set, and Open Food Facts otherwise. The camera scanner in the browser uses the html5-qrcode library to read barcodes from the live camera feed.

**Summary**

WiseBite is a single, organised place to see what food you have, what needs using first, and how to use it, with barcode scanning and pantry planning tools to make logging and using food easier and to reduce waste.

## Data persistence (Postgres)

By default, in-memory stores are used. To persist pantry/auth/activity data across restarts, set:

- `DATABASE_URL` (Postgres connection string; Render Postgres URL works)

When `DATABASE_URL` is set, the backend creates/uses an `app_state` table and stores a JSON snapshot after successful `POST`/`PUT`/`DELETE` requests.
