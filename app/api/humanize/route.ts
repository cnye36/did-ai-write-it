/** The humanizer is paused product-wide. Keep its engine modules intact, but
 *  do not leave the expensive API callable while the feature is unavailable. */
export async function POST() {
  return Response.json({ error: "This feature is not available." }, { status: 404 });
}
