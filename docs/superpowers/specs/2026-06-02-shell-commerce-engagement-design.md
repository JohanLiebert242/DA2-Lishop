# Shell Commerce Engagement Design

## Scope

Improve the shell homepage and commerce engagement flow:

- Make the shell search bar usable by redirecting searches to catalog product results.
- Add daily small coupon notifications through the bell experience.
- Award a 10% next-purchase coupon after a successful order worth at least 30,000,000 VND.
- Redesign the shell header.
- Strengthen the shell hero with an image and larger marketing counters.
- Add customer reviews, newsletter subscription, and latest news on the shell homepage.
- Add a news page that latest-news cards can navigate to.

## Frontend Design

The shell header will become a sticky, polished commerce header with brand, primary navigation, a prominent search box, notification bell, cart shortcut, and account shortcut. The search form will submit non-empty terms to the catalog product page with a `q` query parameter so it reuses the existing product search behavior.

The hero will use an image-forward commerce layout, stronger product/customer counters, and clearer calls to browse products and promotions. The homepage will also gain three customer review cards, a newsletter form with local validation and success feedback, and latest-news cards. News cards will link to `/news`, where a simple shell news page will list the articles.

## Notification And Coupon Behavior

Daily small coupons will be exposed as notification-style items in the bell dropdown, with values between 5,000 and 50,000 VND. For the first implementation these can be deterministic demo items generated from the current date/client view or backed by existing promotion data, depending on the existing shell notification integration.

After checkout creates an order with a total value of at least 30,000,000 VND, the backend will create a unique 10% coupon code for the user to use on a later order and create a coupon notification. The current schema does not appear to support strict coupon ownership, so the generated code must be unique and hard to guess, and it will be delivered only through the user's notification stream.

## Verification

Verification should cover:

- Shell search redirects to catalog with `q`.
- Header and homepage render on desktop/mobile without overlapping text.
- News cards navigate to `/news`.
- Newsletter validates an email and shows success.
- Backend order flow still passes tests, and the high-value order path creates a coupon notification.

