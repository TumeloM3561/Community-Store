# Community Store - Supabase Connected Version

This version keeps the existing Community Store HTML/CSS design and connects the account and marketplace listing features to Supabase.

## Connected features
- Supabase Authentication for registration and login
- `profiles` table for user profiles and roles
- `products` table for marketplace listings
- Sell page writes listings to Supabase
- Marketplace reads active listings from Supabase
- Search, category, condition, price and sorting work on database listings
- Navigation detects a logged-in user
- Cart remains browser-based for now
- Community posts remain browser/demo content for now

## Supabase setup
1. Open your Supabase project.
2. Go to SQL Editor and run the project's `backend/schema.sql` from your previous Stage 3 package.
3. Open `js/supabase-config.js` and confirm the Project URL and publishable/anon key are present.
4. Never put a `service_role` or secret key in this file.
5. Run the website with Live Server or another local web server.

## Important
The database-backed features should be tested with a real test account and test listing. Do not claim testing results in the academic report until your group has actually performed the tests.


## Latest feature updates
- Marketplace cards open an item-details page. If a listing has an image URL, the image is used as the item-details hero background.
- Completed purchases create seller-visible order items and a seller notification.
- Removing a listing creates a notification for the seller and administrators.
- Four AI-generated role portraits are included under assets/roles for Student, Faculty, Vendor and Resident.
- Run backend/schema.sql again in Supabase after replacing the site files so the notification and purchase functions are current.


### Product picture uploads
The Sell page now uses a file upload instead of an image URL. Run the latest `backend/schema.sql` in Supabase SQL Editor. It creates the `product-images` Storage bucket and the required upload policies. Sellers can upload JPG, PNG or WebP images up to 5 MB. The uploaded image URL is saved in `products.image_url`.
