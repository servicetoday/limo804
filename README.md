# LIMO804

A responsive Sydney chauffeur website built with Next.js App Router, Tailwind CSS 4, and JavaScript (no TypeScript).

## Run locally

```sh
npm install
npm run dev
```

Open http://localhost:3000.

Pick-up and drop-off fields use Google Places Autocomplete, with Australian results biased toward Sydney. The form uses Places API (New) when available and falls back to the existing autocomplete service for older Google Cloud projects with legacy Places access. Set `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` in `.env.local` (configured locally), and enable Maps JavaScript API and Places API (New), with billing, in the Google Cloud project. Restrict the browser key to your website domains and localhost for development. Add the same environment variable to your hosting settings before building; Next.js embeds public variables at build time. Restart development or rebuild production after changing it. Manual address entry remains available when suggestions cannot load.

Route previews show driving directions from pick-up through all stops to drop-off, plus a separate reverse route for return bookings and a map for each multi-trip leg. The map updates when addresses or stop order change and shows estimated distance and driving time (excluding time at stops). Enable Maps JavaScript API and Routes API for the browser key. `NEXT_PUBLIC_GOOGLE_MAP_ID` optionally supplies your Google Cloud map ID; development defaults to Google's demo map ID.

Transfer estimates use AUD $4/km plus $0.75 per driving minute, plus 10% GST, with an $80 GST-inclusive driving minimum per journey. The first 30 minutes of waiting per journey are free; extra waiting is added after the minimum at $0.75/min plus GST. Return and multi-trip estimates sum each journey. Prices use map distances and durations, with each journey total rounded up to the next AUD $5 after GST, waiting and tolls. Exact $5 multiples stay unchanged. Combined totals sum the rounded journey prices. Public price cards show only the estimated total amount, without the rate formula or price breakdown. Prices appear in the route and final review. Google Routes toll estimates in AUD are added after the minimum fare, through all stops and separately for each return/multi-trip journey. Toll amounts are treated as GST-inclusive and included once; no additional GST is charged on top of them. If Google reports a toll but cannot price it, the estimate is visibly marked ?+ tolls? until the team confirms those charges. No vehicle toll pass is assumed; Google uses its default toll pricing. Toll computations use Google?s higher-priced toll calculation SKU. Planned waiting is saved in chauffeur notes; displayed estimates do not replace the team-confirmed quote.

New quote and booking alerts are sent to `admin@limo804.com.au` when `MAILTRAP_AUTO_SEND=true`; customer acknowledgements and confirmations continue to use the customer?s email. Shared driver-booking notices also go to the admin address. Admin deliveries have separate logs and deduplication; synthetic fixtures never trigger automatic admin alerts.

The `/contact` page has a name, email, optional phone and message form. `POST /api/contact` validates submissions and sends them through the configured Mailtrap sender to `admin@limo804.com.au`, with the visitor as Reply-To. Messages are sent only on submission. The form includes a honeypot, request-size limits and per-process retry deduplication/rate limits. Messages are not stored in the application database.

## Production

```sh
npm run build
npm start
```

## Features

- Passenger-count dropdowns (1?7) on each quote journey and editable per-trip counts in Admin Bookings, with vehicle-capacity checks and audit history

- Navy and gold design inspired by the supplied reference
- Responsive navigation and layouts
- Dedicated `/quote` page with transfer/hourly modes, one-way/return/multi-trip options, independent numbered trips with add/remove/collapse controls, date shortcuts, passenger controls and trip validation
- One-way stop controls, route swapping, airport flight references, flight-based timing pending team confirmation and a return-ride shortcut
- Flight reference files, camera input and pasted itinerary text, saved with submitted quotes (no automatic document extraction)
- Customer-details step with passenger contacts, third-party booker details, pick-up sign name, chauffeur notes, reference and unverified voucher fields
- Accessible service and combined trip/customer review dialogs
- MySQL-backed `/fleet` page with Sedans and Luxury SUVs, category filters, FAQs and vehicle preferences carried into the quote flow
- Protected `/admin/fleet` area for adding, editing, publishing, unpublishing and archiving vehicles, with image uploads
- Fleet overview and click-to-call contact links
- Local image assets and optimized Google fonts through next/font

The quote flow validates the trip, collects passenger/booker details and displays a final review. **Send quote request** saves the enquiry to MySQL and returns a reference. Nothing is submitted before that action. Mailtrap can send an acknowledgement after creation. Admins can send a priced quote with a private customer link. The customer reviews and explicitly accepts the amount to create a confirmed booking. Manual admin conversion still creates a pending booking. The application does not calculate fares, take payments, track flights or assign a chauffeur automatically. The website contact number is 0416 934 865, linked to tel:0416934865.

## Main files

- `app/page.js`: landing page content and service interactions
- `app/fleet/page.js`: fleet page
- `app/fleet/FleetCatalog.js`: category filters and vehicle category cards
- `app/quote/page.js`: dedicated quote page
- `app/quote/QuoteForm.js`: trip form, validation and summary
- `app/globals.css`: Tailwind import, theme and responsive styling
- `app/layout.js`: fonts and metadata
- `public/images/`: locally stored Unsplash photography

The reference image was used as visual direction. The photos are replacements, not the original composite in the reference.

Fleet reference: https://nycunitedlimo.com/fleets/ (category-led structure, adapted with original Limo804 copy).
Fleet images: Unsplash, BMW sedan (photo-1555215695-3004980ad54e) and Mercedes SUV by Vaclav Pechar (https://unsplash.com/photos/MyidPsXdKUU). The public fleet now displays database records rather than sample inventory.

## MySQL fleet backend

The server reads connection settings from `.env.local`, which is ignored by Git. The local database is `limo804` on `localhost:3306`, with user `root` and a blank database password. Admin sign-in uses separate `ADMIN_USERNAME`, `ADMIN_PASSWORD` and `ADMIN_SESSION_SECRET` settings. These have been configured locally. To set up another installation, copy `.env.example` and fill in its settings. Restart the app after environment changes.

```sh
npm run db:setup
npm run build
npm start
```

`db:setup` creates the `fleet` table if missing, preserving existing records. It does not seed sample vehicles. Future schema changes should use explicit migrations.

To add the published Executive Sedan and Luxury SUV sample records with local photos, run `npm run db:seed`. The sample capacities are 3 passengers / 3 suitcases for the sedan and 6 passengers / 4 suitcases for the SUV. They can be edited from Fleet Admin. Running the seed again skips existing matching names and categories, including archived records; it does not overwrite edits or restore archived samples.

Open http://localhost:3000/admin/fleet and sign in using the admin credentials in `.env.local`. Add the vehicle name, category, passenger/suitcase capacities, image and description. Tagline, features, image description and additional details are optional. Lower display-order numbers appear first. Check Publish to display a vehicle on the public fleet page, or leave it unchecked for a draft.

Archive hides the vehicle using `deleted_at`; it does not permanently delete the database row. The table includes vehicle details, capacity, category, publication status, display order and timestamps.

Uploads accept JPG, PNG or WebP images up to 5 MB. They are saved in `storage/fleet/` and served through `/uploads/fleet/[filename]`. Preserve this ignored directory with database backups when moving the site; uploads require a persistent filesystem. Image URLs may also use HTTPS or a local `/images/` path.

Database credentials remain server-side. Admin endpoints require signed HTTP-only session cookies; writes also check the request origin. Inputs are validated before parameterized SQL queries. Admin pages are excluded from search indexing.

### Backend routes

- `/admin/login`: sign in
- `/admin/fleet`: manage vehicles
- `GET /api/fleet`: published vehicles
- `GET /api/admin/fleet`: all non-archived vehicles
- `POST /api/admin/fleet`: create
- `GET /api/admin/fleet/:id`: read
- `PUT /api/admin/fleet/:id`: update or publish/unpublish
- `DELETE /api/admin/fleet/:id`: archive
- `POST /api/admin/uploads`: upload a vehicle image
- `POST /api/admin/auth/login` and `/api/admin/auth/logout`: admin sessions

### Verification

```sh
npm test
npm run build
# With the site running on localhost:3000:
node scripts/test-fleet-api.mjs
```

The integration check creates its own temporary vehicle and image, verifies the lifecycle and removes those fixtures afterward. Existing fleet records are not modified.

## Quotes, customers and future bookings

Run `npm run db:migrate` to apply the quote schema, or use `npm run db:setup` to prepare both fleet and quote tables. Migration `001_quotes_and_bookings` is tracked in `schema_migrations`. Existing fleet records are preserved. The DDL is in `scripts/quote-schema.sql`.

| Table | Purpose and relationships |
| --- | --- |
| `customers` | Reusable contact records. Identical normalized contact identities reuse a row; email alone does not merge people. Existing contacts are not overwritten by public submissions. |
| `quotes` | Quote reference, submission key, status, pricing, customer and passenger foreign keys, preferred fleet, optional notes/reference/voucher and itinerary text. Contact and vehicle-name snapshots preserve the enquiry as submitted. |
| `quote_journeys` | One-to-many quote legs with Sydney local date/time, UTC time, passengers, flight and scheduling source. A return journey is a separate reversed leg. Flight-based timing remains unset until confirmed. |
| `quote_stops` | Ordered intermediate stops related to a journey. |
| `quote_attachments` | Private itinerary file metadata related to a quote. |
| `quote_status_history` | Initial submission and every admin status/price action, including booking conversion. |
| `bookings` | One-to-one quote conversion through a unique `quote_id` foreign key. Preserves the accepted price and currency. Starts pending, with no assigned vehicle or confirmation. |

Customer details are deduplicated using a contact fingerprint covering name, email and phone. For third-party bookings, the booker and passenger can be different customers. Historical quote snapshots remain independent of later contact changes. Vehicle preferences reference `fleet`; the submitted vehicle name is also snapshotted.

Date/time input is interpreted in **Australia/Sydney**, independent of the server's timezone. Each manual journey stores both local values and UTC. Nonexistent daylight-saving times are rejected; an ambiguous repeated time uses the earlier occurrence. Created/updated history dates are UTC. Currency is AUD, with decimal amounts to avoid floating-point money calculations.

Quote status flow: `submitted → quoted → accepted → converted`. Declined/expired states and explicit reopening paths are supported. Only admins set pricing or acceptance. Accepted pricing must be returned to Quoted before changing it. Conversion uses a locked transaction and a unique quote relationship, so retries create only one pending booking. Converted quotes cannot be changed through the status API.

New quote references use `q-DDMMYYYY-XXXX`, for example `q-23112026-A7K2`. The date is the creation date in Australia/Sydney. The suffix has four uppercase letters/digits. The database enforces uniqueness and reference collisions retry with a fresh suffix. Existing quote references and booking reference formats remain unchanged.

### Using the flow

1. Enter trip and customer details on `/quote`.
2. Review, then choose **Send quote request**. This is an enquiry, not a booking confirmation.
3. Open http://localhost:3000/admin/quotes with the existing admin login.
4. Open the quote to review contacts, legs, stops, notes, private attachments and history.
5. Enter a total and mark it Quoted. Once acceptance has been arranged with the customer, record Accepted.
6. **Create pending booking** creates a linked pending booking. Alternatively, send a priced quote using the customer acceptance flow below. Customer acceptance creates a confirmed booking. Vehicle/chauffeur assignment and payments remain separate operational steps.

An idempotency UUID and request fingerprint protect quote submission retries. Customer/quote/journey/stop/attachment/history writes use a single database transaction. Failed submissions roll back; newly written attachment files are removed on failure. Files are saved under `storage/quotes/`, outside public assets. Back up that directory with the database. Download requires the admin session and matching quote/attachment IDs. PDFs and common image formats up to 10 MB are accepted after file-signature checks.

### Quote endpoints and verification

- `POST /api/quotes`: same-origin public quote submission, JSON or multipart `payload` plus optional `attachment`. Status/prices are controlled by the server. Returns only a reference and status, never customer details.
- `GET /api/admin/quotes`: latest 200 enquiries; requires admin sign-in.
- `GET /api/admin/quotes/:id`: full enquiry with relationships and snapshots.
- `PATCH /api/admin/quotes/:id`: status, AUD total and internal status note.
- `POST /api/admin/quotes/:id/convert`: create or return the linked pending booking.
- `GET /api/admin/quotes/:id/attachments/:attachmentId`: private file download.

```sh
npm test
npm run build
# With the server running:
node scripts/test-quotes-api.mjs
```

The live quote integration check uses synthetic contacts and temporary quote records, then removes its own fixtures. It covers persistence, relational data, contact snapshots, return/multi-trip/hourly/flight journeys, private attachments, selected fleet validation, idempotency under simultaneous requests, status/price restrictions, history and one-time pending booking conversion.

## Mailtrap quote acknowledgements

Server-only settings in `.env.local`:

- `MAILTRAP_API_TOKEN`: Mailtrap API token, never exposed to the browser or committed.
- `MAILTRAP_FROM_EMAIL`: an allowed Mailtrap sender. The local test uses `hello@demomailtrap.co` because the business domain still requires DNS verification.
- `MAILTRAP_FROM_NAME`: defaults to Limo804.
- `MAILTRAP_AUTO_SEND`: set `true` to acknowledge new quote requests automatically.

`npm run db:migrate` also creates `quote_emails`, related to the quote, to record recipients, sender, attempts, provider message ID and errors. Identical acknowledgements to the same recipient are deduplicated. Explicit provider rejections can be retried; uncertain network results are marked unknown and require checking Mailtrap before retrying. Accepted means Mailtrap accepted the request; actual delivery is tracked by Mailtrap. Email failure never rolls back an otherwise saved quote.

The admin quote page has an email acknowledgement action with an editable recipient and delivery-attempt history. Its authenticated same-origin endpoint is `POST /api/admin/quotes/:id/email`, with optional JSON `recipient`. This sends an acknowledgement, not a booking confirmation. Dummy quote references are clearly marked TEST in the message. Reserved `.invalid`, `.test` and `.example` recipients are blocked/skipped, so automated fixtures do not send real mail.

The demo sender has Mailtrap account-recipient restrictions. Verify `limo804.com.au` and set a sender on that verified domain before sending to general customer addresses. API documentation: https://docs.mailtrap.io/getting-started/email-api-smtp.md.

For a quote with a linked booking, the admin email panel also offers **Send booking email**. The same endpoint accepts `emailType: "booking_update"`. This uses the stored booking reference, status, total and journey details. Pending bookings are explicitly described as unconfirmed; dummy bookings are marked TEST. Sending is deduplicated per booking status and recipient, independently of quote acknowledgements.

## Send a price and let the customer confirm

Open a submitted quote in `/admin/quotes/:id`. The **Set price & email customer** panel has an AUD amount input and customer email field:

1. Enter the final quoted total and check the recipient.
2. Choose **Save price & send quote**. This saves the price, sets the quote to Quoted and sends a priced email with a **View quote & confirm booking** button.
3. The customer opens a private page showing the price, journeys, ordered stops, pickup times, passenger count and vehicle preference.
4. Opening the page does not accept anything. The customer must check the acceptance box and click **Confirm booking**.
5. One database transaction records customer acceptance, creates a confirmed booking at the server-stored amount and updates the quote/audit trail. No payment is taken or vehicle assigned. A booking email is attempted after the transaction commits.

Use **Save price & preview customer page** to prepare a priced quote without sending email. Repeating the same active amount/recipient reuses its link and deduplicates the email. New prices or status changes invalidate old active links; acceptance checks the current amount again inside a locked transaction. Expired links, changed quotes, forged signatures and past pickup times cannot confirm bookings. Simultaneous confirmation requests return the same booking rather than creating duplicates.

`quote_offers` stores the quoted amount, recipient, expiry, random nonce and eventual booking relationship. Links are signed using `CUSTOMER_QUOTE_SECRET` if configured, otherwise `ADMIN_SESSION_SECRET`. They expire seven days after preparation. Do not share customer quote links; they grant access to the limited customer view. Internal history, private attachments and complete customer records are not exposed by that page. GET requests never mutate the quote, so email-link scanners cannot accept it.

Set `PUBLIC_APP_URL` to the public HTTPS origin of the deployed application, for example `https://your-domain.example`. Local development uses `http://localhost:3000`. A localhost link only works on the machine hosting the app, so it is not suitable for customers on other devices. This setting also prevents the email URL from being derived from an untrusted request host.

- `POST /api/admin/quotes/:id/offer`: authenticated price preparation and optional email. JSON fields: `amount`, optional `recipient`, and optional `sendEmail` (defaults to true).
- `/quote/view/:token`: signed, unindexed customer view; a seven-day link.
- `POST /api/customer/quote/accept`: same-origin request with `token` and `accepted: true`. Price, currency and booking state are taken from the database, never the browser.

Run `npm run db:migrate` to create `quote_offers`. The admin's offline acceptance and pending-conversion workflow remains available for phone bookings.

```sh
# With the app running; uses synthetic records and sends no real mail:
node scripts/test-customer-offers.mjs
```

This verifies signed views, expiry, price changes, explicit acceptance, tamper and cross-origin rejection, concurrent confirmation, stored prices, confirmed booking state and audit history. Fixtures are removed afterward.

## Drivers

Migration `004_drivers` adds `drivers` with `id`, required `name`, `email`, `phone`, and automatic `created_at`/`updated_at` timestamps. Migration `005_driver_address` adds an optional `address` field (up to 500 characters), preserving existing driver records. Names and email addresses are indexed. Run `npm run db:migrate` to create or update the table on another installation. Driver management is available at `/admin/drivers`; booking assignment and notification controls are at `/admin/bookings` after migration `006_driver_booking_assignments`.

## Driver vehicles and booking assignments

Run `npm run db:migrate` to apply migration `006_driver_booking_assignments`. It adds a vehicle link to each driver and a driver link plus assignment version to each booking. Driver profiles have an optional, editable email address that is saved with the profile and displayed in the driver list. Booking notification routing uses the shared admin address `admin@limo804.com.au`.

At `/admin/drivers`, add or edit drivers and attach a published fleet vehicle. At `/admin/bookings`, select a driver and click **Save assignment**. Vehicle selection is optional in the public quote form, admin quote editor and booking assignment controls. Select **Any vehicle** to allow every driver, including drivers without an attached vehicle. Selecting a specific booking vehicle limits the choices to drivers attached to that vehicle and checks passenger capacity across every journey. Saving automatically emails the selected driver. Clearing an existing driver assignment automatically emails the previous driver that they have been unassigned and must not attend. Saving an already-unassigned booking sends no email. Migration `007_driver_unassignment_notifications` stores the previous driver?s name so failed removal notifications can be retried. Email failure leaves the assignment saved and displays a separate error. Driver selection does not automatically select a vehicle. Quote vehicle preferences carry into new bookings and can be changed or cleared in booking assignment controls. A driver's default vehicle can be managed separately at `/admin/drivers`. Assignment does not change booking confirmation status.

Driver emails include the booking total and currency, all journeys, stops, passenger contact information, pick-up sign and chauffeur notes through the configured Mailtrap sender. Click **Email driver** to send another copy, including after a previous accepted or uncertain delivery. After clearing a driver, it resends the unassignment notice to the previous driver. All notifications use the shared driver address. Each assignment has a separate delivery log in `quote_emails`, with an attempt count and the latest result. Automatic sends for an unchanged, already-notified assignment are deduplicated. Concurrent sends are blocked; uncertain delivery blocks reassignment until the operator checks Mailtrap or explicitly resends. Cancelled and completed bookings cannot be reassigned or emailed. Automatic scheduling and availability checks are not implemented.

Run `node --conditions=react-server scripts/test-driver-assignments.mjs` to verify the workflow against the configured database with isolated, cleaned-up fixtures and mocked Mailtrap requests. This check sends no real emails and requires two published vehicles of different passenger capacities.

Driver profiles also support an optional vehicle registration (number plate), stored in uppercase. Run `npm run db:migrate` to apply migration `008_driver_vehicle_registration`. Add or edit the plate at `/admin/drivers`; it is also shown in the driver list. Leaving out the registration field in an API update preserves an existing plate; sending an empty value clears it.

Driver assignment changes also send SMS using the official `clicksend` SDK and `POST https://rest.clicksend.com/v3/sms/send`. Set server-only `CLICKSEND_USERNAME` and `CLICKSEND_API_KEY` in `.env.local` or the deployment environment, then restart the server. Optionally set `CLICKSEND_FROM` to an approved sender ID or ClickSend number; leaving it blank uses the account default. See the [ClickSend Node.js guide](https://developers.clicksend.com/sms-quickstart/nodejs/) for account configuration.

SMS goes to the driver's saved phone number. Australian mobile numbers beginning with `04` are converted to `+614`; use international `+` format for other countries. Set `CLICKSEND_TEST_TO=0411573341` to route all driver SMS to the test phone instead; clear this override before production use. Assigning sends the new driver the booking reference, status and a private booking-details link. Clearing sends the previous driver an instruction not to attend. Replacing a driver sends both notices. Unchanged saves do not send SMS. Vehicle changes send a refreshed link for the current assignment. Email notifications continue independently. SMS failures leave the assignment saved and appear in the booking controls. An accepted response means ClickSend accepted the message, not that it reached the handset. SMS is attempted once per assignment change, with no automatic retry or background delivery queue; check ClickSend history and contact the driver manually when a send fails or delivery is uncertain. The **Email driver** button only resends email.

`/driver/booking/[token]` displays the assigned driver's booking details without an admin login: passenger name/phone, journeys and stops, timing/flight information, passenger counts, vehicle, booking total, pick-up sign and chauffeur notes. Links use HMAC signatures with `DRIVER_BOOKING_LINK_SECRET` (falling back to `ADMIN_SESSION_SECRET`), expire after 30 days and are tied to the booking, current driver and assignment version. Reassignment, removal, vehicle changes and cancelled/completed status invalidate previous links. The page is rendered dynamically with private/no-store caching, no indexing and no referrer headers. It does not expose admin history, customer email or delivery logs. Set `PUBLIC_APP_URL` to the deployed HTTPS origin for links that open on a phone; `localhost` only works on the machine running the app. Keep these bearer links private.

`npm test` includes driver SMS tests that exercise the real SDK with mocked transport and database operations, including assignment, removal, replacement, duplicate saves, rejection and network failure. These tests never send real messages.

For an end-to-end database and HTTP check, start the app on port 3002 and run `node --conditions=react-server scripts/test-driver-booking-links.mjs`. Alternatively set `DRIVER_LINK_TEST_ORIGIN` to the test server origin. The check creates and removes its own dummy booking and driver, verifies the rendered details and private headers, and checks expired and revoked links. It sends no messages.
