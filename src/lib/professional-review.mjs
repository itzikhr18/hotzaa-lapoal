// A guide may credit a professional reviewer only for a review that actually
// happened: a named reviewer plus the date they reviewed the text. Nothing here
// is derived from updateDate, so editing a guide never moves the review date.

const toTime = (value) => {
  const time = value ? Date.parse(value) : NaN;
  return Number.isNaN(time) ? undefined : time;
};

/**
 * @param {{ reviewerName?: string, reviewerTitle?: string, reviewDate?: string, updateDate?: string }} props
 * @returns {{ name: string, title?: string, date: string, changedSinceReview: boolean } | null}
 */
export function getProfessionalReview({ reviewerName, reviewerTitle, reviewDate, updateDate }) {
  const name = reviewerName?.trim();
  const reviewedAt = toTime(reviewDate);
  if (!name || reviewedAt === undefined) return null;

  const updatedAt = toTime(updateDate);
  return {
    name,
    title: reviewerTitle?.trim() || undefined,
    date: reviewDate,
    changedSinceReview: updatedAt !== undefined && updatedAt > reviewedAt,
  };
}

/** JSON-LD fields for the page's WebPage node; empty unless a review exists. */
export const reviewSchemaFields = (review) =>
  review
    ? {
        reviewedBy: {
          '@type': 'Person',
          name: review.name,
          ...(review.title ? { jobTitle: review.title } : {}),
        },
        lastReviewed: review.date,
      }
    : {};
