# Shell Polish And Product Images Design

## Scope

Improve the current shell and demo content after the engagement update:

- Make the flash sale countdown tick every second.
- Use the provided Lishop logo asset in the shell header and footer.
- Replace the authenticated header actions with an avatar dropdown.
- Add a brand banner directly below the hero section.
- Improve product seed images so they are category-relevant instead of random `picsum.photos` images.
- Ensure every seeded product has at least four product images.
- Upgrade the shell news page with images and richer article content.

## Frontend Behavior

The countdown will keep a local timestamp state and update on a one-second interval. The header will use the logo image and show authenticated users as an avatar/account button. Clicking the account button opens a dropdown with profile, orders, notifications, admin when applicable, and logout.

The homepage will show a brand banner immediately below the hero. The news page will render image-backed article cards and longer article content from local editorial data so the demo remains stable without depending on external crawled pages.

## Seed Image Behavior

The seed script will stop using `picsum.photos` for product galleries. It will use category-specific image pools and cycle them to create at least four gallery images per product. Variant images can remain generated from deterministic category/product URLs if they are not displayed as primary product gallery images.

## Verification

Verification should cover shell type-check, local browser checks for countdown/header/dropdown/news, and seed image generation logic for at least four images per product.

