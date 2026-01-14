Step 1: Update TransactionPageClient.tsx
- Replace the simplified header with the robust dark header from the snippet.
- Implement the sticky tabs design.
- Ensure the main content area respects the layout.

Step 2: Update CompactTransactionRow.tsx
- Completely overhaul the DOM structure to match the provided list item HTML.
- Use the green checkmark icon.
- Align text and fonts (Inter).
- Handle the "Contract Call" vs "Payment Amount" display logic on the right.

Step 3: Update MobileNav.tsx
- Implement the new bottom navigation design.
- Add the active pill style for the current route.
- Use `justify-between` and `px-6`.
